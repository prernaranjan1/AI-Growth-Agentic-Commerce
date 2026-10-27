"""Atomic stock reservation.

Stock is reserved when an order is created and released if the order is
never paid. Each decrement is a conditional update, so two buyers cannot
both take the last unit.
"""

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import HTTPException

from lib.audit import record_event
from lib.db import db
from models.orders import OrderItem


logger = logging.getLogger(__name__)


def reservation_ttl() -> timedelta:
    return timedelta(minutes=int(os.getenv("RESERVATION_MINUTES", "15")))


async def _decrement(product_id: str, quantity: int) -> bool:
    result = await db.products.update_one(
        {"id": product_id, "stock_quantity": {"$gte": quantity}},
        {"$inc": {"stock_quantity": -quantity}},
    )

    if result.modified_count == 1:
        # Remember that a reservation, not the merchant, took it off sale,
        # so a release can put it back on sale.
        await db.products.update_one(
            {"id": product_id, "stock_quantity": {"$lte": 0}, "in_stock": True},
            {"$set": {"in_stock": False, "stock_quantity": 0, "sold_out_by_reservation": True}},
        )
        return True

    return False


async def release_items(items: List[OrderItem]) -> None:
    for item in items:
        await db.products.update_one(
            {"id": item.product_id},
            {"$inc": {"stock_quantity": item.quantity}},
        )
        # Back on sale only if a reservation took it off; a product the
        # merchant marked unavailable stays unavailable.
        await db.products.update_one(
            {
                "id": item.product_id,
                "stock_quantity": {"$gt": 0},
                "sold_out_by_reservation": True,
            },
            {"$set": {"in_stock": True, "sold_out_by_reservation": False}},
        )


async def reserve_items(items: List[OrderItem]) -> None:
    """Reserve every line or none. Raises 409 if any line is short."""
    reserved: List[OrderItem] = []

    for item in items:
        if await _decrement(item.product_id, item.quantity):
            reserved.append(item)
            continue

        await release_items(reserved)

        raise HTTPException(
            status_code=409,
            detail=f"{item.name} just went out of stock. Please update your cart.",
        )


async def try_reserve_items(items: List[OrderItem]) -> bool:
    try:
        await reserve_items(items)
        return True
    except HTTPException:
        return False


async def release_expired_reservations() -> int:
    """Expire unpaid orders whose hold has lapsed and put stock back.

    The status flip is the guard: only the call that moves an order from
    "created" to "expired" releases its stock, so stock is never returned twice.
    """
    now = datetime.now(timezone.utc)
    released = 0

    while True:
        doc = await db.orders.find_one_and_update(
            {
                "status": "created",
                "stock_reserved": True,
                "reservation_expires_at": {"$lte": now},
            },
            {"$set": {"status": "expired", "stock_reserved": False}},
        )

        if doc is None:
            break

        await release_items([OrderItem(**i) for i in doc.get("items", [])])
        released += 1

        await record_event(
            "ORDER_EXPIRED",
            "Unpaid Order Expired",
            f"Order {doc['id']} was not paid in time; reserved stock was released.",
            order_id=doc["id"],
            session_id=doc.get("session_id"),
            details={"razorpay_order_id": doc.get("razorpay_order_id")},
            status="warning",
        )

    if released:
        logger.info("Released stock for %d expired orders", released)

    return released

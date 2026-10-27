import json
import logging
import os
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional

import razorpay
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pymongo import ReturnDocument

from lib.audit import record_event
from lib.auth import require_merchant
from lib.db import db
from lib.inventory import (
    release_expired_reservations,
    release_items,
    reservation_ttl,
    reserve_items,
    try_reserve_items,
)
from lib.pricing import price_order
from lib.razorpay_client import get_razorpay_client, run_razorpay
from models.agent import AgentReasoningStep
from models.orders import Order, OrderCreate, PaymentVerifyRequest


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/orders",
    tags=["orders"],
)


def to_paise(amount: float) -> int:
    """Convert rupees to integer paise without float rounding drift."""
    return int(
        (Decimal(str(amount)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    )


async def _latest_reasoning(session_id: Optional[str]) -> Optional[AgentReasoningStep]:
    """The agent's last reasoning in this chat, read from the server's copy."""
    if not session_id:
        return None

    session = await db.chat_sessions.find_one({"id": session_id})

    if not session:
        return None

    for message in reversed(session.get("messages", [])):
        if message.get("role") == "assistant" and message.get("agent_reasoning"):
            return AgentReasoningStep(**message["agent_reasoning"])

    return None


def _payment_summary(entity: Dict[str, Any], source: str) -> Dict[str, Any]:
    details = {
        key: entity.get(key)
        for key in ("status", "vpa", "bank", "wallet", "card_id")
        if entity.get(key)
    }
    details["source"] = source
    return details


# =========================================================
# MARK PAID (shared by client verification and webhook)
# =========================================================

async def _mark_paid(
    order_id: str,
    payment_id: str,
    payment_method: Optional[str],
    payment_details: Dict[str, Any],
) -> Order:
    now = datetime.now(timezone.utc)

    # Atomic transition: only one caller (browser callback or webhook)
    # moves the order to "paid"; everyone else just reads the result.
    before = await db.orders.find_one_and_update(
        {"id": order_id, "status": {"$in": ["created", "expired", "failed"]}},
        {
            "$set": {
                "status": "paid",
                "razorpay_payment_id": payment_id,
                "payment_method": payment_method,
                "payment_details": payment_details,
                "paid_at": now,
            }
        },
        return_document=ReturnDocument.BEFORE,
    )

    if before is None:
        current = await db.orders.find_one({"id": order_id})
        return Order(**current)

    order = Order(**before)
    stock_ok = True

    # The hold may have lapsed before the customer finished paying.
    # Try to reserve again; if that fails, flag the order for a refund.
    if not order.stock_reserved:
        stock_ok = await try_reserve_items(order.items)

        await db.orders.update_one(
            {"id": order_id},
            {
                "$set": {
                    "stock_reserved": stock_ok,
                    "payment_details.stock_conflict": not stock_ok,
                }
            },
        )

    method_label = (payment_method or "unknown").upper()

    await record_event(
        "PAYMENT_VERIFIED",
        "Razorpay Payment Verified",
        (
            f"Payment {payment_id} captured for order {order.id} "
            f"(₹{order.total_amount:,.2f} via {method_label})"
            + ("" if stock_ok else ". Stock was no longer available: refund or restock needed.")
        ),
        order_id=order.id,
        session_id=order.session_id,
        details={
            "razorpay_order_id": order.razorpay_order_id,
            "razorpay_payment_id": payment_id,
            "amount_paid": order.total_amount,
            "payment_method": payment_method,
            "source": payment_details.get("source"),
            "stock_conflict": not stock_ok,
        },
        status="success" if stock_ok else "warning",
    )

    updated = await db.orders.find_one({"id": order_id})
    return Order(**updated)


# =========================================================
# LIST ORDERS (merchant only: contains customer PII)
# =========================================================

@router.get("", response_model=List[Order], dependencies=[Depends(require_merchant)])
async def get_orders(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    query: Dict[str, Any] = {}

    if status and status != "all":
        query["status"] = status

    docs = await db.orders.find(query).sort("created_at", -1).to_list(limit)

    return [Order(**doc) for doc in docs]


@router.get("/{id}", response_model=Order, dependencies=[Depends(require_merchant)])
async def get_order(id: str):
    doc = await db.orders.find_one({"id": id})

    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")

    return Order(**doc)


# =========================================================
# CREATE ORDER
# =========================================================

@router.post("", response_model=Order)
async def create_order(payload: OrderCreate):
    await release_expired_reservations()

    # 1. Price everything from the catalog.
    priced = await price_order(payload.items, payload.promo_code)

    if priced.total <= 0:
        raise HTTPException(status_code=400, detail="Order total must be above ₹0.")

    client = get_razorpay_client()

    # 2. Hold the stock so it can't be sold twice while the customer pays.
    await reserve_items(priced.items)

    # 3. Create the Razorpay order for the server-computed amount.
    try:
        razorpay_order = await run_razorpay(
            client.order.create,
            {
                "amount": to_paise(priced.total),
                "currency": "INR",
                "payment_capture": 1,
            },
        )
    except Exception:
        await release_items(priced.items)
        logger.exception("Razorpay order creation failed")
        raise HTTPException(
            status_code=502,
            detail="Could not create the Razorpay order. Please try again.",
        )

    order = Order(
        razorpay_order_id=razorpay_order["id"],
        session_id=payload.session_id,
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        customer_phone=payload.customer_phone,
        shipping_address=payload.shipping_address,
        items=priced.items,
        subtotal=priced.subtotal,
        bundle_discount=priced.bundle_discount,
        promo_code=priced.promo_code,
        promo_discount=priced.promo_discount,
        tax=0.0,
        total_amount=priced.total,
        status="created",
        stock_reserved=True,
        reservation_expires_at=datetime.now(timezone.utc) + reservation_ttl(),
        agent_thought_snapshot=await _latest_reasoning(payload.session_id),
    )

    try:
        await db.orders.insert_one(order.model_dump())
    except Exception:
        # Without an order document the expiry loop can't find this hold.
        await release_items(priced.items)
        raise

    await record_event(
        "ORDER_CREATED",
        "Customer Order Created",
        (
            f"Order {order.id} created for {order.customer_name}, "
            f"total ₹{order.total_amount:,.2f}; stock reserved."
        ),
        order_id=order.id,
        session_id=order.session_id,
        details={
            "razorpay_order_id": order.razorpay_order_id,
            "subtotal": order.subtotal,
            "bundle_discount": order.bundle_discount,
            "promo_code": order.promo_code,
            "promo_discount": order.promo_discount,
            "total_amount": order.total_amount,
            "items_count": len(order.items),
        },
        status="info",
    )

    return order


# =========================================================
# VERIFY PAYMENT (browser callback after Razorpay Checkout)
# =========================================================

@router.post("/{id}/verify-payment", response_model=Order)
async def verify_payment(id: str, payload: PaymentVerifyRequest):
    order_doc = await db.orders.find_one({"id": id})

    if not order_doc:
        raise HTTPException(status_code=404, detail="Order not found")

    order = Order(**order_doc)

    # A valid signature for a different order must not be replayable here.
    if payload.razorpay_order_id != order.razorpay_order_id:
        raise HTTPException(
            status_code=400,
            detail="razorpay_order_id does not match this order",
        )

    client = get_razorpay_client()

    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": payload.razorpay_order_id,
                "razorpay_payment_id": payload.razorpay_payment_id,
                "razorpay_signature": payload.razorpay_signature,
            }
        )
    except razorpay.errors.SignatureVerificationError:
        # Don't change the order: a forged call must not be able to
        # cancel someone else's checkout or release their stock.
        await record_event(
            "PAYMENT_FAILED",
            "Payment Signature Rejected",
            f"Signature verification failed for order {order.id}.",
            order_id=order.id,
            session_id=order.session_id,
            details={
                "razorpay_order_id": payload.razorpay_order_id,
                "razorpay_payment_id": payload.razorpay_payment_id,
            },
            status="error",
        )
        raise HTTPException(status_code=400, detail="Payment signature is invalid.")

    # Checked only after the signature, so the order's customer details are
    # never returned to someone who merely knows its id.
    if order.status == "paid":
        return order

    # Read the payment from Razorpay instead of trusting the browser for
    # the method, amount and status.
    method: Optional[str] = None
    details: Dict[str, Any] = {"source": "checkout_callback"}

    try:
        payment = await run_razorpay(client.payment.fetch, payload.razorpay_payment_id)
    except Exception:
        # The signature already proves this payment belongs to this order,
        # whose amount we set. Accept it and record that details are missing.
        logger.warning("Could not fetch payment %s from Razorpay", payload.razorpay_payment_id)
        payment = None

    if payment is not None:
        if (
            payment.get("order_id") != order.razorpay_order_id
            or int(payment.get("amount", -1)) != to_paise(order.total_amount)
        ):
            await record_event(
                "PAYMENT_FAILED",
                "Payment Did Not Match Order",
                f"Payment {payload.razorpay_payment_id} does not match order {order.id}.",
                order_id=order.id,
                details={
                    "expected_paise": to_paise(order.total_amount),
                    "payment_amount": payment.get("amount"),
                    "payment_order_id": payment.get("order_id"),
                },
                status="error",
            )
            raise HTTPException(status_code=400, detail="Payment does not match this order.")

        method = payment.get("method")
        details = _payment_summary(payment, "checkout_callback")

    return await _mark_paid(order.id, payload.razorpay_payment_id, method, details)


# =========================================================
# RAZORPAY WEBHOOK
#
# Configure in Razorpay Dashboard -> Webhooks with events
# payment.captured and payment.failed, pointing to
# {APP_URL}/api/orders/webhook/razorpay. This is what marks
# an order paid when the customer closes the tab before the
# browser callback runs.
# =========================================================

@router.post("/webhook/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(default=None),
):
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")

    if not secret:
        raise HTTPException(status_code=503, detail="RAZORPAY_WEBHOOK_SECRET is not set.")

    body = (await request.body()).decode("utf-8")

    try:
        get_razorpay_client().utility.verify_webhook_signature(
            body, x_razorpay_signature or "", secret
        )
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    event = json.loads(body)
    event_type = event.get("event")
    entity = event.get("payload", {}).get("payment", {}).get("entity", {})

    order_doc = await db.orders.find_one({"razorpay_order_id": entity.get("order_id")})

    # Acknowledge events for orders we don't know so Razorpay stops retrying.
    if not order_doc:
        return {"status": "ignored"}

    order = Order(**order_doc)

    if event_type == "payment.captured":
        if int(entity.get("amount", -1)) != to_paise(order.total_amount):
            logger.error("Webhook amount mismatch for order %s", order.id)
            return {"status": "amount_mismatch"}

        await _mark_paid(
            order.id,
            entity["id"],
            entity.get("method"),
            _payment_summary(entity, "webhook"),
        )
        return {"status": "ok"}

    if event_type == "payment.failed":
        # The customer can retry on the same Razorpay order, so the order
        # stays open until it is paid or its reservation expires.
        await record_event(
            "PAYMENT_FAILED",
            "Razorpay Payment Failed",
            entity.get("error_description") or f"A payment attempt failed for order {order.id}.",
            order_id=order.id,
            session_id=order.session_id,
            details={
                "razorpay_payment_id": entity.get("id"),
                "error_code": entity.get("error_code"),
                "method": entity.get("method"),
            },
            status="error",
        )

    return {"status": "ok"}

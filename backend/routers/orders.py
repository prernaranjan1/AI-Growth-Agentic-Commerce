from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
import razorpay

from lib.db import db
from lib.razorpay_client import client as razorpay_client  # adjust import if your client lives elsewhere
from models.orders import Order, OrderCreate, PaymentVerifyRequest
from models.audit import AuditEvent


router = APIRouter(
    prefix="/orders",
    tags=["orders"]
)


def _to_paise(amount: float) -> int:
    """Convert a rupee amount to integer paise using Decimal,
    avoiding float rounding drift."""
    return int(
        (Decimal(str(amount)) * 100).quantize(
            Decimal("1"), rounding=ROUND_HALF_UP
        )
    )


# =========================================================
# GET ALL ORDERS
# =========================================================

@router.get("", response_model=List[Order])
async def get_orders(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200)
):
    query = {}

    if status and status != "all":
        query["status"] = status

    docs = (
        await db.orders
        .find(query)
        .sort("created_at", -1)
        .to_list(limit)
    )

    return [
        Order(**doc)
        for doc in docs
    ]


# =========================================================
# GET SINGLE ORDER
# =========================================================

@router.get("/{id}", response_model=Order)
async def get_order(id: str):

    doc = await db.orders.find_one({
        "id": id
    })

    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    return Order(**doc)


# =========================================================
# CREATE ORDER
# =========================================================

@router.post("", response_model=Order)
async def create_order(
    payload: OrderCreate
):

    # -----------------------------------------------------
    # Calculate subtotal
    # -----------------------------------------------------

    subtotal = sum(
        item.price * item.quantity
        for item in payload.items
    )

    # -----------------------------------------------------
    # Apply bundle discount
    # -----------------------------------------------------

    discount = payload.bundle_discount

    total = max(
        0.0,
        subtotal - discount
    )

    # -----------------------------------------------------
    # Create the order on Razorpay's side FIRST so we have a
    # real razorpay_order_id to store — it's required and has
    # no default; nothing downstream (signature verification)
    # works without a genuine Razorpay-issued order id.
    # -----------------------------------------------------

    try:
        razorpay_order = razorpay_client.order.create({
            "amount": _to_paise(total),
            "currency": "INR",
            "payment_capture": 1,
        })
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to create Razorpay order: {exc}"
        )

    # -----------------------------------------------------
    # Create order
    # -----------------------------------------------------

    order = Order(
        razorpay_order_id=razorpay_order["id"],
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        customer_phone=payload.customer_phone,
        shipping_address=payload.shipping_address,
        items=payload.items,
        subtotal=subtotal,
        bundle_discount=discount,
        tax=0.0,
        total_amount=total,
        currency="INR",
        status="created",
        agent_thought_snapshot=payload.agent_thought_snapshot
    )

    await db.orders.insert_one(
        order.model_dump()
    )

    # -----------------------------------------------------
    # Audit log
    # -----------------------------------------------------

    audit_evt = AuditEvent(
        event_type="ORDER_CREATED",
        order_id=order.id,
        title="Customer Order Created",
        description=(
            f"Order {order.id} generated for "
            f"{order.customer_name} - "
            f"Total: ₹{order.total_amount:,.0f}"
        ),
        details={
            "order_id": order.id,
            "razorpay_order_id": order.razorpay_order_id,
            "total_amount": order.total_amount,
            "items_count": len(order.items),
            "bundle_discount": order.bundle_discount
        },
        status="info"
    )

    await db.audit_events.insert_one(
        audit_evt.model_dump()
    )

    return order


# =========================================================
# VERIFY PAYMENT
# =========================================================

@router.post(
    "/{id}/verify-payment",
    response_model=Order
)
async def verify_payment(
    id: str,
    payload: PaymentVerifyRequest
):

    # -----------------------------------------------------
    # Find order
    # -----------------------------------------------------

    order_doc = await db.orders.find_one({
        "id": id
    })

    if not order_doc:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    order = Order(**order_doc)

    # -----------------------------------------------------
    # Prevent processing an already paid order
    # -----------------------------------------------------

    if order.status == "paid":
        return order

    # -----------------------------------------------------
    # Reject if the payment doesn't even claim to belong to
    # this order's Razorpay order — otherwise a valid
    # signature for a different order could be replayed here.
    # -----------------------------------------------------

    if payload.razorpay_order_id != order.razorpay_order_id:
        raise HTTPException(
            status_code=400,
            detail="razorpay_order_id does not match this order"
        )

    # -----------------------------------------------------
    # Verify the payment signature with Razorpay directly —
    # this is the actual security check. Never trust a
    # client-supplied success/failure flag.
    # -----------------------------------------------------

    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": payload.razorpay_order_id,
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
        })
        signature_valid = True
    except razorpay.errors.SignatureVerificationError:
        signature_valid = False

    if not signature_valid:

        # Guard the update so two concurrent failed calls
        # can't both flip status back and forth.
        await db.orders.update_one(
            {"id": id, "status": {"$ne": "paid"}},
            {
                "$set": {
                    "status": "failed"
                }
            }
        )

        audit_evt = AuditEvent(
            event_type="PAYMENT_FAILED",
            order_id=order.id,
            title="Razorpay Payment Verification Failed",
            description=(
                f"Signature verification failed for order "
                f"{order.id} during checkout."
            ),
            details={
                "razorpay_order_id": payload.razorpay_order_id,
                "razorpay_payment_id": payload.razorpay_payment_id,
                "payment_method": payload.payment_method
            },
            status="error"
        )

        await db.audit_events.insert_one(
            audit_evt.model_dump()
        )

        updated = await db.orders.find_one({
            "id": id
        })

        return Order(**updated)

    # -----------------------------------------------------
    # SUCCESS PAYMENT
    #
    # Atomic guard: only proceed with stock deduction if this
    # call is the one that actually flips status -> paid.
    # Prevents double-deduction from a retry race.
    # -----------------------------------------------------

    now = datetime.now(timezone.utc)

    update_fields = {
        "status": "paid",
        "razorpay_payment_id": payload.razorpay_payment_id,
        "payment_method": payload.payment_method,
        "payment_details": payload.payment_details,
        "paid_at": now
    }

    update_result = await db.orders.update_one(
        {"id": id, "status": {"$ne": "paid"}},
        {
            "$set": update_fields
        }
    )

    if update_result.modified_count == 0:
        # Another concurrent request already marked it paid —
        # don't deduct stock twice.
        updated = await db.orders.find_one({"id": id})
        return Order(**updated)

    # -----------------------------------------------------
    # Deduct stock
    # -----------------------------------------------------

    for item in order.items:

        await db.products.update_one(
            {"id": item.product_id},
            {
                "$inc": {
                    "stock_quantity": -item.quantity
                }
            }
        )

        # Check remaining stock
        product = await db.products.find_one({
            "id": item.product_id
        })

        if product:

            remaining_stock = product.get(
                "stock_quantity",
                0
            )

            if remaining_stock <= 0:

                await db.products.update_one(
                    {"id": item.product_id},
                    {
                        "$set": {
                            "in_stock": False,
                            "stock_quantity": 0
                        }
                    }
                )

    # -----------------------------------------------------
    # Audit successful payment
    # -----------------------------------------------------

    audit_evt = AuditEvent(
        event_type="PAYMENT_VERIFIED",
        order_id=order.id,
        title="Razorpay Payment Verified & Captured",
        description=(
            f"Payment {payload.razorpay_payment_id} captured for "
            f"Order {order.id} "
            f"(₹{order.total_amount:,.0f} "
            f"via {payload.payment_method.upper()})"
        ),
        details={
            "order_id": order.id,
            "razorpay_order_id": order.razorpay_order_id,
            "razorpay_payment_id": payload.razorpay_payment_id,
            "amount_paid": order.total_amount,
            "payment_method": payload.payment_method,
            "payment_details": payload.payment_details
        },
        status="success"
    )

    await db.audit_events.insert_one(
        audit_evt.model_dump()
    )

    # -----------------------------------------------------
    # Return updated order
    # -----------------------------------------------------

    updated = await db.orders.find_one({
        "id": id
    })

    return Order(**updated)
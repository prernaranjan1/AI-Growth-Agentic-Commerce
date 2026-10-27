from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone
import uuid

from models.agent import AgentReasoningStep


OrderStatus = Literal[
    "created",     # stock reserved, waiting for payment
    "paid",
    "expired",     # reservation lapsed before payment; stock released
    "failed",      # Razorpay reported a failed payment
    "shipped",
]


class Address(BaseModel):
    name: str = Field(..., min_length=1)
    phone: str = Field(..., min_length=6)
    address_line: str = Field(..., min_length=1)
    city: str = Field(..., min_length=1)
    state: str = Field(..., min_length=1)
    pincode: str = Field(..., pattern=r"^\d{6}$")


class OrderItem(BaseModel):
    """A priced line item. Always built on the server from the catalog."""

    product_id: str
    name: str
    brand: str
    category: Optional[str] = None
    price: float = Field(..., ge=0)
    original_price: float = Field(..., ge=0)
    quantity: int = Field(default=1, ge=1)
    size: Optional[str] = None
    color: Optional[str] = None
    is_upsell: bool = False
    image_url: Optional[str] = None


class OrderItemRequest(BaseModel):
    """What the client is allowed to send: which product and how many.

    Prices, names and discounts are never accepted from the client.
    """

    product_id: str
    quantity: int = Field(default=1, ge=1, le=10)
    size: Optional[str] = None
    color: Optional[str] = None
    is_upsell: bool = False


class Order(BaseModel):
    id: str = Field(
        default_factory=lambda: f"ORD-{datetime.now(timezone.utc):%Y%m%d%H%M%S}-{uuid.uuid4().hex[:6].upper()}"
    )
    # Set from Razorpay's Create Order API response, never defaulted.
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = None
    session_id: Optional[str] = None
    customer_name: str
    customer_email: str
    customer_phone: str
    shipping_address: Address
    items: List[OrderItem]
    subtotal: float = Field(..., ge=0)
    bundle_discount: float = Field(default=0.0, ge=0)
    promo_code: Optional[str] = None
    promo_discount: float = Field(default=0.0, ge=0)
    tax: float = Field(default=0.0, ge=0)
    total_amount: float = Field(..., ge=0)
    currency: str = "INR"
    status: OrderStatus = "created"
    stock_reserved: bool = False
    reservation_expires_at: Optional[datetime] = None
    payment_method: Optional[str] = None
    payment_details: Dict[str, Any] = Field(default_factory=dict)
    agent_thought_snapshot: Optional[AgentReasoningStep] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    paid_at: Optional[datetime] = None


class OrderCreate(BaseModel):
    customer_name: str = Field(..., min_length=1)
    customer_email: EmailStr
    customer_phone: str = Field(..., min_length=6)
    shipping_address: Address
    items: List[OrderItemRequest] = Field(..., min_length=1, max_length=20)
    promo_code: Optional[str] = None
    # Links the order to the chat that produced it, for conversion tracking
    # and to attach the agent's reasoning snapshot server-side.
    session_id: Optional[str] = None


class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

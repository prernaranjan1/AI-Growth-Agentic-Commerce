from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone
import uuid

from models.agent import AgentReasoningStep


class Address(BaseModel):
    name: str
    phone: str
    address_line: str
    city: str
    state: str = "Karnataka"
    pincode: str


class OrderItem(BaseModel):
    product_id: str
    name: str
    brand: str
    price: float = Field(..., ge=0)
    original_price: float = Field(..., ge=0)
    quantity: int = Field(default=1, ge=1)
    size: Optional[str] = None
    color: Optional[str] = None
    is_upsell: bool = False
    image_url: Optional[str] = None


class Order(BaseModel):
    id: str = Field(
        default_factory=lambda: f"ORD-{datetime.now(timezone.utc):%Y%m%d%H%M%S}-{uuid.uuid4().hex[:6].upper()}"
    )
    # Set explicitly by orders.py from Razorpay's Create Order API response — never defaulted.
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = None
    customer_name: str
    customer_email: str
    customer_phone: str
    shipping_address: Address
    items: List[OrderItem]
    subtotal: float = Field(..., ge=0)
    bundle_discount: float = Field(default=0.0, ge=0)
    tax: float = Field(default=0.0, ge=0)
    total_amount: float = Field(..., ge=0)
    currency: str = "INR"
    status: Literal["created", "processing", "paid", "failed", "shipped"] = "created"
    payment_method: Optional[Literal["upi", "card", "netbanking", "wallet"]] = None
    payment_details: Dict[str, Any] = Field(default_factory=dict)
    agent_thought_snapshot: Optional[AgentReasoningStep] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    paid_at: Optional[datetime] = None


class OrderCreate(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    shipping_address: Address
    items: List[OrderItem]
    bundle_discount: float = Field(default=0.0, ge=0)
    agent_thought_snapshot: Optional[AgentReasoningStep] = None


class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    payment_method: Optional[
        Literal["upi", "card", "netbanking", "wallet"]
    ] = None
    payment_details: Dict[str, Any] = Field(default_factory=dict)
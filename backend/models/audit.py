from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime, timezone
import uuid


class AuditEvent(BaseModel):
    id: str = Field(default_factory=lambda: f"AUD_{uuid.uuid4().hex}")
    event_type: Literal[
        "INTENT_PARSED",
        "CATALOG_SEARCH",
        "INVENTORY_CHECK",
        "PRODUCT_CREATED",
        "PRODUCT_RECOMMENDED",
        "UPSELL_SUGGESTED",
        "GUARDRAIL_CHECK",
        "ORDER_CREATED",
        "PAYMENT_INITIATED",
        "PAYMENT_VERIFIED",
        "PAYMENT_FAILED",
        "CAMPAIGN_AUTO_LAUNCHED",
    ]
    session_id: Optional[str] = None
    order_id: Optional[str] = None
    title: str
    description: str
    details: Dict[str, Any] = Field(default_factory=dict)
    status: Literal["success", "warning", "error", "info"] = "success"
    latency_ms: int = Field(default=120, ge=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AuditMetrics(BaseModel):
    total_gmv: float = Field(..., ge=0)
    total_orders: int = Field(..., ge=0)
    # Computed as 0-100 percentages in routers/audit.py (e.g. 45.6,
    # not 0.456) — bounds must match that scale, not a 0-1 fraction.
    ai_conversion_rate: float = Field(..., ge=0, le=100)
    catalog_skus_count: int = Field(..., ge=0)
    low_stock_count: int = Field(..., ge=0)
    avg_agent_latency_ms: int = Field(..., ge=0)
    payment_success_rate: float = Field(..., ge=0, le=100)
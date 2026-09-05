from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid


class CampaignMetrics(BaseModel):
    sent_count: int = Field(default=0, ge=0)
    clicks: int = Field(default=0, ge=0)
    orders_generated: int = Field(default=0, ge=0)
    revenue_generated: float = Field(default=0.0, ge=0)
    conversion_rate: float = Field(default=0.0, ge=0, le=100)


class Campaign(BaseModel):
    id: str = Field(
        default_factory=lambda: f"CMP-{uuid.uuid4().hex[:8].upper()}"
    )

    title: str
    goal: str
    target_audience: str

    status: str = "active"

    channels: List[str] = Field(
        default_factory=lambda: ["whatsapp", "sms"]
    )

    whatsapp_copy: str
    sms_copy: str

    discount_code: str
    discount_percent: int = Field(default=15, ge=0, le=100)

    forecasted_roi: str

    target_category: str = "footwear"

    created_by_agent: bool = True

    metrics: CampaignMetrics = Field(
        default_factory=CampaignMetrics
    )

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class CampaignOrchestrateRequest(BaseModel):
    prompt: Optional[str] = None
    target_category: Optional[str] = "footwear"
    goal: Optional[str] = "clearance"
    discount_percent: Optional[int] = Field(
        default=15,
        ge=0,
        le=100
    )


class CampaignCreate(BaseModel):
    title: str
    goal: str
    target_audience: str
    channels: List[str]
    whatsapp_copy: str
    sms_copy: str
    discount_code: str
    discount_percent: int = Field(
        default=15,
        ge=0,
        le=100
    )
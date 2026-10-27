from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Literal
from datetime import datetime, timezone
import uuid

from models.catalog import Product


class AgentReasoningStep(BaseModel):
    intent_summary: str
    budget_extracted: Optional[float] = Field(default=None, ge=0)
    budget_min_extracted: Optional[float] = Field(default=None, ge=0)
    category_extracted: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    catalog_matches_found: int = Field(default=0, ge=0)
    inventory_status: str
    recommendation_rationale: str
    upsell_strategy: str
    # Measured end-to-end time for this agent turn.
    execution_time_ms: int = Field(default=0, ge=0)
    # Share of the customer's stated constraints (category, budget,
    # feature keywords) that the top recommendation satisfies.
    # None when the customer gave no constraints to check against.
    confidence_score: Optional[float] = Field(default=None, ge=0, le=1)
    # "passed", "replaced" (LLM reply failed checks, deterministic reply
    # used), or "fallback" (LLM unavailable).
    reply_guardrail: Optional[str] = None


class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    agent_reasoning: Optional[AgentReasoningStep] = None
    recommended_product_ids: List[str] = Field(default_factory=list)
    upsell_product_ids: List[str] = Field(default_factory=list)
    interactive_action: Optional[str] = None


class ChatSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "New Shopping Assistant Session"
    messages: List[ChatMessage] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str = Field(..., min_length=1, max_length=1000)
    budget_filter: Optional[float] = Field(default=None, ge=0)
    category_filter: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    reasoning: AgentReasoningStep
    recommended_products: List[Product] = Field(default_factory=list)
    upsell_products: List[Product] = Field(default_factory=list)
    # Bundle saving per unit for each upsell when bought with the top
    # recommendation, as the server will apply it (0 = not linked).
    upsell_savings: Dict[str, float] = Field(default_factory=dict)
    message_id: str
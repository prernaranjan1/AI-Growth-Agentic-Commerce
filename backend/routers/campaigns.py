import json
import logging
import re
import uuid
from typing import List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from lib.audit import record_event
from lib.auth import require_merchant
from lib.db import db
from lib.gemini_client import generate_text, get_gemini_client
from models.campaigns import (
    Campaign,
    CampaignCreate,
    CampaignOrchestrateRequest,
    NO_FORECAST,
)


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/campaigns",
    tags=["campaigns"],
    dependencies=[Depends(require_merchant)],
)


def _normalize_code(code: str) -> str:
    cleaned = re.sub(r"[^A-Z0-9]", "", code.upper())[:16]
    return cleaned or f"NEXUS{uuid.uuid4().hex[:4].upper()}"


async def _unique_code(code: str) -> str:
    """Promo codes are redeemed at checkout, so they must not collide."""
    candidate = _normalize_code(code)

    while await db.campaigns.find_one({"discount_code": candidate}):
        candidate = f"{candidate[:12]}{uuid.uuid4().hex[:4].upper()}"

    return candidate


# =========================================================
# GEMINI COPY GENERATION
# =========================================================

async def _generate_campaign_copy(payload: CampaignOrchestrateRequest) -> dict:

    if get_gemini_client() is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Gemini is not configured. Set GEMINI_API_KEY in "
                "backend/.env to use campaign orchestration."
            ),
        )

    # The model writes copy only. Discount values come from the
    # merchant's request, and no performance numbers are generated.
    prompt = f"""
You are a marketing copywriter for an Indian e-commerce retailer selling
running shoes, smartwatches, and audio accessories in INR (₹).

Write a marketing campaign with these constraints:
- Goal: {payload.goal}
- Target product category: {payload.target_category}
- Discount: {payload.discount_percent}%
- Extra creative direction from the merchant: {payload.prompt or "none"}

Do not invent prices, sales figures, ROAS, order counts or forecasts.

Respond with ONLY a JSON object with exactly these keys:
{{
  "title": "short catchy campaign title with an emoji",
  "target_audience": "one sentence describing who this targets",
  "whatsapp_copy": "WhatsApp message using *bold* markdown, under 400 chars, include the discount code placeholder {{CODE}} and a placeholder link",
  "sms_copy": "SMS message under 160 chars, include the discount code placeholder {{CODE}}",
  "discount_code": "a short uppercase promo code, letters and digits only"
}}
"""

    try:
        raw = await generate_text(
            prompt,
            system_instruction=(
                "You generate concise e-commerce marketing campaigns. "
                "Return valid JSON only."
            ),
            json_mode=True,
            temperature=0.6,
            max_output_tokens=500,
        )
        if not raw:
            raise ValueError("Gemini returned an empty response")
        generated = json.loads(raw)
    except Exception:
        logger.exception("Gemini campaign generation failed")
        raise HTTPException(
            status_code=502,
            detail="Campaign copy generation failed. Please try again.",
        )

    required_keys = {
        "title", "target_audience", "whatsapp_copy",
        "sms_copy", "discount_code",
    }
    if not required_keys.issubset(generated.keys()):
        raise HTTPException(
            status_code=502,
            detail="Gemini response was missing required campaign fields.",
        )

    return generated


# =========================================================
# LIST CAMPAIGNS
# =========================================================

@router.get("", response_model=List[Campaign])
async def get_campaigns():
    docs = await db.campaigns.find({}).sort("created_at", -1).to_list(100)
    return [Campaign(**doc) for doc in docs]


# =========================================================
# GET SINGLE CAMPAIGN
# =========================================================

@router.get("/{id}", response_model=Campaign)
async def get_campaign(id: str):
    doc = await db.campaigns.find_one({"id": id})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return Campaign(**doc)


# =========================================================
# CREATE CAMPAIGN MANUALLY
# =========================================================

@router.post("", response_model=Campaign)
async def create_campaign(payload: CampaignCreate):
    data = payload.model_dump()
    data["discount_code"] = await _unique_code(payload.discount_code)

    campaign = Campaign(**data, created_by_agent=False)

    await db.campaigns.insert_one(campaign.model_dump())

    return campaign


# =========================================================
# AI-DRAFTED CAMPAIGN
#
# Gemini drafts the copy; the campaign is saved as a draft.
# Activating it (PATCH /status) makes its promo code
# redeemable at checkout. Messages are not sent from here.
# =========================================================

@router.post("/orchestrate", response_model=Campaign)
async def orchestrate_campaign(payload: CampaignOrchestrateRequest):

    generated = await _generate_campaign_copy(payload)

    code = await _unique_code(generated["discount_code"])

    def fill(text: str) -> str:
        return text.replace("{CODE}", code)

    campaign = Campaign(
        title=generated["title"],
        goal=payload.goal or "clearance",
        target_audience=generated["target_audience"],
        status="draft",
        channels=["whatsapp", "sms"],
        whatsapp_copy=fill(generated["whatsapp_copy"]),
        sms_copy=fill(generated["sms_copy"]),
        discount_code=code,
        discount_percent=payload.discount_percent or 15,
        forecasted_roi=NO_FORECAST,
        target_category=payload.target_category or "footwear",
        created_by_agent=True,
    )

    await db.campaigns.insert_one(campaign.model_dump())

    await record_event(
        "CAMPAIGN_AUTO_LAUNCHED",
        "AI Campaign Drafted",
        (
            f"Gemini drafted campaign '{campaign.title}' for "
            f"{campaign.target_category}. Activate it to enable code {code}."
        ),
        details={
            "campaign_id": campaign.id,
            "goal": campaign.goal,
            "discount_code": campaign.discount_code,
            "discount_percent": campaign.discount_percent,
        },
        status="info",
    )

    return campaign


# =========================================================
# TOGGLE CAMPAIGN STATUS
# =========================================================

@router.patch("/{id}/status", response_model=Campaign)
async def update_campaign_status(
    id: str,
    status: Literal["active", "draft", "scheduled", "paused", "completed"] = Query(...),
):
    doc = await db.campaigns.find_one({"id": id})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")

    await db.campaigns.update_one({"id": id}, {"$set": {"status": status}})

    updated = await db.campaigns.find_one({"id": id})
    return Campaign(**updated)


# =========================================================
# DELETE CAMPAIGN
# =========================================================

@router.delete("/{id}")
async def delete_campaign(id: str):
    result = await db.campaigns.delete_one({"id": id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted", "id": id}

import json
import os
import re
import uuid
from typing import List, Literal

from fastapi import APIRouter, HTTPException, Query

from lib.db import db
from models.campaigns import (
    Campaign,
    CampaignCreate,
    CampaignOrchestrateRequest,
)
from models.audit import AuditEvent
from lib.gemini_client import generate_text, get_gemini_client


router = APIRouter(
    prefix="/campaigns",
    tags=["campaigns"],
)


# =========================================================
# GEMINI SETUP
#
# NOTE: this follows the standard google-generativeai pattern.
# If your existing genai.py (used elsewhere in the agent) sets
# up the client differently — different model name, different
# API key env var, a shared client instance — this should be
# reconciled to match rather than kept as a second, separate
# way of calling Gemini. Paste genai.py and I'll align these.
# =========================================================

async def _generate_campaign_copy(
    payload: CampaignOrchestrateRequest,
) -> dict:

    if get_gemini_client() is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Gemini is not configured — set GEMINI_API_KEY in .env "
                "to use campaign orchestration."
            ),
        )

    prompt = f"""
You are a marketing copywriter for an Indian e-commerce retailer selling
running shoes, smartwatches, and audio accessories in INR (₹).

Write a marketing campaign with these constraints:
- Goal: {payload.goal}
- Target product category: {payload.target_category}
- Discount: {payload.discount_percent}%
- Extra creative direction from the merchant: {payload.prompt or "none"}

Respond with ONLY a JSON object with exactly these keys:
{{
  "title": "short catchy campaign title with an emoji",
  "target_audience": "one sentence describing who this targets",
  "whatsapp_copy": "WhatsApp message using *bold* markdown, under 400 chars, include a discount code and a placeholder link",
  "sms_copy": "SMS message under 160 chars, include the discount code",
  "discount_code": "a short uppercase promo code",
  "forecasted_roi": "one line like '4.8x ROAS | Est. 210 Orders | ₹5.2L Projected GMV'"
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
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini campaign generation failed: {exc}",
        )

    required_keys = {
        "title", "target_audience", "whatsapp_copy",
        "sms_copy", "discount_code", "forecasted_roi",
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

    campaign = Campaign(**payload.model_dump())

    await db.campaigns.insert_one(campaign.model_dump())

    return campaign


# =========================================================
# AI-ORCHESTRATED CAMPAIGN
# =========================================================

@router.post("/orchestrate", response_model=Campaign)
async def orchestrate_campaign(payload: CampaignOrchestrateRequest):

    generated = await _generate_campaign_copy(payload)

    campaign = Campaign(
        title=generated["title"],
        goal=payload.goal or "clearance",
        target_audience=generated["target_audience"],
        channels=["whatsapp", "sms"],
        whatsapp_copy=generated["whatsapp_copy"],
        sms_copy=generated["sms_copy"],
        discount_code=generated["discount_code"],
        discount_percent=payload.discount_percent or 15,
        forecasted_roi=generated["forecasted_roi"],
        target_category=payload.target_category or "footwear",
        created_by_agent=True,
    )

    await db.campaigns.insert_one(campaign.model_dump())

    audit_evt = AuditEvent(
        event_type="CAMPAIGN_AUTO_LAUNCHED",
        title="AI Campaign Auto-Launched",
        description=(
            f"Gemini generated and launched campaign '{campaign.title}' "
            f"targeting {campaign.target_category}."
        ),
        details={
            "campaign_id": campaign.id,
            "goal": campaign.goal,
            "discount_code": campaign.discount_code,
            "discount_percent": campaign.discount_percent,
        },
        status="success",
    )

    await db.audit_events.insert_one(audit_evt.model_dump())

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
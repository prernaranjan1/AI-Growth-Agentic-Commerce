import pytest

from conftest import MERCHANT

from lib.db import db
from lib.guardrails import check_reply
from lib.intent import extract_intent
from models.catalog import Product


@pytest.mark.parametrize(
    "text, category, budget_min, budget_max",
    [
        ("running watch with GPS under 4000", "smartwatch", None, 4000),
        ("wireless running earbuds", "electronics", None, None),
        ("socks for my running shoes", "accessories", None, None),
        ("earbuds between 1000 and 2000", "electronics", 1000, 2000),
        ("shoes 2-3k", "footwear", 2000, 3000),
        ("UK 9 to 10 shoes", "footwear", None, None),
        ("5 star rated shoes under ₹3,000", "footwear", None, 3000),
        ("smartwatch above 3000", "smartwatch", 3000, None),
        ("something for my morning jog", "footwear", None, None),
    ],
)
def test_intent_extraction(text, category, budget_min, budget_max):
    intent = extract_intent(text)
    assert intent.category == category
    assert intent.budget_min == budget_min
    assert intent.budget_max == budget_max


def test_keywords_match_whole_words_only():
    assert "anc" not in extract_intent("shoes that help with balance").keywords
    assert "lightweight" not in extract_intent("a bag for my flight").keywords


def _product(**kw) -> Product:
    base = dict(
        id="p1", name="Velocity Nitro Runner X", brand="Stridex",
        category="footwear", price=2499, original_price=3999,
        image_url="x", description="d",
    )
    return Product(**{**base, **kw})


def test_guardrail_rejects_invented_price():
    products = [_product()]

    ok = check_reply("Try **Velocity Nitro Runner X** for ₹2,499.", products, [])
    assert ok.passed

    bad = check_reply("Try **Velocity Nitro Runner X** for ₹1,999.", products, [])
    assert not bad.passed

    wrong_product = check_reply("Try the **Hyper Boost 9000** for ₹2,499.", products, [])
    assert not wrong_product.passed


async def chat(api, message, session_id=None):
    response = await api.post(
        "/api/agent/chat",
        json={"message": message, "session_id": session_id},
    )
    assert response.status_code == 200
    return response.json()


async def test_chat_recommends_in_budget_and_audits_one_latency(api):
    first = await chat(api, "I need lightweight running shoes under ₹3000 with good cushioning")

    assert first["recommended_products"]
    assert all(p["price"] <= 3000 for p in first["recommended_products"])
    assert all(p["category"] == "footwear" for p in first["recommended_products"])
    assert first["reasoning"]["reply_guardrail"] == "fallback"  # no Gemini key in tests

    events = await db.audit_events.find(
        {"session_id": first["session_id"], "latency_ms": {"$ne": None}}
    ).to_list(10)
    assert [e["event_type"] for e in events] == ["INTENT_PARSED"]


async def test_follow_up_cheaper_uses_previous_turn(api):
    first = await chat(api, "running shoes under 3000")
    top_price = first["recommended_products"][0]["price"]

    second = await chat(api, "something cheaper", first["session_id"])

    assert second["reasoning"]["category_extracted"] == "footwear"
    assert second["recommended_products"]
    assert all(p["price"] < top_price for p in second["recommended_products"])

    session = await db.chat_sessions.find_one({"id": first["session_id"]})
    assert [m["role"] for m in session["messages"]] == ["user", "assistant", "user", "assistant"]


async def test_session_list_is_merchant_only(api):
    assert (await api.get("/api/agent/sessions")).status_code == 401
    assert (await api.get("/api/agent/sessions", headers=MERCHANT)).status_code == 200


async def test_merchant_endpoints_require_key(api):
    assert (await api.get("/api/catalog")).status_code == 200  # storefront read stays public
    assert (await api.get("/api/catalog/stats/summary")).status_code == 401
    assert (await api.get("/api/campaigns")).status_code == 401
    assert (await api.get("/api/audit/metrics")).status_code == 401
    assert (await api.delete("/api/catalog/prod-shoe-velocity-01")).status_code == 401
    assert (await api.get("/api/audit/metrics", headers=MERCHANT)).status_code == 200


def test_guardrail_reads_rupees_written_after_the_number():
    products = [_product()]
    assert not check_reply("**Velocity Nitro Runner X** costs 1,999 rupees.", products, []).passed
    assert check_reply("**Velocity Nitro Runner X** costs 2,499 rupees.", products, []).passed


async def test_placeholder_merchant_key_is_treated_as_unset(api, monkeypatch):
    monkeypatch.setenv("MERCHANT_API_KEY", "change-me-to-a-long-random-string")
    response = await api.get(
        "/api/audit/metrics",
        headers={"X-Merchant-Key": "change-me-to-a-long-random-string"},
    )
    assert response.status_code == 503


async def test_chat_reports_bundle_savings_per_upsell(api):
    reply = await chat(api, "running shoes under 3000")
    top = reply["recommended_products"][0]
    for upsell in reply["upsell_products"]:
        expected = 150 if upsell["id"] in top["upsell_product_ids"] else 0
        assert reply["upsell_savings"][upsell["id"]] == expected

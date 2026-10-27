import re
from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from lib.auth import require_merchant
from lib.db import db
from models.audit import AuditEvent, AuditMetrics


router = APIRouter(
    prefix="/audit",
    tags=["audit"],
    dependencies=[Depends(require_merchant)],
)


# =========================================================
# GET AUDIT LOGS
# =========================================================

@router.get(
    "/logs",
    response_model=List[AuditEvent]
)
async def get_audit_logs(
    event_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500)
):

    query = {}

    # -----------------------------------------------------
    # Event type filter
    # -----------------------------------------------------

    if event_type and event_type != "all":
        query["event_type"] = event_type

    # -----------------------------------------------------
    # Status filter
    # -----------------------------------------------------

    if status and status != "all":
        query["status"] = status

    # -----------------------------------------------------
    # Search (escaped to avoid regex injection / ReDoS)
    # -----------------------------------------------------

    if search:

        safe_search = re.escape(search.strip())

        search_regex = {
            "$regex": safe_search,
            "$options": "i"
        }

        query["$or"] = [
            {"title": search_regex},
            {"description": search_regex},
            {"id": search_regex},
            {"order_id": search_regex},
            {"session_id": search_regex}
        ]

    # -----------------------------------------------------
    # Fetch logs
    # -----------------------------------------------------

    docs = (
        await db.audit_events
        .find(query)
        .sort("created_at", -1)
        .to_list(limit)
    )

    return [
        AuditEvent(**doc)
        for doc in docs
    ]


# =========================================================
# AUDIT METRICS
# =========================================================

@router.get(
    "/metrics",
    response_model=AuditMetrics
)
async def get_audit_metrics():

    # =====================================================
    # 1. GMV FROM PAID ORDERS (aggregation, not capped
    #    Python-side sum — correct at any order volume)
    # =====================================================

    gmv_pipeline = [
        {"$match": {"status": {"$in": ["paid", "shipped"]}}},
        {
            "$group": {
                "_id": None,
                "total_gmv": {"$sum": "$total_amount"},
                "count": {"$sum": 1},
            }
        },
    ]
    gmv_result = await db.orders.aggregate(gmv_pipeline).to_list(1)

    total_gmv = gmv_result[0]["total_gmv"] if gmv_result else 0.0
    total_paid_orders = gmv_result[0]["count"] if gmv_result else 0

    # =====================================================
    # 2. TOTAL ORDERS / CHECKOUT COMPLETION
    #
    # Completion = paid / orders that reached an outcome
    # (paid, failed, expired). Orders still waiting for
    # payment are left out rather than counted as success.
    # =====================================================

    all_orders_count = await db.orders.count_documents({})

    closed_orders_count = await db.orders.count_documents({
        "status": {"$in": ["paid", "shipped", "failed", "expired"]}
    })

    if closed_orders_count > 0:
        payment_success_rate = round(
            (total_paid_orders / closed_orders_count) * 100, 1
        )
    else:
        payment_success_rate = 0.0

    # =====================================================
    # 3. AI CONVERSION
    #
    # Paid orders that came from a chat session, divided by
    # chat sessions. Orders carry session_id for this.
    # =====================================================

    total_sessions = await db.chat_sessions.count_documents({})

    ai_paid_orders = await db.orders.count_documents({
        "status": {"$in": ["paid", "shipped"]},
        "session_id": {"$ne": None},
    })

    if total_sessions > 0:
        ai_conversion_rate = round(
            min(100.0, (ai_paid_orders / total_sessions) * 100), 1
        )
    else:
        ai_conversion_rate = 0.0

    # =====================================================
    # 4. CATALOG COUNTS
    # =====================================================

    total_skus = await (
        db.products.count_documents({})
    )

    low_stock = await (
        db.products.count_documents({
            "stock_quantity": {
                "$gt": 0,
                "$lte": 5
            }
        })
    )

    # =====================================================
    # 5. AVERAGE AGENT LATENCY (aggregation)
    # =====================================================

    latency_pipeline = [
        # One INTENT_PARSED event per agent turn, carrying the
        # measured end-to-end latency of that turn.
        {"$match": {"event_type": "INTENT_PARSED", "latency_ms": {"$ne": None}}},
        {
            "$group": {
                "_id": None,
                "avg_latency": {"$avg": "$latency_ms"},
            }
        },
    ]
    latency_result = await db.audit_events.aggregate(latency_pipeline).to_list(1)

    avg_latency = (
        int(latency_result[0]["avg_latency"])
        if latency_result and latency_result[0]["avg_latency"] is not None
        else 0
    )

    # =====================================================
    # RETURN METRICS
    # =====================================================

    return AuditMetrics(
        total_gmv=round(
            total_gmv,
            2
        ),

        total_orders=all_orders_count,

        ai_conversion_rate=ai_conversion_rate,

        catalog_skus_count=total_skus,

        low_stock_count=low_stock,

        avg_agent_latency_ms=avg_latency,

        payment_success_rate=payment_success_rate
    )
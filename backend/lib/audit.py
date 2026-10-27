from typing import Any, Dict, Optional

from lib.db import db
from models.audit import AuditEvent


async def record_event(
    event_type: str,
    title: str,
    description: str,
    *,
    session_id: Optional[str] = None,
    order_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    status: str = "success",
    latency_ms: Optional[int] = None,
) -> AuditEvent:
    event = AuditEvent(
        event_type=event_type,
        title=title,
        description=description,
        session_id=session_id,
        order_id=order_id,
        details=details or {},
        status=status,
        latency_ms=latency_ms,
    )

    await db.audit_events.insert_one(event.model_dump())

    return event

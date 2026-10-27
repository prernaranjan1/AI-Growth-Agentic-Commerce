import os
import secrets
from typing import Optional

from fastapi import Header, HTTPException


PLACEHOLDER_PREFIX = "change-me"


def _configured_key() -> Optional[str]:
    key = os.getenv("MERCHANT_API_KEY", "").strip()
    # The value copied from .env.example is not a real key.
    if not key or key.startswith(PLACEHOLDER_PREFIX):
        return None
    return key


async def require_merchant(
    x_merchant_key: Optional[str] = Header(default=None),
) -> None:
    """Guard merchant-only endpoints (catalog writes, campaigns, orders, audit).

    The merchant dashboard sends the key in the X-Merchant-Key header.
    Endpoints fail closed: if MERCHANT_API_KEY is not set, they return 503
    rather than being open to everyone.
    """
    expected = _configured_key()

    if expected is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Merchant endpoints are disabled. Set MERCHANT_API_KEY "
                "in backend/.env."
            ),
        )

    if not x_merchant_key or not secrets.compare_digest(
        x_merchant_key.encode(), expected.encode()
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing merchant key.",
        )

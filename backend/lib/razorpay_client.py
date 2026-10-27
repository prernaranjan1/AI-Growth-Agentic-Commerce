import asyncio
import os
from typing import Any, Optional

import razorpay
from fastapi import HTTPException


_client: Optional[razorpay.Client] = None


def get_razorpay_client() -> razorpay.Client:
    """Return a shared Razorpay client.

    Built lazily so the rest of the API (chat, catalog) still starts when
    Razorpay keys are not configured. Payment endpoints return 503 instead.
    """
    global _client

    if _client is None:
        key_id = os.getenv("RAZORPAY_KEY_ID")
        key_secret = os.getenv("RAZORPAY_KEY_SECRET")

        if not key_id or not key_secret:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Razorpay is not configured. Set RAZORPAY_KEY_ID and "
                    "RAZORPAY_KEY_SECRET in backend/.env."
                ),
            )

        _client = razorpay.Client(auth=(key_id, key_secret))

    return _client


async def run_razorpay(func, *args: Any, **kwargs: Any) -> Any:
    """Run a blocking Razorpay SDK call without blocking the event loop."""
    return await asyncio.to_thread(func, *args, **kwargs)

import os

import razorpay


def _build_client():
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")

    if not key_id or not key_secret:
        raise RuntimeError(
            "Razorpay credentials are missing. "
            "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env."
        )

    return razorpay.Client(
        auth=(key_id, key_secret)
    )


client = _build_client()
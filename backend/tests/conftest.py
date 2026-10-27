"""Test setup: in-memory MongoDB, a real Razorpay client with network
calls stubbed, and no Gemini key (so the deterministic reply is used)."""

import hashlib
import hmac
import os
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

os.environ.update(
    {
        "MERCHANT_API_KEY": "test-merchant-key",
        "RAZORPAY_KEY_ID": "rzp_test_dummy",
        "RAZORPAY_KEY_SECRET": "test_secret",
        "RAZORPAY_WEBHOOK_SECRET": "webhook_secret",
        "CORS_ORIGINS": "http://localhost:5173",
    }
)
os.environ.pop("GEMINI_API_KEY", None)
os.environ.pop("GOOGLE_API_KEY", None)

# Swap Motor for mongomock before anything imports lib.db.
import mongomock_motor  # noqa: E402
import motor.motor_asyncio  # noqa: E402

motor.motor_asyncio.AsyncIOMotorClient = mongomock_motor.AsyncMongoMockClient

import httpx  # noqa: E402

import lib.razorpay_client as rzp  # noqa: E402
from lib.db import db  # noqa: E402
from main import app  # noqa: E402
import seed  # noqa: E402


MERCHANT = {"X-Merchant-Key": "test-merchant-key"}


class FakeRazorpay:
    """Records created orders and serves payments for payment.fetch."""

    def __init__(self):
        self.orders = {}
        self.payments = {}
        self._n = 0

    def create_order(self, data):
        self._n += 1
        order = {"id": f"order_test_{self._n}", **data}
        self.orders[order["id"]] = order
        return order

    def add_payment(self, payment_id, order_id, amount, method="card"):
        self.payments[payment_id] = {
            "id": payment_id,
            "order_id": order_id,
            "amount": amount,
            "method": method,
            "status": "captured",
        }

    def fetch_payment(self, payment_id, *args, **kwargs):
        return self.payments[payment_id]


def sign(razorpay_order_id: str, payment_id: str) -> str:
    message = f"{razorpay_order_id}|{payment_id}".encode()
    return hmac.new(b"test_secret", message, hashlib.sha256).hexdigest()


def sign_webhook(body: bytes) -> str:
    return hmac.new(b"webhook_secret", body, hashlib.sha256).hexdigest()


@pytest.fixture
async def fake_razorpay(monkeypatch):
    rzp._client = None
    client = rzp.get_razorpay_client()
    fake = FakeRazorpay()
    monkeypatch.setattr(client.order, "create", fake.create_order)
    monkeypatch.setattr(client.payment, "fetch", fake.fetch_payment)
    yield fake
    rzp._client = None


@pytest.fixture(autouse=True)
async def seeded_db():
    await seed.seed_data()
    yield db


@pytest.fixture
async def api():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


CUSTOMER = {
    "customer_name": "Test Customer",
    "customer_email": "test@example.com",
    "customer_phone": "+91 90000 00000",
    "shipping_address": {
        "name": "Test Customer",
        "phone": "+91 90000 00000",
        "address_line": "1 Test Street",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560001",
    },
}

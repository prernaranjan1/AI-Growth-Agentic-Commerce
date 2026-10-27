import os
from datetime import timezone

from motor.motor_asyncio import AsyncIOMotorClient


MONGO_URL = (
	os.environ.get("MONGO_URL")
	or os.environ.get("MONGODB_URI")
	or "mongodb://127.0.0.1:27017"
)
DATABASE_NAME = (
	os.environ.get("MONGO_DATABASE")
	or os.environ.get("DB_NAME")
	or "nexus_ai_commerce"
)

# tz_aware so datetimes read back are UTC-aware and serialize with an
# offset; naive values would be read as local time by browsers.
client = AsyncIOMotorClient(MONGO_URL, tz_aware=True, tzinfo=timezone.utc)
db = client[DATABASE_NAME]


async def ensure_indexes():
	"""Create the indexes required by the API's common queries."""
	await db.products.create_index("id", unique=True)
	await db.products.create_index("category")
	await db.products.create_index("sku", unique=True)
	await db.orders.create_index("id", unique=True)
	await db.orders.create_index("razorpay_order_id")
	await db.orders.create_index([("status", 1), ("reservation_expires_at", 1)])
	await db.campaigns.create_index("discount_code")
	await db.campaigns.create_index("id", unique=True)
	await db.audit_events.create_index("id", unique=True)
	await db.chat_sessions.create_index("id", unique=True)
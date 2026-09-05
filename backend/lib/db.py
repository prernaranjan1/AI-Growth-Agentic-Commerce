import os

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

client = AsyncIOMotorClient(MONGO_URL)
db = client[DATABASE_NAME]


async def ensure_indexes():
	"""Create the indexes required by the API's common queries."""
	await db.products.create_index("id", unique=True)
	await db.products.create_index("category")
	await db.products.create_index("sku", unique=True)
	await db.orders.create_index("id", unique=True)
	await db.campaigns.create_index("id", unique=True)
	await db.audit_events.create_index("id", unique=True)
	await db.chat_sessions.create_index("id", unique=True)
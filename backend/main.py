import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

# =========================================================
# ENVIRONMENT
# =========================================================

ROOT_DIR = Path(__file__).parent

load_dotenv(
    ROOT_DIR / ".env"
)

# =========================================================
# DATABASE
# =========================================================

from lib.db import (
    client,
    db,
    ensure_indexes,
)

# =========================================================
# SUB-ROUTERS
# =========================================================

from routers.catalog import router as catalog_router
from routers.agent import router as agent_router
from routers.orders import router as orders_router
from routers.campaigns import router as campaigns_router
from routers.audit import router as audit_router


# =========================================================
# LOGGING
# =========================================================

logging.basicConfig(
    level=logging.INFO,
    format=(
        "%(asctime)s - "
        "%(name)s - "
        "%(levelname)s - "
        "%(message)s"
    ),
)

logger = logging.getLogger(__name__)


# =========================================================
# STARTUP / SHUTDOWN
# =========================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    logger.info(
        "Starting Nexus AI Commerce API..."
    )

    try:
        # Create MongoDB indexes
        await ensure_indexes()

        logger.info(
            "MongoDB indexes initialized."
        )

        yield

    finally:

        logger.info(
            "Closing MongoDB connection..."
        )

        client.close()

        logger.info(
            "Application shutdown complete."
        )


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title=(
        "Nexus AI Commerce "
        "& Autonomous Merchant Agent API"
    ),
    description=(
        "Conversational Shopping Agent, "
        "Merchant Inventory Management, "
        "AI Campaign Orchestration, "
        "Razorpay Test-Mode Checkout, "
        "and Transparent Agent Audit Ledger."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# =========================================================
# API ROUTER
# =========================================================

api_router = APIRouter(
    prefix="/api"
)


# =========================================================
# ROOT API
# =========================================================

@api_router.get("/")
async def root():

    return {
        "message": (
            "Nexus AI Commerce "
            "& Autonomous Merchant Agent API"
        ),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "healthy",
    }


# =========================================================
# FEATURE ROUTERS
# =========================================================

api_router.include_router(
    catalog_router
)

api_router.include_router(
    agent_router
)

api_router.include_router(
    orders_router
)

api_router.include_router(
    campaigns_router
)

api_router.include_router(
    audit_router
)


# =========================================================
# MOUNT /api
# =========================================================

app.include_router(
    api_router
)


# =========================================================
# CORS
#
# allow_credentials=True can NEVER be safely combined with a
# wildcard origin — browsers won't honor a literal "*" when
# credentials are involved, so CORSMiddleware falls back to
# echoing back whatever Origin header the request sent. That
# means any website can make credentialed requests to this
# API if CORS_ORIGINS isn't explicitly set. Default to a
# closed allow-list (deny by default), not "*".
# =========================================================

cors_origins = os.environ.get(
    "CORS_ORIGINS",
    ""
)

allowed_origins = [
    origin.strip()
    for origin in cors_origins.split(",")
    if origin.strip()
]

if not allowed_origins:
    logger.warning(
        "CORS_ORIGINS is not set — no origins are allowed. "
        "Set it in .env to a comma-separated list of allowed "
        "origins (e.g. https://yourapp.com)."
    )

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
async def health_check():

    return {
        "status": "healthy",
        "service": "nexus-ai-commerce",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# =========================================================
# APPLICATION ENTRY POINT
# =========================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(
            os.environ.get(
                "PORT",
                8000
            )
        ),
        reload=True,
    )
import re
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Literal

from lib.db import db
from models.catalog import Product, ProductCreate, ProductUpdate
from models.audit import AuditEvent


router = APIRouter(
    prefix="/catalog",
    tags=["catalog"]
)


# =========================================================
# GET ALL / SEARCH PRODUCTS
# =========================================================

@router.get("", response_model=List[Product])
async def get_products(
    category: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    search: Optional[str] = Query(None),
    in_stock_only: bool = Query(False),
    featured_only: bool = Query(False),
    sort_by: Optional[Literal["featured", "price_asc", "price_desc", "rating"]] = Query("featured"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    query = {}

    if category and category != "all":
        query["category"] = category

    price_filter = {}

    if min_price is not None:
        price_filter["$gte"] = min_price

    if max_price is not None:
        price_filter["$lte"] = max_price

    if price_filter:
        query["price"] = price_filter

    if in_stock_only:
        query["in_stock"] = True
        query["stock_quantity"] = {"$gt": 0}

    if featured_only:
        query["is_featured"] = True

    # Search (escaped to avoid regex injection / ReDoS)
    if search:
        safe_search = re.escape(search.strip())
        search_regex = {
            "$regex": safe_search,
            "$options": "i"
        }

        query["$or"] = [
            {"name": search_regex},
            {"brand": search_regex},
            {"description": search_regex},
            {"features": search_regex}
        ]

    sort_order = [
        ("is_featured", -1),
        ("rating", -1)
    ]

    if sort_by == "price_asc":
        sort_order = [("price", 1)]
    elif sort_by == "price_desc":
        sort_order = [("price", -1)]
    elif sort_by == "rating":
        sort_order = [("rating", -1)]

    cursor = db.products.find(query).sort(sort_order).skip(skip).limit(limit)
    products_docs = await cursor.to_list(limit)

    return [
        Product(**doc)
        for doc in products_docs
    ]


# =========================================================
# CATALOG STATISTICS
# =========================================================

@router.get("/stats/summary")
async def get_catalog_stats():

    total_skus = await db.products.count_documents({})

    in_stock_count = await db.products.count_documents({
        "in_stock": True,
        "stock_quantity": {"$gt": 0}
    })

    low_stock_count = await db.products.count_documents({
        "stock_quantity": {
            "$gt": 0,
            "$lte": 5
        }
    })

    out_of_stock_count = await db.products.count_documents({
        "$or": [
            {"in_stock": False},
            {"stock_quantity": {"$lte": 0}}
        ]
    })

    categories = await db.products.distinct("category")

    # Total inventory value via aggregation — correct regardless
    # of catalog size, unlike fetching documents into Python
    # with a hardcoded cap.
    pipeline = [
        {
            "$group": {
                "_id": None,
                "total_value": {
                    "$sum": {"$multiply": ["$price", "$stock_quantity"]}
                }
            }
        }
    ]
    agg_result = await db.products.aggregate(pipeline).to_list(1)
    total_val = agg_result[0]["total_value"] if agg_result else 0.0

    return {
        "total_skus": total_skus,
        "in_stock_count": in_stock_count,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "categories": categories,
        "total_inventory_value": round(total_val, 2)
    }


# =========================================================
# GET SINGLE PRODUCT
# =========================================================

@router.get("/{id}", response_model=Product)
async def get_product(id: str):

    doc = await db.products.find_one({"id": id})

    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")

    return Product(**doc)


# =========================================================
# CREATE PRODUCT
# =========================================================

@router.post("", response_model=Product)
async def create_product(payload: ProductCreate):

    discount_pct = 0

    if payload.original_price > payload.price:
        discount_pct = round(
            (
                (payload.original_price - payload.price)
                / payload.original_price
            ) * 100
        )

    product_dict = payload.model_dump()
    product_dict["discount_percent"] = discount_pct
    product_dict["in_stock"] = payload.stock_quantity > 0

    product = Product(**product_dict)

    await db.products.insert_one(product.model_dump())

    audit_evt = AuditEvent(
        event_type="PRODUCT_CREATED",
        title="Merchant Added Product",
        description=(
            f"New SKU created: {product.name} ({product.brand})"
        ),
        details={
            "product_id": product.id,
            "sku": product.sku,
            "price": product.price,
            "stock": product.stock_quantity,
            "category": product.category
        },
        status="success"
    )

    await db.audit_events.insert_one(audit_evt.model_dump())

    return product


# =========================================================
# UPDATE PRODUCT
# =========================================================

@router.put("/{id}", response_model=Product)
async def update_product(id: str, payload: ProductUpdate):

    doc = await db.products.find_one({"id": id})

    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = {
        key: value
        for key, value in payload.model_dump().items()
        if value is not None
    }

    if "price" in update_data or "original_price" in update_data:

        curr_price = update_data.get("price", doc["price"])
        curr_original = update_data.get("original_price", doc["original_price"])

        if curr_original > curr_price:
            update_data["discount_percent"] = round(
                ((curr_original - curr_price) / curr_original) * 100
            )
        else:
            update_data["discount_percent"] = 0

    if "stock_quantity" in update_data:
        update_data["in_stock"] = update_data["stock_quantity"] > 0

    if update_data:
        await db.products.update_one({"id": id}, {"$set": update_data})

    updated_doc = await db.products.find_one({"id": id})

    return Product(**updated_doc)


# =========================================================
# DELETE PRODUCT
# =========================================================

@router.delete("/{id}")
async def delete_product(id: str):

    res = await db.products.delete_one({"id": id})

    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    return {"message": "Product deleted successfully", "id": id}
"""Server-side order pricing.

Every price, discount and total is computed here from the catalog in
MongoDB. Nothing the browser sends about money is trusted.
"""

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional

from fastapi import HTTPException

from lib.db import db
from models.catalog import Product
from models.orders import OrderItem, OrderItemRequest


# Flat saving per cross-sell unit bought together with the product it was
# suggested for (e.g. socks with running shoes).
BUNDLE_DISCOUNT_PER_UNIT = Decimal("150")

# Stock is held while the customer pays, so one order can't hold too much.
MAX_UNITS_PER_ORDER = 20


@dataclass
class PricedOrder:
    items: List[OrderItem]
    subtotal: float
    bundle_discount: float
    promo_code: Optional[str]
    promo_discount: float
    total: float


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _pick_option(
    requested: Optional[str],
    options: List[str],
    label: str,
    product_name: str,
) -> Optional[str]:
    if not options:
        return None

    if requested is None:
        return options[0]

    if requested not in options:
        raise HTTPException(
            status_code=400,
            detail=f"{label} '{requested}' is not available for {product_name}.",
        )

    return requested


async def _load_products(ids: List[str]) -> Dict[str, Product]:
    docs = await db.products.find({"id": {"$in": ids}}).to_list(len(ids))
    return {doc["id"]: Product(**doc) for doc in docs}


async def find_active_campaign(code: str) -> Optional[dict]:
    return await db.campaigns.find_one(
        {"discount_code": code.strip().upper(), "status": "active"}
    )


def merge_lines(requested_items: List[OrderItemRequest]) -> List[OrderItemRequest]:
    """Combine repeated lines so limits and discounts apply per product."""
    merged: Dict[tuple, OrderItemRequest] = {}

    for item in requested_items:
        key = (item.product_id, item.size, item.color, item.is_upsell)
        if key in merged:
            merged[key] = merged[key].model_copy(
                update={"quantity": merged[key].quantity + item.quantity}
            )
        else:
            merged[key] = item

    return list(merged.values())


def bundle_saving_for(upsell: Product, anchor: Product) -> float:
    """Saving per unit when `upsell` is bought with `anchor` (0 if not linked)."""
    if upsell.id not in anchor.upsell_product_ids:
        return 0.0
    return float(min(BUNDLE_DISCOUNT_PER_UNIT, Decimal(str(upsell.price))))


async def price_order(
    requested_items: List[OrderItemRequest],
    promo_code: Optional[str] = None,
) -> PricedOrder:
    requested_items = merge_lines(requested_items)

    if sum(item.quantity for item in requested_items) > MAX_UNITS_PER_ORDER:
        raise HTTPException(
            status_code=400,
            detail=f"An order can hold at most {MAX_UNITS_PER_ORDER} units.",
        )

    products = await _load_products(
        list({item.product_id for item in requested_items})
    )

    items: List[OrderItem] = []

    for req in requested_items:
        product = products.get(req.product_id)

        if product is None:
            raise HTTPException(
                status_code=400,
                detail=f"Product {req.product_id} does not exist.",
            )

        if not product.in_stock or product.stock_quantity < req.quantity:
            raise HTTPException(
                status_code=409,
                detail=f"{product.name} does not have enough stock.",
            )

        items.append(
            OrderItem(
                product_id=product.id,
                name=product.name,
                brand=product.brand,
                category=product.category,
                price=product.price,
                original_price=product.original_price,
                quantity=req.quantity,
                size=_pick_option(req.size, product.sizes, "Size", product.name),
                color=_pick_option(req.color, product.colors, "Colour", product.name),
                is_upsell=req.is_upsell,
                image_url=product.image_url,
            )
        )

    subtotal = sum(
        (Decimal(str(i.price)) * i.quantity for i in items), Decimal("0")
    )

    # ---------------------------------------------------------
    # Bundle discount: an upsell earns the saving only when the
    # product it was suggested for is in the same order, one
    # discounted unit per anchor unit, never more than its price.
    # ---------------------------------------------------------

    bundle = Decimal("0")
    anchors = [i for i in items if not i.is_upsell]

    upsell_units: Dict[str, int] = {}
    for item in items:
        if item.is_upsell:
            upsell_units[item.product_id] = upsell_units.get(item.product_id, 0) + item.quantity

    # Each upsell product earns at most one discounted unit per unit of
    # the anchor products it is linked to, however the lines are split.
    for product_id, units in upsell_units.items():
        anchor_units = sum(
            a.quantity
            for a in anchors
            if product_id in products[a.product_id].upsell_product_ids
        )

        eligible_units = min(units, anchor_units)
        per_unit = min(BUNDLE_DISCOUNT_PER_UNIT, Decimal(str(products[product_id].price)))
        bundle += per_unit * eligible_units

    # ---------------------------------------------------------
    # Promo code from an active campaign, applied to items in
    # the campaign's target category.
    # ---------------------------------------------------------

    promo = Decimal("0")
    normalized_code: Optional[str] = None

    if promo_code and promo_code.strip():
        campaign = await find_active_campaign(promo_code)

        if campaign is None:
            raise HTTPException(
                status_code=400,
                detail="Promo code is not valid or the campaign is not active.",
            )

        normalized_code = campaign["discount_code"]
        percent = Decimal(str(campaign.get("discount_percent", 0))) / 100
        target = campaign.get("target_category")

        eligible = sum(
            (
                Decimal(str(i.price)) * i.quantity
                for i in items
                if target in (None, "all") or i.category == target
            ),
            Decimal("0"),
        )

        if eligible == 0:
            raise HTTPException(
                status_code=400,
                detail=f"Promo code {normalized_code} only applies to {target} items.",
            )

        promo = eligible * percent

    bundle = _money(bundle)
    promo = _money(promo)
    total = _money(max(Decimal("0"), subtotal - bundle - promo))

    return PricedOrder(
        items=items,
        subtotal=float(_money(subtotal)),
        bundle_discount=float(bundle),
        promo_code=normalized_code,
        promo_discount=float(promo),
        total=float(total),
    )

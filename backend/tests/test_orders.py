import json

from conftest import CUSTOMER, MERCHANT, sign, sign_webhook

from lib.db import db


SHOE = "prod-shoe-velocity-01"      # ₹2,499, upsells: socks, spray, bottle
SOCKS = "prod-acc-socks-01"         # ₹499
WATCH = "prod-watch-pulse-01"       # ₹2,999, upsell: bottle only


async def stock(product_id: str) -> int:
    return (await db.products.find_one({"id": product_id}))["stock_quantity"]


async def create(api, items, **extra):
    return await api.post("/api/orders", json={**CUSTOMER, "items": items, **extra})


async def test_client_prices_and_discounts_are_ignored(api, fake_razorpay):
    response = await create(
        api,
        [{"product_id": SHOE, "quantity": 1, "price": 1, "name": "Free shoe"}],
        bundle_discount=5000,
    )

    assert response.status_code == 200
    order = response.json()
    assert order["subtotal"] == 2499
    assert order["bundle_discount"] == 0
    assert order["total_amount"] == 2499
    assert order["items"][0]["name"] == "Velocity Nitro Runner X"
    assert fake_razorpay.orders[order["razorpay_order_id"]]["amount"] == 249900


async def test_bundle_discount_needs_the_anchor_product(api, fake_razorpay):
    with_anchor = await create(
        api,
        [
            {"product_id": SHOE, "quantity": 1},
            {"product_id": SOCKS, "quantity": 1, "is_upsell": True},
        ],
    )
    assert with_anchor.json()["bundle_discount"] == 150
    assert with_anchor.json()["total_amount"] == 2499 + 499 - 150

    # Socks marked as an upsell without the shoe they belong to.
    alone = await create(api, [{"product_id": SOCKS, "quantity": 3, "is_upsell": True}])
    assert alone.json()["bundle_discount"] == 0

    # Watch's upsell list doesn't include socks.
    unrelated = await create(
        api,
        [
            {"product_id": WATCH, "quantity": 1},
            {"product_id": SOCKS, "quantity": 1, "is_upsell": True},
        ],
    )
    assert unrelated.json()["bundle_discount"] == 0


async def test_promo_code_requires_active_campaign(api, fake_razorpay):
    ok = await create(api, [{"product_id": SHOE, "quantity": 1}], promo_code="runfast15")
    assert ok.status_code == 200
    assert ok.json()["promo_code"] == "RUNFAST15"
    assert ok.json()["promo_discount"] == 374.85  # 15% of 2,499

    wrong_category = await create(api, [{"product_id": WATCH, "quantity": 1}], promo_code="RUNFAST15")
    assert wrong_category.status_code == 400

    await db.campaigns.update_one({"discount_code": "RUNFAST15"}, {"$set": {"status": "paused"}})
    paused = await create(api, [{"product_id": SHOE, "quantity": 1}], promo_code="RUNFAST15")
    assert paused.status_code == 400


async def test_stock_is_reserved_and_cannot_be_oversold(api, fake_razorpay):
    carbon = "prod-shoe-carbon-05"
    await db.products.update_one({"id": carbon}, {"$set": {"stock_quantity": 1}})

    first = await create(api, [{"product_id": carbon, "quantity": 1}])
    assert first.status_code == 200
    assert await stock(carbon) == 0

    second = await create(api, [{"product_id": carbon, "quantity": 1}])
    assert second.status_code == 409


async def test_failed_reservation_rolls_back_earlier_lines(api, fake_razorpay):
    await db.products.update_one({"id": SOCKS}, {"$set": {"stock_quantity": 1}})
    before = await stock(SHOE)

    response = await create(
        api,
        [{"product_id": SHOE, "quantity": 1}, {"product_id": SOCKS, "quantity": 2}],
    )

    assert response.status_code == 409
    assert await stock(SHOE) == before


async def test_verify_payment_marks_paid_once_with_real_method(api, fake_razorpay):
    before = await stock(SHOE)
    order = (await create(api, [{"product_id": SHOE, "quantity": 2}])).json()
    assert await stock(SHOE) == before - 2

    fake_razorpay.add_payment("pay_1", order["razorpay_order_id"], 499800, method="netbanking")
    body = {
        "razorpay_order_id": order["razorpay_order_id"],
        "razorpay_payment_id": "pay_1",
        "razorpay_signature": sign(order["razorpay_order_id"], "pay_1"),
    }

    paid = await api.post(f"/api/orders/{order['id']}/verify-payment", json=body)
    assert paid.status_code == 200
    assert paid.json()["status"] == "paid"
    assert paid.json()["payment_method"] == "netbanking"

    # Replaying the callback doesn't deduct stock again.
    again = await api.post(f"/api/orders/{order['id']}/verify-payment", json=body)
    assert again.json()["status"] == "paid"
    assert await stock(SHOE) == before - 2


async def test_bad_signature_does_not_change_the_order(api, fake_razorpay):
    order = (await create(api, [{"product_id": SHOE, "quantity": 1}])).json()

    response = await api.post(
        f"/api/orders/{order['id']}/verify-payment",
        json={
            "razorpay_order_id": order["razorpay_order_id"],
            "razorpay_payment_id": "pay_forged",
            "razorpay_signature": "0" * 64,
        },
    )

    assert response.status_code == 400
    stored = await db.orders.find_one({"id": order["id"]})
    assert stored["status"] == "created"
    assert stored["stock_reserved"] is True


async def test_payment_amount_must_match(api, fake_razorpay):
    order = (await create(api, [{"product_id": SHOE, "quantity": 1}])).json()
    fake_razorpay.add_payment("pay_2", order["razorpay_order_id"], 100)

    response = await api.post(
        f"/api/orders/{order['id']}/verify-payment",
        json={
            "razorpay_order_id": order["razorpay_order_id"],
            "razorpay_payment_id": "pay_2",
            "razorpay_signature": sign(order["razorpay_order_id"], "pay_2"),
        },
    )

    assert response.status_code == 400


async def test_expired_reservation_releases_stock(api, fake_razorpay):
    from datetime import datetime, timedelta, timezone

    from lib.inventory import release_expired_reservations

    before = await stock(SHOE)
    order = (await create(api, [{"product_id": SHOE, "quantity": 3}])).json()
    await db.orders.update_one(
        {"id": order["id"]},
        {"$set": {"reservation_expires_at": datetime.now(timezone.utc) - timedelta(minutes=1)}},
    )

    assert await release_expired_reservations() == 1
    assert await stock(SHOE) == before
    assert (await db.orders.find_one({"id": order["id"]}))["status"] == "expired"

    # Running again releases nothing twice.
    assert await release_expired_reservations() == 0
    assert await stock(SHOE) == before


async def test_webhook_marks_order_paid(api, fake_razorpay):
    order = (await create(api, [{"product_id": SHOE, "quantity": 1}])).json()

    body = json.dumps(
        {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_hook",
                        "order_id": order["razorpay_order_id"],
                        "amount": 249900,
                        "method": "upi",
                        "vpa": "test@upi",
                        "status": "captured",
                    }
                }
            },
        }
    ).encode()

    bad = await api.post(
        "/api/orders/webhook/razorpay",
        content=body,
        headers={"X-Razorpay-Signature": "nope"},
    )
    assert bad.status_code == 400

    good = await api.post(
        "/api/orders/webhook/razorpay",
        content=body,
        headers={"X-Razorpay-Signature": sign_webhook(body)},
    )
    assert good.status_code == 200

    stored = await db.orders.find_one({"id": order["id"]})
    assert stored["status"] == "paid"
    assert stored["payment_method"] == "upi"


async def test_orders_list_requires_merchant_key(api):
    assert (await api.get("/api/orders")).status_code == 401
    assert (await api.get("/api/orders", headers={"X-Merchant-Key": "wrong"})).status_code == 401
    assert (await api.get("/api/orders", headers=MERCHANT)).status_code == 200


async def test_duplicate_upsell_lines_cannot_stack_the_bundle_saving(api, fake_razorpay):
    response = await create(
        api,
        [{"product_id": SHOE, "quantity": 1}]
        + [{"product_id": SOCKS, "quantity": 1, "is_upsell": True}] * 5,
    )

    assert response.status_code == 200
    order = response.json()
    assert order["bundle_discount"] == 150
    assert [i["quantity"] for i in order["items"]] == [1, 5]


async def test_order_unit_cap_covers_split_lines(api, fake_razorpay):
    response = await create(api, [{"product_id": SHOE, "quantity": 10}] * 3)
    assert response.status_code == 400


async def test_release_does_not_relist_a_product_the_merchant_took_off_sale(api, fake_razorpay):
    from datetime import datetime, timedelta, timezone

    from lib.inventory import release_expired_reservations

    order = (await create(api, [{"product_id": SHOE, "quantity": 1}])).json()

    await api.put(f"/api/catalog/{SHOE}", json={"in_stock": False}, headers=MERCHANT)
    await db.orders.update_one(
        {"id": order["id"]},
        {"$set": {"reservation_expires_at": datetime.now(timezone.utc) - timedelta(minutes=1)}},
    )
    await release_expired_reservations()

    assert (await db.products.find_one({"id": SHOE}))["in_stock"] is False


async def test_release_relists_a_product_a_reservation_sold_out(api, fake_razorpay):
    from datetime import datetime, timedelta, timezone

    from lib.inventory import release_expired_reservations

    await db.products.update_one({"id": SHOE}, {"$set": {"stock_quantity": 1}})
    order = (await create(api, [{"product_id": SHOE, "quantity": 1}])).json()
    assert (await db.products.find_one({"id": SHOE}))["in_stock"] is False

    await db.orders.update_one(
        {"id": order["id"]},
        {"$set": {"reservation_expires_at": datetime.now(timezone.utc) - timedelta(minutes=1)}},
    )
    await release_expired_reservations()

    product = await db.products.find_one({"id": SHOE})
    assert product["in_stock"] is True
    assert product["stock_quantity"] == 1


async def test_paid_order_details_need_a_valid_signature(api, fake_razorpay):
    order = (await create(api, [{"product_id": SHOE, "quantity": 1}])).json()
    await db.orders.update_one({"id": order["id"]}, {"$set": {"status": "paid"}})

    response = await api.post(
        f"/api/orders/{order['id']}/verify-payment",
        json={
            "razorpay_order_id": order["razorpay_order_id"],
            "razorpay_payment_id": "pay_x",
            "razorpay_signature": "0" * 64,
        },
    )

    assert response.status_code == 400
    assert "customer_email" not in response.text


async def test_manual_campaign_code_applies_to_all_categories_by_default(api, fake_razorpay):
    created = await api.post(
        "/api/campaigns",
        json={
            "title": "Watch week",
            "goal": "flash_sale",
            "target_audience": "Everyone",
            "channels": ["sms"],
            "whatsapp_copy": "-",
            "sms_copy": "-",
            "discount_code": "watch10",
            "discount_percent": 10,
        },
        headers=MERCHANT,
    )
    assert created.status_code == 200
    code = created.json()["discount_code"]
    await api.patch(f"/api/campaigns/{created.json()['id']}/status?status=active", headers=MERCHANT)

    response = await create(api, [{"product_id": WATCH, "quantity": 1}], promo_code=code)
    assert response.status_code == 200
    assert response.json()["promo_discount"] == 299.9

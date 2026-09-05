import asyncio
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from pathlib import Path

# Load .env before importing database settings
load_dotenv(Path(__file__).parent / ".env")

from lib.db import db, ensure_indexes
from models.catalog import Product
from models.orders import Order, OrderItem, Address
from models.campaigns import Campaign, CampaignMetrics
from models.audit import AuditEvent
from models.agent import AgentReasoningStep


def _now():
    return datetime.now(timezone.utc)


# ============================================================
# SEED DATA
# ============================================================

async def seed_data():
    print("🚀 Starting seed script for Nexus AI Commerce...")

    await ensure_indexes()

    # 1. Clean existing collections
    await db.products.delete_many({})
    await db.orders.delete_many({})
    await db.campaigns.delete_many({})
    await db.audit_events.delete_many({})
    await db.chat_sessions.delete_many({})

    # ========================================================
    # 2. PRODUCT CATALOG
    # ========================================================

    IMG_SHOE_1 = "https://images.unsplash.com/photo-1726133731483-d4b8bcabeb43?crop=entropy&cs=srgb&fm=jpg&q=85"
    IMG_SHOE_2 = "https://images.unsplash.com/photo-1637437757614-6491c8e915b5?crop=entropy&cs=srgb&fm=jpg&q=85"
    IMG_SHOE_3 = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?crop=entropy&cs=srgb&fm=jpg&q=85"
    IMG_SHOE_4 = "https://images.unsplash.com/photo-1608231387042-66d1773070a5?crop=entropy&cs=srgb&fm=jpg&q=85"
    IMG_SHOE_5 = "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?crop=entropy&cs=srgb&fm=jpg&q=85"
    IMG_SOCKS = "https://images.unsplash.com/photo-1554139897-afbea21ce34a?crop=entropy&cs=srgb&fm=jpg&q=85"
    IMG_BOTTLE = "https://images.unsplash.com/photo-1601937286283-1c4550e05f58?crop=entropy&cs=srgb&fm=jpg&q=85"
    IMG_WATCH_1 = "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?crop=entropy&cs=srgb&fm=jpg&q=85"
    IMG_WATCH_2 = "https://images.unsplash.com/photo-1544117519-31a4b719223d?crop=entropy&cs=srgb&fm=jpg&q=85"
    IMG_HEADPHONES = "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?crop=entropy&cs=srgb&fm=jpg&q=85"
    IMG_EARBUDS = "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?crop=entropy&cs=srgb&fm=jpg&q=85"
    IMG_CARE_SPRAY = "https://images.unsplash.com/photo-1595909315417-2edd382a56dc?crop=entropy&cs=srgb&fm=jpg&q=85"

    # Define accessory IDs first so shoes can reference them as upsells
    socks_id = "prod-acc-socks-01"
    bottle_id = "prod-acc-bottle-01"
    spray_id = "prod-acc-spray-01"

    accessories = [
        Product(
            id=socks_id,
            name="Pro Dri-Fit Anti-Blister Running Socks (3-Pack)",
            brand="AeroFit",
            category="accessories",
            price=499.0,
            original_price=799.0,
            discount_percent=37,
            rating=4.8,
            reviews_count=320,
            in_stock=True,
            stock_quantity=45,
            sizes=["Free Size (UK 6-11)"],
            colors=["White/Black", "Neon Multi"],
            image_url=IMG_SOCKS,
            description="High-density arch compression with sweat-wicking microfibers. Prevents friction blisters during long distance running.",
            features=[
                "Seamless Toe Construction",
                "Breathable Mesh Top",
                "Targeted Arch Support",
                "Anti-Odor Silver Tech",
            ],
            is_featured=True,
            sku="SKU-ACC-SOCK-01",
        ),
        Product(
            id=bottle_id,
            name="HydroSteel 750ml Insulated Sports Gym Flask",
            brand="ThermoPro",
            category="accessories",
            price=599.0,
            original_price=999.0,
            discount_percent=40,
            rating=4.7,
            reviews_count=210,
            in_stock=True,
            stock_quantity=38,
            sizes=["750ml"],
            colors=["Matte Black", "Brushed Silver", "Midnight Blue"],
            image_url=IMG_BOTTLE,
            description="Double-wall vacuum insulation keeps liquids ice-cold for 24 hours. Leakproof flip straw cap designed for runners.",
            features=[
                "18/8 Food Grade Stainless Steel",
                "24h Cold / 12h Hot",
                "Sweat-Free Exterior",
                "Carabiner Carry Loop",
            ],
            is_featured=False,
            sku="SKU-ACC-BOT-02",
        ),
        Product(
            id=spray_id,
            name="Sneaker Shield Waterproof & Dirt Repellent Spray",
            brand="KicksGuard",
            category="accessories",
            price=399.0,
            original_price=599.0,
            discount_percent=33,
            rating=4.6,
            reviews_count=180,
            in_stock=True,
            stock_quantity=60,
            sizes=["200ml"],
            colors=["Clear"],
            image_url=IMG_CARE_SPRAY,
            description="Nano-hydrophobic formula creates an invisible protective barrier against mud, water, rain, and street grime.",
            features=[
                "Invisible Breathable Coating",
                "Safe on Knit & Suede",
                "Up to 30 Days Protection",
                "Fast 15-min Drying",
            ],
            is_featured=False,
            sku="SKU-ACC-SPRY-03",
        ),
    ]

    shoes = [
        Product(
            id="prod-shoe-velocity-01",
            name="Velocity Nitro Runner X",
            brand="Puma Pro",
            category="footwear",
            price=2499.0,
            original_price=3999.0,
            discount_percent=37,
            rating=4.8,
            reviews_count=450,
            in_stock=True,
            stock_quantity=42,
            sizes=["UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
            colors=["Obsidian Black / Solar Lime", "Pure White / Electric Blue"],
            image_url=IMG_SHOE_1,
            description="Engineered for high energy return and daily road running. Nitrogen-infused foam midsole delivers plush shock absorption under ₹3k.",
            features=[
                "Nitro-Infused Responsive Cushion",
                "Ultra-Lightweight Engineered Mesh (225g)",
                "PUMAGRIP High Traction Outsole",
                "Anatomical Heel Flare",
            ],
            upsell_product_ids=[socks_id, spray_id, bottle_id],
            is_featured=True,
            sku="SKU-RUN-VEL-01",
        ),
        Product(
            id="prod-shoe-airglide-02",
            name="AirGlide HyperStride 2.0",
            brand="Nike Athletics",
            category="footwear",
            price=2899.0,
            original_price=4499.0,
            discount_percent=35,
            rating=4.7,
            reviews_count=380,
            in_stock=True,
            stock_quantity=28,
            sizes=["UK 6", "UK 7", "UK 8", "UK 9", "UK 10"],
            colors=["Slate Gray / Hyper Crimson", "Triple Black"],
            image_url=IMG_SHOE_2,
            description="Max-cushion road running shoe designed for long marathon training. Dual-density foam absorbs heel strikes with seamless comfort.",
            features=[
                "Dual Density Cloudfoam",
                "Wider Toe Box for Natural Splay",
                "Abrasion-Resistant Bumper",
                "Padded Heel Collar",
            ],
            upsell_product_ids=[socks_id, bottle_id],
            is_featured=True,
            sku="SKU-RUN-AIR-02",
        ),
        Product(
            id="prod-shoe-aeropace-03",
            name="AeroPace Featherweight 5K",
            brand="Campus Active",
            category="footwear",
            price=1899.0,
            original_price=2999.0,
            discount_percent=36,
            rating=4.5,
            reviews_count=520,
            in_stock=True,
            stock_quantity=35,
            sizes=["UK 7", "UK 8", "UK 9", "UK 10"],
            colors=["Cobalt Blue", "Jet Black / White"],
            image_url=IMG_SHOE_3,
            description="Ultra-budget performance shoe with high flex grooves. Ideal for beginner joggers, gym workouts, and daily 5,000 step routines.",
            features=[
                "Phylon Shock-Absorbing Base",
                "Breathable Knitted Upper",
                "Memory Tech Insole",
                "Featherlight 190g Weight",
            ],
            upsell_product_ids=[socks_id, spray_id],
            is_featured=False,
            sku="SKU-RUN-AERO-03",
        ),
        Product(
            id="prod-shoe-trailblaze-04",
            name="TrailBlaze All-Terrain Gripper",
            brand="Sparx Performance",
            category="footwear",
            price=2299.0,
            original_price=3499.0,
            discount_percent=34,
            rating=4.6,
            reviews_count=290,
            in_stock=True,
            stock_quantity=18,
            sizes=["UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
            colors=["Olive Green / Camo", "Stealth Charcoal"],
            image_url=IMG_SHOE_4,
            description="Deep multi-directional lugged outsole designed for trail running, uneven roads, and monsoon asphalt grip.",
            features=[
                "Aggressive 4mm Rubber Lugs",
                "Reinforced Mudguard & Toe Cap",
                "Quick-Dry Mesh Liner",
                "Gusseted Tongue to keep debris out",
            ],
            upsell_product_ids=[spray_id, socks_id],
            is_featured=False,
            sku="SKU-RUN-TRL-04",
        ),
        Product(
            id="prod-shoe-carbon-05",
            name="Apex CarbonFly Elite Marathoner",
            brand="ProStrike",
            category="footwear",
            price=4299.0,
            original_price=6999.0,
            discount_percent=38,
            rating=4.9,
            reviews_count=140,
            in_stock=True,
            stock_quantity=12,
            sizes=["UK 8", "UK 9", "UK 10"],
            colors=["Neon Volt / Laser Fuchsia"],
            image_url=IMG_SHOE_5,
            description="Full-length carbon fiber propulsion plate with PEBA foam for sub-4 hour marathon racers seeking maximum energy return.",
            features=[
                "Full-Length Carbon Fiber Plate",
                "Ultra-light PEBA Foam",
                "Race-Day Translucent Upper",
                "Curved Rocker Geometry",
            ],
            upsell_product_ids=[socks_id, bottle_id],
            is_featured=False,
            sku="SKU-RUN-CARB-05",
        ),
    ]

    tech_products = [
        Product(
            id="prod-watch-pulse-01",
            name="PulseFit Pro AMOLED Smartwatch",
            brand="Noise Tech",
            category="smartwatch",
            price=2999.0,
            original_price=5999.0,
            discount_percent=50,
            rating=4.7,
            reviews_count=610,
            in_stock=True,
            stock_quantity=32,
            sizes=["44mm Dial"],
            colors=["Space Gray", "Champagne Gold", "Stealth Black"],
            image_url=IMG_WATCH_1,
            description="1.43'' Super AMOLED Always-On Display with 24/7 heart rate, SpO2 blood oxygen, and 100+ dedicated sports tracking modes.",
            features=[
                "1.43 inch AMOLED Display (60Hz)",
                "Continuous Heart Rate & SpO2",
                "Bluetooth Calling with Noise Cancelling Mic",
                "7-Day Battery Life",
            ],
            upsell_product_ids=[bottle_id],
            is_featured=True,
            sku="SKU-WTCH-PULS-01",
        ),
        Product(
            id="prod-watch-aerosync-02",
            name="AeroSync Active GPS Sport Tracker",
            brand="Fastrack Pulse",
            category="smartwatch",
            price=3799.0,
            original_price=6499.0,
            discount_percent=41,
            rating=4.6,
            reviews_count=340,
            in_stock=True,
            stock_quantity=20,
            sizes=["46mm Rugged"],
            colors=["Military Green", "Tough Black"],
            image_url=IMG_WATCH_2,
            description="Built-in standalone GPS for route mapping without phone. 5ATM water resistant with running cadence and VO2 max analysis.",
            features=[
                "Standalone Dual-Band GPS",
                "5ATM Water Resistance (50m)",
                "VO2 Max & Training Load Metrics",
                "10-Day Battery",
            ],
            upsell_product_ids=[socks_id, bottle_id],
            is_featured=False,
            sku="SKU-WTCH-AERO-02",
        ),
        Product(
            id="prod-audio-soundwave-01",
            name="SoundWave Active ANC Wireless Headphones",
            brand="boAt Nirvana",
            category="electronics",
            price=2899.0,
            original_price=4999.0,
            discount_percent=42,
            rating=4.8,
            reviews_count=420,
            in_stock=True,
            stock_quantity=22,
            sizes=["Over-Ear Adjustable"],
            colors=["Matte Black", "Silver Ash"],
            image_url=IMG_HEADPHONES,
            description="Hybrid Active Noise Cancellation blocks out gym clatter and traffic. 40mm titanium drivers deliver punchy bass with 50-hour playback.",
            features=[
                "Hybrid ANC (-32dB)",
                "50-Hour Playtime with Fast Charge",
                "Low-Latency Beast Mode",
                "Memory Foam Plush Ear Cushions",
            ],
            upsell_product_ids=[bottle_id],
            is_featured=True,
            sku="SKU-AUD-SND-01",
        ),
        Product(
            id="prod-audio-bassbuds-02",
            name="BassBuds Pro TWS Earbuds",
            brand="AeroAudio",
            category="electronics",
            price=1499.0,
            original_price=2999.0,
            discount_percent=50,
            rating=4.5,
            reviews_count=580,
            in_stock=True,
            stock_quantity=30,
            sizes=["In-Ear Ergonomic"],
            colors=["Carbon Black", "Frost White"],
            image_url=IMG_EARBUDS,
            description="IPX5 sweat-proof Bluetooth 5.3 earbuds designed for runners. Ergonomic wingtips ensure zero fallout during sprints.",
            features=[
                "IPX5 Sweat & Rain Resistance",
                "Quad-Mic ENC for Clear Calls",
                "36-Hour Total Playback",
                "Instant Touch Controls",
            ],
            upsell_product_ids=[socks_id, bottle_id],
            is_featured=False,
            sku="SKU-AUD-BUD-02",
        ),
    ]

    all_products = accessories + shoes + tech_products

    for product in all_products:
        await db.products.insert_one(product.model_dump())

    print(f"✅ Seeded {len(all_products)} catalog products.")

    # ========================================================
    # 3. SAMPLE COMPLETED ORDERS
    # ========================================================

    sample_orders = [
        Order(
            id="ORD-20260315-A8F291",
            razorpay_order_id="order_rp_8192a091bf2841",
            razorpay_payment_id="pay_91fa8201bc8271",
            customer_name="Aarav Sharma",
            customer_email="aarav.sharma@example.com",
            customer_phone="+91 98765 43210",
            shipping_address=Address(
                name="Aarav Sharma",
                phone="+91 98765 43210",
                address_line="Flat 402, Greenfield Heights, Indiranagar",
                city="Bengaluru",
                state="Karnataka",
                pincode="560038",
            ),
            items=[
                OrderItem(
                    product_id="prod-shoe-velocity-01",
                    name="Velocity Nitro Runner X",
                    brand="Puma Pro",
                    price=2499.0,
                    original_price=3999.0,
                    quantity=1,
                    size="UK 9",
                    color="Obsidian Black / Solar Lime",
                    is_upsell=False,
                    image_url=IMG_SHOE_1,
                ),
                OrderItem(
                    product_id=socks_id,
                    name="Pro Dri-Fit Anti-Blister Running Socks (3-Pack)",
                    brand="AeroFit",
                    price=499.0,
                    original_price=799.0,
                    quantity=1,
                    size="Free Size (UK 6-11)",
                    color="White/Black",
                    is_upsell=True,
                    image_url=IMG_SOCKS,
                ),
            ],
            subtotal=2998.0,
            bundle_discount=200.0,
            tax=0.0,
            total_amount=2798.0,
            currency="INR",
            status="paid",
            payment_method="upi",
            payment_details={
                "upi_vpa": "aarav@okhdfcbank",
                "bank_name": "HDFC Bank",
                "status": "authorized",
            },
            agent_thought_snapshot=AgentReasoningStep(
                intent_summary="Intent: Find high-performance running shoes under ₹3,000",
                budget_extracted=3000.0,
                category_extracted="footwear",
                catalog_matches_found=4,
                inventory_status="42 units in stock at South Hub Warehouse",
                recommendation_rationale="Recommended Velocity Nitro Runner X at ₹2,499 - high responsive cushioning for 5k/10k road training",
                upsell_strategy="Cross-sold Pro Dri-Fit 3-Pack socks with ₹200 bundle savings",
                execution_time_ms=132,
                confidence_score=0.98,
            ),
            created_at=_now() - timedelta(hours=3),
            paid_at=_now() - timedelta(hours=3, minutes=1),
        ),
        Order(
            id="ORD-20260315-B9E412",
            razorpay_order_id="order_rp_7721cc83ab9123",
            razorpay_payment_id="pay_88bb9123df1290",
            customer_name="Priya Patel",
            customer_email="priya.patel@example.com",
            customer_phone="+91 91234 56789",
            shipping_address=Address(
                name="Priya Patel",
                phone="+91 91234 56789",
                address_line="12B, Palm Grove Residency, Powai",
                city="Mumbai",
                state="Maharashtra",
                pincode="400076",
            ),
            items=[
                OrderItem(
                    product_id="prod-shoe-airglide-02",
                    name="AirGlide HyperStride 2.0",
                    brand="Nike Athletics",
                    price=2899.0,
                    original_price=4499.0,
                    quantity=1,
                    size="UK 7",
                    color="Slate Gray / Hyper Crimson",
                    image_url=IMG_SHOE_2,
                )
            ],
            subtotal=2899.0,
            bundle_discount=0.0,
            tax=0.0,
            total_amount=2899.0,
            currency="INR",
            status="paid",
            payment_method="card",
            payment_details={
                "card_last4": "4242",
                "card_brand": "Visa",
                "auth_code": "AUTH_9921",
            },
            agent_thought_snapshot=AgentReasoningStep(
                intent_summary="Intent: Max cushion running shoe below ₹3,000",
                budget_extracted=3000.0,
                category_extracted="footwear",
                catalog_matches_found=3,
                inventory_status="28 units available in stock",
                recommendation_rationale="Matched AirGlide HyperStride 2.0 at ₹2,899 for superior joint shock absorption",
                upsell_strategy="User declined accessories bundle",
                execution_time_ms=118,
                confidence_score=0.96,
            ),
            created_at=_now() - timedelta(hours=8),
            paid_at=_now() - timedelta(hours=8, minutes=2),
        ),
    ]

    for order in sample_orders:
        await db.orders.insert_one(order.model_dump())

    print(f"✅ Seeded {len(sample_orders)} sample paid orders.")

    # ========================================================
    # 4. MARKETING CAMPAIGNS
    # ========================================================

    sample_campaigns = [
        Campaign(
            id="CMP-RUN3K-01",
            title="🏃‍♂️ Monsoon Runner Clearance: Sub-₹3k Footwear Blitz",
            goal="clearance",
            target_audience="Marathon runners, morning joggers, and budget athletes (Mumbai, Bengaluru, Pune)",
            status="active",
            channels=["whatsapp", "sms", "email"],
            whatsapp_copy=(
                "⚡ *Level Up Your Stride with Top Running Shoes Under ₹3,000!* 👟\n\n"
                "Get an extra 15% OFF on Velocity Nitro & AirGlide Pro with free running socks.\n\n"
                "🎟️ Code: *RUNFAST15*\n"
                "👉 Shop Now: https://nexus-shop.in/c/runfast15"
            ),
            sms_copy="Nexus AI Alert: Get top-rated running shoes under ₹3,000 + Extra 15% OFF with code RUNFAST15.",
            discount_code="RUNFAST15",
            discount_percent=15,
            forecasted_roi="4.8x ROAS | Est. 210 Orders | ₹5.2L Projected GMV",
            target_category="footwear",
            created_by_agent=True,
            metrics=CampaignMetrics(
                sent_count=2450,
                clicks=580,
                orders_generated=52,
                revenue_generated=138400.0,
                conversion_rate=9.0,
            ),
            created_at=_now() - timedelta(days=1),
        ),
        Campaign(
            id="CMP-TECH-02",
            title="⌚ Smartwatch & Audio Workout Essentials Boost",
            goal="cross_sell_boost",
            target_audience="Wearable tech enthusiasts, gym goers, and music lovers",
            status="active",
            channels=["whatsapp", "sms"],
            whatsapp_copy=(
                "🔥 *Tech Upgrade for Your Workouts!* 🎧\n\n"
                "Track your pulse & smash your goals with Noise AMOLED Smartwatches & ANC Headphones starting at ₹2,899.\n\n"
                "🎟️ Code: *FITTECH20*\n"
                "👉 Link: https://nexus-shop.in/c/fittech20"
            ),
            sms_copy="Nexus Deal: Noise AMOLED Smartwatches & ANC Audio starting at ₹2,899. Use code FITTECH20.",
            discount_code="FITTECH20",
            discount_percent=20,
            forecasted_roi="3.9x ROAS | Est. 140 Orders | ₹3.6L Projected GMV",
            target_category="smartwatch",
            created_by_agent=True,
            metrics=CampaignMetrics(
                sent_count=1800,
                clicks=390,
                orders_generated=34,
                revenue_generated=98600.0,
                conversion_rate=8.7,
            ),
            created_at=_now() - timedelta(days=3),
        ),
    ]

    for campaign in sample_campaigns:
        await db.campaigns.insert_one(campaign.model_dump())

    print(f"✅ Seeded {len(sample_campaigns)} marketing campaigns.")

    # ========================================================
    # 5. AUDIT TRAIL
    # ========================================================

    sample_audit = [
        AuditEvent(
            id="AUD-INT-9901",
            event_type="INTENT_PARSED",
            title="Natural Language Query Parsed",
            description="User intent recognized: 'I need running shoes under ₹3,000'",
            details={
                "budget": 3000,
                "category": "footwear",
                "intent": "purchase_intent",
            },
            status="success",
            latency_ms=85,
            created_at=_now() - timedelta(hours=3, minutes=5),
        ),
        AuditEvent(
            id="AUD-INV-9902",
            event_type="INVENTORY_CHECK",
            title="Warehouse Stock Verified",
            description="SKU-RUN-VEL-01 verified in live warehouse: 42 units available in stock",
            details={
                "sku": "SKU-RUN-VEL-01",
                "stock_qty": 42,
                "warehouse": "South Hub",
            },
            status="success",
            latency_ms=28,
            created_at=_now() - timedelta(hours=3, minutes=3),
        ),
        AuditEvent(
            id="AUD-REC-9904",
            event_type="PRODUCT_RECOMMENDED",
            title="AI Recommendation Card Dispatched",
            description="Delivered Velocity Nitro Runner X with comparative analysis vs AirGlide HyperStride",
            details={
                "primary_id": "prod-shoe-velocity-01",
                "confidence": 0.98,
            },
            status="success",
            latency_ms=132,
            created_at=_now() - timedelta(hours=3, minutes=2),
        ),
        AuditEvent(
            id="AUD-UPS-9905",
            event_type="UPSELL_SUGGESTED",
            title="Smart Upsell Engine Triggered",
            description="Cross-sold Pro Dri-Fit 3-Pack socks with ₹200 bundle discount",
            details={
                "upsell_id": socks_id,
                "bundle_discount": 200.0,
            },
            status="success",
            latency_ms=62,
            created_at=_now() - timedelta(hours=3, minutes=2),
        ),
        AuditEvent(
            id="AUD-ORD-9906",
            event_type="ORDER_CREATED",
            order_id="ORD-20260315-A8F291",
            title="Customer Order Initialized",
            description="Order ORD-20260315-A8F291 created for Aarav Sharma - Total: ₹2,798",
            details={
                "razorpay_order_id": "order_rp_8192a091bf2841",
                "amount": 2798.0,
            },
            status="info",
            latency_ms=90,
            created_at=_now() - timedelta(hours=3, minutes=1),
        ),
        AuditEvent(
            id="AUD-PAY-9907",
            event_type="PAYMENT_VERIFIED",
            order_id="ORD-20260315-A8F291",
            title="Razorpay Payment Verified & Captured",
            description="Payment pay_91fa8201bc8271 verified via UPI - ₹2,798",
            details={
                "payment_id": "pay_91fa8201bc8271",
                "method": "upi",
                "amount": 2798.0,
            },
            status="success",
            latency_ms=115,
            created_at=_now() - timedelta(hours=3),
        ),
    ]

    for audit_event in sample_audit:
        await db.audit_events.insert_one(audit_event.model_dump())

    print(f"✅ Seeded {len(sample_audit)} audit events.")
    print("✨ Database seed completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_data())
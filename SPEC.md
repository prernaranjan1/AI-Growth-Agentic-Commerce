# Nexus AI Commerce: Living Specification

## Overview

A conversational shopping agent and merchant dashboard covering the full chain:

**Customer → AI agent → understand intent → search catalog → check price and stock → recommend → cross-sell → customer approval → create order → Razorpay Test Mode payment → audit.**

Guiding rule: the language model writes words, never facts. Products, prices, stock, discounts and totals come from MongoDB and are computed on the server.

## 1. Conversational agent (storefront)

- Natural-language requests such as "running shoes under ₹3,000" or "AMOLED smartwatch under ₹4,000".
- Intent extraction: category from the first product noun, price range (max, min, ranges, `k`/`thousand`/`lakh`), feature keywords, and relative follow-ups ("cheaper", "more premium") resolved against the previous turn.
- Catalog search over in-stock products, ranked by keyword match, featured flag and rating.
- Cross-sell from the merchant's `upsell_product_ids`, falling back to top-rated accessories.
- Gemini generates the reply from the verified results. A fact check rejects replies with prices or products not in the results; the template reply is used instead.
- Product cards with size and colour pickers, stock badges and add-to-cart / buy-now.

## 2. Agent decision inspector

Shows, per turn:

1. Extracted intent (category, price range, keywords)
2. Catalog query and number of matches
3. Stock of the top pick
4. Recommendation rationale, including constraints not met
5. Cross-sell reason
6. Constraint match (share of stated constraints the top pick meets), measured turn time, and the fact-check result

## 3. Checkout

- Client sends product IDs, quantities, options, an optional promo code and the chat session ID.
- Server prices each line, applies the bundle saving (₹150 per cross-sell unit bought with its linked product) and any active campaign's promo code for its category.
- Stock is reserved atomically on order creation and held for `RESERVATION_MINUTES` (default 15). Expired orders release stock.
- Razorpay Standard Checkout (UPI, cards, netbanking, wallets in Test Mode).
- Verification: signature check, then the payment is fetched from Razorpay to confirm order ID, amount and method. A `payment.captured` webhook is the backup path. Marking paid is atomic and idempotent.

## 4. Merchant inventory hub

Add and edit SKUs, price and MRP (discount computed), stock adjustments, delete, low-stock count and inventory value. Requires the merchant key.

## 5. Campaign drafts

Gemini drafts WhatsApp and SMS copy for a goal, category and discount. Each campaign gets a unique promo code and starts as a draft; activating it makes the code redeemable at checkout. No performance forecast is generated, and messages are not sent from the app.

## 6. Audit ledger

Filterable event stream (intent, search, fact check, recommendation, cross-sell, order created, expired, payment verified or failed, product created, campaign drafted) with expandable JSON details. Metrics: GMV, orders, checkout completion rate, AI conversion (paid orders linked to a chat session ÷ sessions), SKUs, low stock, and average agent turn time.

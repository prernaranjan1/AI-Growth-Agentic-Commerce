# 🚀 AI Growth & Agentic Commerce

An AI-powered commerce platform that transforms traditional e-commerce into a conversational, intelligent, and auditable shopping experience.

The platform uses an AI shopping agent to understand customer intent, search a verified product catalog, recommend relevant products, suggest contextual cross-sells, and guide customers through secure Razorpay checkout.

---

## 🎯 Problem

Traditional e-commerce requires customers to manually search, filter, compare, and select products.

At the same time, AI-driven recommendations can become difficult to trust when the system generates incorrect information about products, prices, stock, or discounts.

**AI Growth & Agentic Commerce** addresses these problems by combining:

- Conversational AI shopping
- Verified catalog-based recommendations
- Contextual upselling
- Secure payment processing
- Inventory updates
- Transparent agent decision tracking
- Merchant campaign automation

---

## 💡 Solution

Our AI shopping agent converts a natural-language shopping request into an end-to-end commerce workflow.

### Example

Customer:

> "I run every morning and need comfortable lightweight running shoes under ₹3000 with good cushioning."

The agent:

1. Understands the customer's intent
2. Extracts the budget and product category
3. Searches the verified product catalog
4. Identifies suitable products
5. Recommends the most relevant product
6. Suggests a contextual complementary product
7. Adds products to the cart
8. Initiates checkout
9. Processes payment through Razorpay
10. Verifies the payment on the backend
11. Updates inventory
12. Records the agent's actions in the Audit Ledger

---

## ✨ Key Features

### 🤖 AI Shopping Agent

- Natural-language product discovery
- Customer intent understanding
- Budget-aware recommendations
- Category-aware product matching
- Contextual cross-selling
- AI-generated shopping responses

### 🛍️ Conversational Commerce

Customers can describe what they need instead of manually navigating multiple filt
Customer Requirement
        ↓
Intent Understanding
        ↓
Catalog Search
        ↓
Product Recommendation
        ↓
Contextual Cross-Sell
        ↓
Cart
        ↓
Checkout

## Payment flow:

Create Order
    ↓
Razorpay Checkout
    ↓
Payment
    ↓
Payment ID + Signature
    ↓
Backend Verification
    ↓
Order Marked PAID

Create Order
    ↓
Razorpay Checkout
    ↓
Payment
    ↓
Payment ID + Signature
    ↓
Backend Verification
    ↓
Order Marked PAID

Prerequisites

Make sure you have installed:

Python 3.10+
Node.js
npm
MongoDB / MongoDB Atlas
1. Clone Repository
2. git clone https://github.com/prernaranjan1/AI-Growth-Agentic-Commerce.git
cd AI-Growth-Agentic-Commerce
2. Backend Setup
cd backend

Create a virtual environment:

Windows
python -m venv venv
venv\Scripts\activate

Install dependencies:

pip install -r requirements.txt

Create your environment file:
.env
Use .env.example as a reference and add your own:

MongoDB credentials
Razorpay Test API credentials
Gemini API key
3. Seed Database

From the backend directory:

python seed.py
4. Start Backend
uvicorn main:app --reload

Backend:

http://localhost:8000

Swagger API documentation:

http://localhost:8000/docs
5. Start Frontend

Open another terminal:
cd frontend
npm install
npm run dev

Open:
http://localhost:5173

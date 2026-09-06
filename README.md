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

<img width="777" height="617" alt="image" src="https://github.com/user-attachments/assets/0957def9-a569-4252-a8a7-c7b4ba9e8c66" />
<img width="728" height="552" alt="image" src="https://github.com/user-attachments/assets/bcfd0cbc-a98f-40db-9b4c-89c1424d6e26" />
<img width="740" height="549" alt="image" src="https://github.com/user-attachments/assets/e52fbf39-9ce4-42d2-ab00-257a35ccb412" />
<img width="547" height="538" alt="image" src="https://github.com/user-attachments/assets/e38a1673-3a84-4d64-8daf-9f1f8b62f18b" />
<img width="561" height="651" alt="image" src="https://github.com/user-attachments/assets/79beccb9-af5a-4eb4-b175-64cb118f7567" />
<img width="599" height="610" alt="image" src="https://github.com/user-attachments/assets/99871507-6827-4df7-a49f-7dfcf6a6a39f" />
<img width="1311" height="673" alt="image" src="https://github.com/user-attachments/assets/edb42227-6b09-405b-bb31-73cc7872fde4" />
<img width="705" height="684" alt="image" src="https://github.com/user-attachments/assets/4a7661c4-3f77-42da-8a78-255565040419" />
<img width="1363" height="609" alt="image" src="https://github.com/user-attachments/assets/4bcaa605-dbf9-471c-9ec4-c2a20d44f24e" />
<img width="1359" height="552" alt="image" src="https://github.com/user-attachments/assets/db356e42-baea-40f9-a60d-e4627f0b1d5b" />
<img width="1366" height="573" alt="image" src="https://github.com/user-attachments/assets/0072ea80-76be-4c19-be85-2564ed7b9c4e" />
<img width="1366" height="644" alt="image" src="https://github.com/user-attachments/assets/2834935b-24df-4a25-a013-a7499c0c3cd8" />

📌 Author
Prerna Ranjan IT Undergraduate | Full-Stack Developer












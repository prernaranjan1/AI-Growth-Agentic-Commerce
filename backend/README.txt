NEXUS BACKEND - GEMINI INTEGRATION

What changed
1. Added lib/gemini_client.py using the current google-genai SDK.
2. Updated routers/agent.py so catalog search and product/upsell selection stay deterministic in MongoDB, while Gemini generates the natural-language shopping response.
3. Updated routers/campaigns.py to use the same Gemini client.
4. Replaced google-generativeai with google-genai in requirements.txt.
5. Added .env.example.

Important behavior
- Gemini does NOT choose fake products or prices.
- Gemini does NOT execute payments.
- Razorpay remains in the existing orders router.
- If Gemini is unavailable, /api/agent/chat falls back to the existing deterministic reply instead of failing.

Install
pip install -r requirements.txt

Environment
Set GEMINI_API_KEY in .env.
You can optionally set GEMINI_MODEL.

Run
uvicorn main:app --reload

Then test
GET  http://localhost:8000/health
GET  http://localhost:8000/api/
POST http://localhost:8000/api/agent/chat

Security
Do not commit .env or expose GEMINI_API_KEY / RAZORPAY_KEY_SECRET to the frontend.
The API key included in the uploaded .env should be rotated because it has been shared in this conversation.

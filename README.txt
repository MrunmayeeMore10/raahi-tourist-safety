RAAHI — Mobile-first Tourist Safety App (React + Vite + Express)

This version uses a portrait/mobile-first layout designed for a phone viewport (roughly 9:16). On desktop it appears as a centered mobile app canvas.

FEATURES IMPLEMENTED
- Real interactive OpenStreetMap map using Leaflet; GPS location marker, zoom/pan, recenter on GPS refresh.
- Smart Translator for 18 languages. If OPENAI_API_KEY is configured in the server environment, translations use OpenAI AI. Without that key, the app falls back to MyMemory online machine translation (internet required).
- Local persistence for contacts, saved places, trip plan, check-ins, journey log, incident notes, and last GPS reading.
- SOS prepares a local incident record, quick-calls a saved contact, and lets the user copy an emergency message. It does NOT dispatch an emergency alert by itself.
- Browser GPS permission and location refresh while the app page is open.

RUN LOCALLY
1. Install Node.js 18+.
2. Extract this ZIP and open a terminal in the project folder.
3. Run: npm install
4. Optional AI setup: copy .env.example to .env and add your own OPENAI_API_KEY. Never put a secret key in frontend code or commit .env.
5. Run: npm run dev:all
6. Open the local URL shown by Vite. The Vite dev server proxies /api requests to the Express API on port 3001.

TRANSLATOR NOTES
- Without an OpenAI key, translation uses an online, keyless machine-translation provider and is not generative AI. It may be rate-limited or unavailable.
- With a valid OPENAI_API_KEY, the server uses gpt-4o-mini for AI translation. API usage may incur charges based on the provider account.
- For production deployment, deploy the API and frontend together or configure a secure API proxy; configure HTTPS, secrets, rate limits, monitoring, and privacy disclosures.

MAP NOTES
- Map tiles come from OpenStreetMap and require internet access. Follow OpenStreetMap tile usage policy before high-traffic production deployment.
- GPS requires user permission and HTTPS (or localhost). GPS refresh stops when the page is suspended or closed.

IMPORTANT PRODUCTION SAFETY LIMITATIONS
This project is not a certified emergency-dispatch system. It has no responder dispatch, automatic SMS/WhatsApp delivery, background GPS tracking, cloud backup, authenticated user accounts, or guaranteed service uptime. SOS currently creates a local record and offers call/copy actions. Before real public deployment, integrate and test a reliable alert-delivery provider and backend, add authentication/authorization where needed, data retention controls, security review, monitoring, and emergency-service-specific workflows. Do not advertise an SOS as sent unless a server/provider confirms delivery.

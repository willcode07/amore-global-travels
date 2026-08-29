# Amore Global Travels

Frontend recreation of [amoreglobaltravels.com](https://amoreglobaltravels.com), plus an agent-led quote funnel (request → traveler dashboard → agent inbox → written proposal).

**Live demo:** https://willcode07.github.io/amore-global-travels/

**Brand book:** [docs/BRAND_BOOK.md](docs/BRAND_BOOK.md) · visual review at `/brand`

## Stack

- Next.js 15 (App Router, static export)
- TypeScript
- Tailwind CSS v4
- Browser `localStorage` for travel requests (GitHub Pages–friendly)
- Optional Next.js API + Postgres when `NEXT_PUBLIC_DATA_BACKEND=api` (not used on Pages)

## Demo vs API backend

**Demo (default, GitHub Pages):** `NEXT_PUBLIC_DATA_BACKEND=local` or unset. Trip data stays in the browser. `npm run build` static-exports the marketing site and CRM UI; API routes are not shipped. `npm start` serves the `out/` folder.

**API mode (local Postgres or a Node host):** set `NEXT_PUBLIC_DATA_BACKEND=api`, `DATABASE_URL`, `AUTH_SECRET`, and `AGENT_LOGIN_EMAILS`. Dashboard and agent inbox use email one-time codes (demo codes on screen until Resend is configured). Quotes can upload flyers to R2. Confirmed trips export a ClientEase CSV. See [docs/HOSTING_HANDOFF.md](docs/HOSTING_HANDOFF.md) for what Amore must provide.

```bash
docker compose up -d
# in .env.local:
# NEXT_PUBLIC_DATA_BACKEND=api
# DATABASE_URL=postgresql://amore:amore@localhost:5432/amore
# AUTH_SECRET=dev-secret
# AGENT_LOGIN_EMAILS=you@yourdomain.com
npm run db:migrate
npm run dev
```

API-mode production build: `NEXT_PUBLIC_DATA_BACKEND=api npm run build` then `npm run start:api`. If you switch between static and API builds and Next reports a missing page module, delete `.next` and rebuild.

## Core product flow

1. **Request a Quote** — traveler + trip details, including cruise / all-inclusive / vacation package
2. **Traveler dashboard** (`/dashboard`) — email + phone login, every trip in one view, written quotes, messaging
3. **Agent inbox** (`/agent`) — one row per trip, quote composer, payment status, CSV export for ClientEase
4. **Notifications** — API mode emails via Resend when configured; otherwise demo codes / console logs. Local mode stores email-style alerts in the browser.

## Run locally

```bash
cd amore-global-travels
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful URLs

- `/` — homepage
- `/vacation-packages` — Africa, Caribbean, Europe
- `/cruises` — cruise planning (separate from land packages)
- `/enhance-your-trip` — Aura Frames add-on
- `/dashboard` — traveler trip hub
- `/agent` — agent inbox (default passcode: `amore-agents`)
- `/?start=1` — force-open the request modal

## Deploy (GitHub Pages)

Pushes to `main` build a static site and deploy via GitHub Actions.

Manual rebuild: **Actions → Deploy to GitHub Pages → Run workflow**.

Repo Settings → Pages should use **GitHub Actions** as the source.

## Notes

- Request data lives in the browser (`localStorage`) in demo mode, so traveler + agent flows need the same browser/device. API mode stores trips in Postgres instead.
- Agent login: demo passcode locally; email OTP in API mode (`AGENT_LOGIN_EMAILS`).
- Airport transfers are not a standalone service; they can be quoted inside an itinerary.
- Light and dark mode follow the visitor’s browser theme, with a header toggle.

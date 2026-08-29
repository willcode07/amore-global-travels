# Hosting handoff

This repo ships a **GitHub Pages demo** (trip data in the browser) plus a **Postgres + API CRM** that stays off until you host Next.js with API routes and fill in the env vars below.

Placeholders in `.env.example` are intentional. Use the developer’s own Neon/Resend/R2 accounts until Amore provides theirs.

## Product boundary

| System | Owns |
| --- | --- |
| **This app** | Pre-booking CRM: leads, quotes, traveler portal, messaging, flyer/PDF files |
| **ClientEase** | Bookings and commissions (Amore keeps those logins) |

There is **no ClientEase API**. After a trip is confirmed, export **Export confirmed for ClientEase** and paste a booking id into **ClientEase booking ref**. Confirm CSV columns with whoever runs ClientEase.

## What Amore (or their host) must provide

| Item | Env var | Notes |
| --- | --- | --- |
| App host that can run Next.js APIs | — | Vercel, Cloudflare Pages (OpenNext), Railway, Render. **Not GitHub Pages.** |
| Public site URL | `NEXT_PUBLIC_SITE_URL` | e.g. `https://www.amoreglobaltravels.com` |
| Postgres | `DATABASE_URL` | Neon (recommended) or any Postgres 16. Then `npm run db:migrate` |
| Switch client to API | `NEXT_PUBLIC_DATA_BACKEND=api` | Leave `local` for the Pages demo |
| Cookie / OTP signing secret | `AUTH_SECRET` | Long random string. Server-only. |
| Agent inboxes allowed to sign in | `AGENT_LOGIN_EMAILS` | Comma-separated. Start with the developer’s email. |
| Transactional email | `RESEND_API_KEY`, `EMAIL_FROM` | Until set, OTP codes appear on screen as **demo codes** and emails log to the server console |
| Agent notify address | `NEXT_PUBLIC_AGENT_NOTIFY_EMAIL` | Defaults to `info@amoreglobaltravels.com` |
| File bucket | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET` | Cloudflare R2. Optional `R2_PUBLIC_BASE_URL` for public files. Until set, paste flyer URLs. |
| ClientEase CSV mapping | — | They keep ClientEase accounts. No passwords in this repo. |

Google Workspace SSO can replace email OTP later. Retire `NEXT_PUBLIC_AGENT_PASSCODE` once API mode is the only login.

## Local API trial (developer machine)

```bash
docker compose up -d
# .env.local:
# NEXT_PUBLIC_DATA_BACKEND=api
# DATABASE_URL=postgresql://amore:amore@localhost:5432/amore
# AUTH_SECRET=dev-secret
# AGENT_LOGIN_EMAILS=you@yourdomain.com
npm run db:migrate
npm run dev
```

Agent and traveler logins send a 6-digit code. With no Resend key, the UI shows the demo code.

## GitHub Pages demo

Leave `NEXT_PUBLIC_DATA_BACKEND` unset/`local`. `npm run build` (or `GITHUB_PAGES=true`) static-exports and does not ship `/api`. Traveler login is email+phone; agent login is the demo passcode.

## Repo map

- SQL: `db/migrations/001_init.sql`, `002_auth_storage.sql`
- Auth: `POST /api/auth/agent/otp|verify`, `POST /api/auth/traveler/otp|verify`
- Trips: `POST/GET /api/trips`, `GET/PATCH /api/trips/[id]`, `POST /api/trips/[id]/messages`
- Files: `POST /api/uploads`, `GET /api/files?key=`
- Dual-mode client: `src/lib/data/`

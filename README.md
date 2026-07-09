# Amore Global Travels

Frontend recreation of [amoreglobaltravels.com](https://amoreglobaltravels.com), plus a traveler request funnel (modal → dashboard → agent inbox).

**Live demo:** https://willcode07.github.io/amore-global-travels/

## Stack

- Next.js 15 (App Router, static export)
- TypeScript
- Tailwind CSS v4
- Browser `localStorage` for travel requests (GitHub Pages–friendly)

## Core product flow

1. **Travel request modal** — captures traveler + trip details
2. **Traveler dashboard** (`/dashboard`) — phone + access code login, status tracker, options, messaging
3. **Agent inbox** (`/agent`) — review requests, publish options (incl. Canva flyer links), update status, reply
4. **Demo notifications** — email-style alerts are logged to the browser console (no server required)

## Run locally

```bash
cd amore-global-travels
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful URLs

- `/` — homepage (auto-opens request modal)
- `/dashboard` — traveler trip hub
- `/agent` — agent inbox (default passcode: `amore-agents`)
- `/?start=1` — force-open the request modal

## Deploy (GitHub Pages)

Pushes to `main` build a static site and deploy via GitHub Actions.

Manual rebuild: **Actions → Deploy to GitHub Pages → Run workflow**.

Repo Settings → Pages should use **GitHub Actions** as the source.

## Notes

- Request data lives in the browser (`localStorage`), so traveler + agent flows need the same browser/device for this demo.
- Agent passcode is intentionally simple for demos — replace with real auth before production.
- Airport Transfer nav item removed (per client meeting); transfers can live inside itineraries.

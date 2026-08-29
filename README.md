# Amore Global Travels

Frontend recreation of [amoreglobaltravels.com](https://amoreglobaltravels.com), plus an agent-led quote funnel (request → traveler dashboard → agent inbox → written proposal).

**Live demo:** https://willcode07.github.io/amore-global-travels/

**Brand book:** [docs/BRAND_BOOK.md](docs/BRAND_BOOK.md) · visual review at `/brand`

## Stack

- Next.js 15 (App Router, static export)
- TypeScript
- Tailwind CSS v4
- Browser `localStorage` for travel requests (GitHub Pages–friendly)

## Core product flow

1. **Request a Quote** — traveler + trip details, including cruise / all-inclusive / vacation package
2. **Traveler dashboard** (`/dashboard`) — email + phone login, every trip in one view, written quotes, messaging
3. **Agent inbox** (`/agent`) — one row per trip, quote composer, payment status, CSV export for ClientEase
4. **Notifications** — demo email-style alerts stored in the browser

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

- Request data lives in the browser (`localStorage`), so traveler + agent flows need the same browser/device.
- Agent login uses a demo passcode (`amore-agents`).
- Airport transfers are not a standalone service; they can be quoted inside an itinerary.
- Light and dark mode follow the visitor’s browser theme, with a header toggle.

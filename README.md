# vizi.ge

> Have you seen this man?

A public web app for tracking sightings of one specific graffiti tag across
Washington State. Visitors submit geotagged photos; an admin reviews and
publishes them onto a MapLibre map. Base map tiles are served by a self-hosted
[light-maps](https://github.com/salixbloom/light-maps) binary running as a
separate, reverse-proxied service.

## Stack

- **Next.js (App Router) + TypeScript** — UI, API routes, and admin dashboard in one app
- **MapLibre GL JS** — map rendering
- **SQLite** (`better-sqlite3` + Drizzle ORM) — data; images stored on local disk
- **sharp** — image re-encoding / EXIF stripping / thumbnails
- **iron-session** — admin auth
- **light-maps** — tile server (separate process)

## Setup

```bash
npm install
cp .env.example .env          # then edit values (see below)
npm run db:generate           # generate SQL migration from lib/schema.ts
npm run db:migrate            # create / migrate ./data/vizi.db
npm run db:seed               # optional: a few demo locations
npm run db:hash -- "your-admin-password"   # prints a hash for ADMIN_PASS_HASH
npm run dev                   # http://localhost:3000
```

### Environment (`.env`)

| Var | Purpose |
| --- | --- |
| `TILE_SERVER_URL` | Base URL of the light-maps service (proxied at `/tiles`) |
| `DATABASE_PATH` | SQLite file path (default `./data/vizi.db`) |
| `UPLOAD_DIR` | Image storage dir (default `./data/uploads`) |
| `MAX_SUBMISSIONS_PER_DAY` | Per-device daily submission cap (default 3) |
| `WA_BBOX` | `minLng,minLat,maxLng,maxLat` bounds for submission validation |
| `ADMIN_USER` / `ADMIN_PASS_HASH` | Admin login (hash via `npm run db:hash`) |
| `SESSION_SECRET` | 32+ char secret for the admin session cookie |

## light-maps tile server

light-maps runs as its own process; the Next app proxies `/tiles/*` to it
(`next.config.mjs` → `rewrites`), so the browser only talks to one origin.

```bash
# example — run light-maps with the WA tile dataset on :8080, then:
# TILE_SERVER_URL=http://127.0.0.1:8080
```

The bundled `public/map-style.json` assumes **raster** tiles at
`/tiles/{z}/{x}/{y}.png`. Confirm this against your light-maps build:

- If light-maps serves **vector tiles / PMTiles**, replace the source in
  `public/map-style.json` accordingly (and add `glyphs`/`sprite` if you use
  text/symbol layers).
- If light-maps serves a **full style.json**, skip the bundled style and set
  `NEXT_PUBLIC_MAP_STYLE_URL=/tiles/style.json` — `components/Map.tsx` reads it.

> This is the one part of the build intentionally left configurable, since the
> exact light-maps tile format should be verified against its docs.

## How it works

- **Public map** (`/`) — approved sightings load from `GET /api/locations`
  (GeoJSON, optional `?bbox=`), clustered, click for photo + details.
- **Submissions** — a soft "hardware ID" (browser fingerprint + on-device UUID,
  hashed) is sent with each `POST /api/submissions`. The server enforces a daily
  per-device cap, validates the point is inside WA, re-encodes photos with sharp
  (stripping EXIF/GPS), and queues everything as `pending`. **Nothing appears on
  the public map until an admin approves it.**
  - The `device_id` is *evadable* (clearing storage resets it). The real
    backstops are IP throttling (hashed) and admin moderation.
- **Admin** (`/admin`) — sign in, then:
  - **Overview**: location/submission counts, 14-day submission chart, tile-server health.
  - **Submissions**: view photos, adjust location/label/description, approve (creates/updates a location) or reject with a note.
  - **Devices**: block/unblock abusive device IDs.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev / build / serve |
| `npm run db:generate` | Generate Drizzle migration from schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed demo locations |
| `npm run db:hash -- <pw>` | Hash an admin password |
| `npm test` | Run unit tests (Vitest) |

## Deployment notes

- Single-instance by design (SQLite + local disk). Persist `./data/` on a volume.
- Put a reverse proxy (Nginx/Caddy) in front; it can also serve `/tiles` directly
  to light-maps instead of going through Next rewrites if you prefer.
- Set `secure` cookies by running with `NODE_ENV=production` over HTTPS.

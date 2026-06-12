# Panini WC 2026 — Virtual Sticker Album

Full-stack virtual Panini sticker album for the FIFA World Cup 2026:
**1,313 stickers** with real players from all **48 qualified teams** (scraped
from Wikipedia), a pack-opening simulator with card-by-card 3D flip reveal,
album with per-team spreads, and a trading system between users.

| | |
|---|---|
| Backend | Go 1.25 · Gin · GORM · PostgreSQL · Redis |
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS 4 · Zustand |
| Data | Wikipedia squad pages + pageimages API + Wikidata SPARQL |
| Deploy | GitHub Pages (frontend) · Fly.io (backend) |

## Quick start (local)

```bash
docker compose up -d postgres redis        # postgres on host port 5434

cd backend
export DATABASE_URL="postgres://panini:secret@localhost:5434/panini?sslmode=disable"
go run ./cmd/seed                          # migrations + 1313 stickers
go run ./cmd/server                        # API on :8080

cd ../frontend
npm install
VITE_API_URL=http://localhost:8080 npm run dev   # UI on :5173
```

Or run everything in containers: `docker compose up --build`.

## Gameplay

- **Packs** (`/packs`): 5 packs per 24h cycle, 5 stickers each. Rarity odds:
  70% common / 25% rare (50+ caps) / 5% legend (Messi, Ronaldo, Mbappé,
  Yamal, …). Cooldown lives in Redis (`pack_cooldown:{user_id}`, TTL 86400).
- **Album** (`/album`): 12 groups × 4 teams, team card + player grid per
  spread, dotted slots for missing stickers, stick/wiggle/fly animations.
- **Trading** (`/trade`): browse other collectors' duplicates, offer a
  one-for-one swap. Acceptance runs in a single PostgreSQL transaction with
  row locks plus a Redis lock per trade — no sticker can be lost or duped.
- **Leaderboard** (`/`): top collectors by completion %.

## Refreshing the dataset

```bash
python3 scraper/scrape.py     # → backend/seeddata/stickers.json (cached, 429-aware)
cd backend && go run ./cmd/seed
```

The seed upserts on `sticker_number`, so re-running refreshes player data
without touching user collections. Photos are hotlinked from Wikimedia —
nothing is self-hosted; a silhouette is rendered when a photo is missing.

## Deployment

**Backend → Fly.io** (`backend/fly.toml`, app `panini-wc2026-api`, region `fra`):

```bash
fly launch --copy-config --no-deploy
fly secrets set DATABASE_URL=... REDIS_URL=... JWT_SECRET=$(openssl rand -hex 32) \
  CORS_ORIGINS=https://<username>.github.io
fly deploy
fly ssh console -C seed        # one-off: populate stickers
```

**Frontend → GitHub Pages**: push to `main`. The workflow
(`.github/workflows/deploy.yml`) builds with `BASE_PATH=/<repo>/` and
publishes `frontend/dist` to the `gh-pages` branch.

Repository secrets required: `FLY_API_TOKEN`, `VITE_API_URL`.

## API

```
POST /api/auth/register | login | logout
GET  /api/album                      GET  /api/album/progress
POST /api/packs/open                 GET  /api/packs/status
POST /api/stickers/:id/stick         GET  /api/inventory
GET  /api/users                      GET  /api/users/:id/inventory
GET  /api/users/:id/album            GET  /api/leaderboard
POST /api/trades                     GET  /api/trades
PUT  /api/trades/:id/accept          PUT  /api/trades/:id/decline
DELETE /api/trades/:id
```

All routes except auth and leaderboard require `Authorization: Bearer <JWT>`.

---

*Fan project. Player data and photos from Wikipedia/Wikimedia Commons.
Not affiliated with Panini or FIFA.*

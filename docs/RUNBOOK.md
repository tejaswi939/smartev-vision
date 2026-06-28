# SmartEV Vision — Phase 0 Runbook

## Prerequisites
- **Node 20+** (the repo pins it via `.nvmrc`; run `nvm use`)
- **pnpm 9** (`corepack enable pnpm`)
- **Docker** running (Docker Desktop or colima)

> **Port note:** Postgres is published on host **5544** (not 5432) to avoid clashing with a
> native PostgreSQL install. All connection strings use 5544.

## Run

```bash
cp .env.example .env
docker compose up -d          # Postgres on host :5544
pnpm install
pnpm db:migrate               # apply migrations (apps/api/prisma/schema.prisma)
pnpm db:seed                  # seed 3 roles, 3 vehicles x 8 parts, 6 sessions
pnpm dev                      # web on :5173 + api on :4000 (parallel)
```

Open **http://localhost:5173**.

### Seeded logins (password `Password123`)
| Email | Role | Lands on |
|-------|------|----------|
| admin@smartev.io | ADMIN | `/admin` |
| analyst@smartev.io | ANALYST | `/insights` |
| customer@smartev.io | CUSTOMER | `/app` |

## API docs
Swagger UI at **http://localhost:4000/api/docs** (raw spec at `/api/openapi.json`).

## Password reset (dev)
`POST /api/v1/auth/forgot-password` logs the reset link to the **api server console**; open it to
reach `/reset?token=…`. Swap `apps/api/src/lib/mailer.ts` for a real provider in production.

## Tests

```bash
# one-time: create + migrate the throwaway test database (host :5544)
docker compose exec -T db createdb -U sev smartev_test
(cd apps/api && DATABASE_URL="postgresql://sev:sev@localhost:5544/smartev_test?schema=public" pnpm exec prisma migrate deploy)

pnpm -r test          # shared + api (integration) + web
pnpm -r typecheck
```

## VR Showroom (Phase 1)
- Open **`/showroom`** (public route; also in the dashboard nav).
- Switch vehicles (Compact / SUV / Sports) via the top switcher. Hover/click any of the 15 components to open its hotspot panel (specs + animation). Toggle camera modes (Orbit / Walk / First-person) and enter VR if the device supports WebXR.
- **Add a new vehicle (no code changes):** insert a `Vehicle` row + its `VehiclePart` rows (`meshName`, `category`, `specs`, `hotspotPosition`, `animation`). Leave `modelUrl = null` for the procedural builder, or set it to a real `.glb` path (Draco/KTX2 decoders go in `apps/web/public/decoders/`) — `VehicleModel` auto-maps GLB meshes to parts by `meshName`.

## Gaze & Analytics (Phase 2)
- In the showroom, pick a gaze provider from the HUD selector: **Mouse Pointer / Camera Center / Crosshair** (WebGazer is "Coming Soon"). Gaze is raycast into the scene ~20 Hz, resolved to a component via `mesh.userData.objectId`, batched, and POSTed to the API. Toggle the **Heatmap** button for a live 3D attention overlay.
- A **session = one vehicle view** (switching vehicles ends + restarts). Anonymous visitors are tracked (nullable `Session.userId`). Event times are ms-precision (`tMs`) for future **Session Replay**.
- **Dashboards** poll ~4s (paused on hidden tab): `/admin` & `/insights` → KPIs + vehicle popularity + top/bottom components; `/app` → your sessions → a session detail with attention chart, gaze heatmap, customer journey, and timeline.
- **Endpoints** (`/api/v1`): `POST /sessions`, `/sessions/:id/{end,gaze,interactions}`; `GET /sessions/:id/{analytics,heatmap,report}`, `/sessions`, `/vehicles/:slug/{analytics,heatmap}`, `/analytics/overview`. Analytics run in the Node `AnalyticsEngine` (Phase 3 swaps a Python ML impl behind the same interface). Reports are JSON; PDF/Excel export is Phase 5.

## AI/ML (Phase 3)

### Start the ML service

```bash
docker compose up -d --build ml   # build image (trains model inside) then start
```

The service is exposed on **http://localhost:8000**. Swagger UI at **http://localhost:8000/docs**.

### Wire the API to ML

Set `ML_SERVICE_URL` so the Node API calls the ML service for predictions:

```bash
# in your .env (already in .env.example)
ML_SERVICE_URL=http://localhost:8000
```

Restart the API (`pnpm dev`) after changing `.env`.

### How predictions work

- Predictions are computed **on session-end** (when `POST /sessions/:id/end` is called).
- The API calls the ML service in a fire-and-forget / graceful-degradation pattern — **if the ML service is down the API continues to work normally**; the session just won't have a prediction attached.
- Prediction result for a session: `GET /api/v1/sessions/:id/prediction`
- Aggregate recommendations across all sessions: `GET /api/v1/analytics/recommendations`

### Retrain locally

```bash
# ensure the venv exists first
cd services/ml && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
# from repo root:
pnpm ml:train
```

Trained artifacts (`archetype.joblib`, `interest.joblib`, `info.json`) are written to `services/ml/app/artifacts/`. These are excluded from Docker builds — the image always trains fresh via `RUN python -m app.train` in the Dockerfile.

## Feedback & Reports (Phase 4)

### Customer Feedback

Customers submit feedback from the **session-detail page** (`/app/sessions/:id`) once a session
ends. The form collects:

| Field | Type | Notes |
|-------|------|-------|
| `rating` | 1–5 integer | required |
| `favoriteFeature` | string | optional (pre-populated from top gaze component) |
| `comment` | string | optional free-text |
| `suggestion` | string | optional |

**Endpoint:** `POST /api/v1/feedback`

```json
{
  "sessionId": "cuid",
  "rating": 5,
  "favoriteFeature": "Battery",
  "comment": "Loved the range display",
  "suggestion": "Add charging time estimate"
}
```

Response includes the created feedback record with a `sentiment` field computed by the ML service
(see below), or `null` if the ML service is unavailable.

### Sentiment Analysis (ML service)

Sentiment is computed by the Python ML service using **VADER** (`vaderSentiment`):

- **Endpoint on ML service:** `POST http://localhost:8000/sentiment` — body `{"text": "…"}`,
  returns `{"sentiment": "positive"|"neutral"|"negative", "score": <compound float>}`.
- The Node API calls this endpoint for the `comment` field on every feedback submission.
- **Graceful degradation:** if `ML_SERVICE_URL` is not set or the ML service is unreachable,
  feedback saves normally with `sentiment: null` — no error is surfaced to the customer.

**Required env var** (in `.env`; already in `.env.example`):

```bash
ML_SERVICE_URL=http://localhost:8000
```

**Start/rebuild the ml container** (must be running for live sentiment):

```bash
docker compose build ml        # rebuilds image — picks up vaderSentiment + /sentiment route
docker compose up -d ml        # starts (or restarts) the container
```

Verify the endpoint is live:

```bash
curl -fsS -X POST http://localhost:8000/sentiment \
  -H 'content-type: application/json' \
  -d '{"text":"I absolutely love this car"}'
# → {"sentiment":"positive","score":0.6369}
```

Swagger UI for the full ML API: **http://localhost:8000/docs**.

### Report Export

| Endpoint | Access | Description |
|----------|--------|-------------|
| `GET /api/v1/sessions/:id/report` | session owner, ANALYST, ADMIN | Session-level report |
| `GET /api/v1/vehicles/:slug/report` | ANALYST, ADMIN | Vehicle-level aggregate report |
| `GET /api/v1/analytics/feedback-summary` | ANALYST, ADMIN | Sentiment breakdown panel |

**Query param `?format=`**

- `json` (default) — returns the report as JSON; no download.
- `pdf` — streams a PDF download (`Content-Disposition: attachment`).
- `xlsx` — streams an Excel workbook download.

Export buttons for `pdf` / `xlsx` are rendered on the session-detail page (`/app/sessions/:id`).
The admin (`/admin`) and analyst (`/insights`) dashboards show a **sentiment-breakdown panel**
sourced from `GET /api/v1/analytics/feedback-summary`.

**API deps** (`apps/api/package.json`) — already committed:
- `pdfkit` — PDF generation
- `exceljs` — Excel generation

No additional install step is needed; `pnpm install` (run at project root) covers them.

## Layout
- `apps/web` — React + Vite + Tailwind + R3F (frontend)
- `apps/api` — Express + Prisma (backend, owns `prisma/`)
- `packages/shared` — zod contracts + types + provider seams
- `services/ml` — FastAPI + scikit-learn ML service (archetype + interest prediction, recommender, emotion placeholder, VADER sentiment)
- `legacy/` — the original Flask prototype (analytics reused in Phase 3)

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

## Layout
- `apps/web` — React + Vite + Tailwind + R3F (frontend)
- `apps/api` — Express + Prisma (backend, owns `prisma/`)
- `packages/shared` — zod contracts + types + provider seams
- `services/ml` — placeholder (built Phase 3)
- `legacy/` — the original Flask prototype (analytics reused in Phase 3)

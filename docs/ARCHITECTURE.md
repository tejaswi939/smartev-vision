# SmartEV Vision — Architecture

> Current as of Phase 5 (2026-06-28). For deployment instructions see `docs/DEPLOYMENT.md`.
> For day-to-day dev setup see `docs/RUNBOOK.md`.

---

## 1. Monorepo Layout

```
smartev-vision/
├── apps/
│   ├── api/          # Express + Prisma backend (Node 20, TypeScript via tsx)
│   │   ├── prisma/   # schema.prisma + migrations + seed
│   │   └── src/      # routes, services, lib, middleware
│   └── web/          # React 18 + Vite + React Three Fiber frontend
│       ├── nginx.conf # served by nginx in prod; SPA + /api/ proxy
│       └── src/       # pages, components, hooks, stores
├── packages/
│   └── shared/       # Zod schemas, TypeScript types, provider seams
│                     # consumed as TS source by both apps (no separate build step)
├── services/
│   └── ml/           # FastAPI + scikit-learn Python microservice
│                     # archetype prediction, interest prediction, recommender,
│                     # VADER sentiment, emotion placeholder
├── docs/             # RUNBOOK.md, ARCHITECTURE.md, DEPLOYMENT.md, superpowers/
├── legacy/           # Original prototype (archived, not deployed; see legacy/docs/)
├── docker-compose.yml         # dev: db + ml containers only
├── docker-compose.prod.yml    # prod: all four services (db, ml, api, web)
├── package.json               # pnpm workspace root
└── pnpm-workspace.yaml
```

**Package names:** `@sev/api`, `@sev/web`, `@sev/shared`, `@sev/ml` (Python, not pnpm).

---

## 2. Phase History

### Phase 0 — Foundation & Auth
TypeScript monorepo scaffolding (pnpm workspaces, Vite, tsconfig, ESLint). Express API with JWT access/refresh tokens, bcrypt passwords, RBAC (ADMIN / ANALYST / CUSTOMER). Password-reset flow (token-hashed, console mailer in dev). Prisma + PostgreSQL schema, migrations, seed. Role-gated React Router routes with Tailwind + shadcn/ui layout.

### Phase 1 — VR Showroom
React Three Fiber showroom rendering real GLB vehicle models (Draco/KTX2 compressed). `VehicleModel` auto-maps GLB mesh names to `VehiclePart` records via `meshName`, making vehicle data fully database-driven — add a row, no code changes needed. Interactive hotspot panels (specs + animations) on each of the ~15 components per vehicle. Camera modes (Orbit / Walk / First-person) and WebXR VR entry. Vehicle switcher ends the current session and starts a new one.

### Phase 2 — Gaze & Analytics
Gaze captured ~20 Hz via raycasting (providers: mouse pointer, camera-center, crosshair; WebGazer planned). Each ray resolves to a `VehiclePart` via `mesh.userData.objectId`, batched, and POSTed to the API. API writes `GazeData` and incrementally updates `ComponentView` (per-component dwell time via `totalViewMs`/`hoverMs`, focus, entry/exit, and interaction counts). 3D attention heatmap overlay in-scene. Dashboards poll every ~4 s: `/admin` and `/insights` show KPIs + vehicle popularity; `/app` shows session history + detail with attention chart, gaze heatmap, customer journey, and timeline. Anonymous sessions supported (`Session.userId` nullable).

### Phase 3 — AI/ML Predictions
Python FastAPI microservice (`services/ml`). Trains two scikit-learn RandomForest classifiers inside the Docker image (`RUN python -m app.train`): an **archetype** classifier (e.g. "Range-Maximizer", "Tech Enthusiast") and an **interest-tier** classifier (High/Medium/Low). Recommender ranks vehicles by predicted affinity. Emotion detection endpoint present as a placeholder for future webcam-based inference. Predictions are computed on session-end (fire-and-forget from the Node API); if the ML service is unreachable the session saves normally with no prediction attached.

### Phase 4 — Feedback, Sentiment & Reports
Customers submit post-session feedback (rating 1–5, favorite feature, comment, suggestion). The Node API calls the ML service's VADER endpoint (`POST /sentiment`) on the comment field; result stored as `Feedback.sentiment`. Graceful degradation: feedback saves with `sentiment: null` if ML is down. Report export (`GET /sessions/:id/report?format=pdf|xlsx|json`) and vehicle-level aggregate reports using `pdfkit` and `exceljs`. Sentiment-breakdown panel for ANALYST/ADMIN dashboards.

### Phase 5 — Docs & Deployment
GitHub Actions CI (node + python + docker-build jobs). Multi-stage Dockerfiles for api and web. Production `docker-compose.prod.yml` orchestrating all four services. Current architecture and deployment documentation superseding the archived legacy prototype docs.

---

## 3. Request & Data Flow

### Browser → Web → API → Postgres

```
Browser
  │  HTTP/WebSocket
  ▼
web container (nginx :80, published as :8080)
  │  Static files: /  → /usr/share/nginx/html (Vite SPA)
  │  API proxy:  /api/ → http://api:4000  (same docker network)
  ▼
api container (Express :4000)
  │  Prisma ORM
  ▼
db container (Postgres 16 :5432, volume sev_pgdata_prod)

api container
  │  HTTP (fire-and-forget, graceful on failure)
  ▼
ml container (FastAPI :8000)
  ├── POST /predict      ← session-end prediction
  └── POST /sentiment    ← feedback comment analysis
```

All four containers share a single Docker Compose bridge network; only the `web` container publishes a host port (8080).

### Gaze → ComponentView → Analytics → Prediction Pipeline

```
Browser (R3F showroom)
  1. Raycast ~20 Hz → resolves objectId (mesh.userData.objectId)
  2. Buffer 1–2 s of GazeData points
  3. POST /api/v1/sessions/:id/gaze  (batch)

API (GazeController / AnalyticsEngine)
  4. Write GazeData rows
  5. Upsert ComponentView (totalViewMs, hoverMs, focusCount…)
     → unique index (sessionId, meshName) ensures idempotent accumulation

Session end (POST /api/v1/sessions/:id/end)
  6. Mark session COMPLETED, compute engagementScore
  7. Fire-and-forget → PredictionService
       PredictionService.predict(sessionId):
         a. Load ComponentView rows for session
         b. POST http://ml:8000/predict  {componentViews, sessionMeta}
         c. Write Prediction row
         d. If ml unreachable → log + return (api continues normally)

Analytics dashboards (GET /api/v1/analytics/*)
  8. AnalyticsEngine aggregates ComponentView + GazeData + Prediction
     → KPIs, heatmap cells, component rankings, recommendations
```

The **graceful seam** between the Node API and the ML service means the API is fully operational without the ml container. `PredictionService` wraps every outbound call in a try/catch; the `sentiment` seam in `FeedbackService` follows the same pattern.

---

## 4. Prisma Schema Overview

Key models and their roles:

| Model | Purpose |
|-------|---------|
| `User` | Accounts with RBAC role (ADMIN / ANALYST / CUSTOMER), bcrypt hash, optional profile fields |
| `Vehicle` | EV catalogue entry; `slug` used in routes; `modelUrl` points to GLB asset (null = procedural builder) |
| `VehiclePart` | Per-vehicle component; `meshName` links the GLB mesh to DB metadata; holds `specs`, `hotspotPosition`, `animation` |
| `Session` | One vehicle view by one user (nullable); tracks status, duration, engagement/interest scores |
| `GazeData` | Raw raycast samples (x, y, depth, ray direction, camera pose, timestamp ms); optionally resolved to `partId` |
| `ComponentView` | Materialised per-session attention summary per mesh — dwell (`totalViewMs`, `hoverMs`), focus, entry/exit, and interaction counts; updated incrementally during the session |
| `HeatmapCell` | Pre-aggregated spatial heat cells for the in-scene heatmap overlay |
| `InteractionLog` | Discrete user interactions (HOVER, CLICK, ROTATE, ZOOM, …) with timestamps |
| `Prediction` | ML output for a session: archetype label + confidence, interest tier, recommended vehicle, highlight components, rationale |
| `Feedback` | Post-session customer feedback with free-text comment, favorite feature, suggestion, and VADER sentiment result |
| `Rating` | 1–5 star score on a vehicle or specific part |
| `Report` | Record of a generated PDF/Excel report (file URL, scope, generator) |
| `PasswordResetToken` | Password-reset token tied to a User, with expiry and usage tracking |
| `EmotionDetection` | Placeholder for future webcam-based emotion frames (sessionId, tMs, emotion, confidence) |
| `AuditLog` | Immutable security audit trail (LOGIN, ROLE_CHANGE, REPORT_GENERATE, …) |

---

## 5. Technology Choices & Rationale

| Area | Choice | Rationale |
|------|--------|-----------|
| **Language** | TypeScript (strict) throughout `apps/` and `packages/` | End-to-end type safety; Zod contracts in `@sev/shared` enforce runtime-safe API boundaries |
| **API runtime** | `tsx` (not `tsc → node dist`) | `@sev/shared` is consumed as TypeScript source with no pre-build step; `tsx` transpiles on the fly via esbuild, matching the dev workflow exactly |
| **3D / VR** | React Three Fiber + `@react-three/drei` + WebXR | Declarative R3F integrates naturally with React state; WebXR gives optional headset support without a separate codebase |
| **ORM** | Prisma | Type-safe query client generated from schema; `migrate deploy` is safe and idempotent in CI and prod containers |
| **ML service** | FastAPI (Python) | Keeps the proven scikit-learn analytics in their native language; thin HTTP boundary means the Node API is decoupled from Python runtime; easy to replace/upgrade independently |
| **Sentiment** | VADER (`vaderSentiment`) | Lexicon-based, zero-training-cost, runs in the existing Python container; good enough for short product-feedback comments |
| **Containerisation** | Docker Compose | Single-host orchestration sufficient for the prototype scale; the prod compose wires the four services with healthcheck dependencies so startup order is guaranteed |
| **Auth cookies** | HttpOnly cookies (access + refresh JWTs) | CSRF-safe and not exposed to JS; `SameSite=Lax` for CSRF resistance; a TLS terminator is required in real prod for `Secure` flag (see `docs/DEPLOYMENT.md`) |
| **Monorepo tooling** | pnpm workspaces | Fast installs with a single lockfile; workspace protocol links `@sev/shared` without publishing to npm |

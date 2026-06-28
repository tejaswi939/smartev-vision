# Phase 5 — Docs & Deployment: Design Spec

**Status:** approved approach — 2026-06-28
**Branch:** `rebuild/phase-5-deploy` (off `main` @ `7f3956c`)

## 1. Goal

Make the rebuild **deployable and documented**: CI (GitHub Actions), full-stack containerization (api + web Dockerfiles; ml already has one), a production `docker-compose.prod.yml`, and current architecture/deployment docs — superseding the legacy Flask-era docs. This is the final phase.

## 2. Non-goals (out of scope)

- Pushing images to a registry / publishing to a specific cloud (no creds); provider-agnostic only.
- Kubernetes / Terraform / autoscaling.
- New product features, schema changes, or contract changes — Phase 5 is infra + docs only.
- Secrets management beyond env vars + `.example` templates.

## 3. Deployment topology

```
                   docker-compose.prod.yml
  ┌─────────┐   ┌──────────┐   ┌──────────────┐   ┌──────────┐
  │  web    │──▶│  api     │──▶│  db (pg 16)  │   │  ml      │
  │ nginx   │   │ node 20  │   │  volume      │◀──│ fastapi  │  (api → ml over HTTP)
  │ :80     │   │ :4000    │   └──────────────┘   │ :8000    │
  └─────────┘   └──────────┘                      └──────────┘
   serves Vite    migrate deploy on start;          (api ML_SERVICE_URL=http://ml:8000)
   static + proxies /api → api
```

## 4. CI — `.github/workflows/ci.yml` (GitHub Actions, on push to `main` + all PRs)

**Job `node`** (ubuntu-latest):
- A **Postgres 16 service container published on host port 5544** (matching the committed `apps/api/.env.test`, which `vitest.config.ts` loads with `override:true`, so `DATABASE_URL=…localhost:5544/smartev_test` is used by the api integration tests unchanged). Healthcheck `pg_isready`.
- Steps: checkout → `corepack enable` / `pnpm/action-setup@v4` (pnpm 9) → `actions/setup-node@v4` (node 20, pnpm cache) → `pnpm install --frozen-lockfile` → `pnpm --filter @sev/api exec prisma generate` → apply migrations to the CI DB (`DATABASE_URL=postgresql://sev:sev@localhost:5544/smartev_test?schema=public pnpm --filter @sev/api exec prisma migrate deploy`) → `pnpm -r typecheck` → `pnpm -r lint` → `pnpm -r test` → `pnpm --filter @sev/web build`.

**Job `python`** (ubuntu-latest):
- checkout → `actions/setup-python@v5` (3.12) → `pip install -r services/ml/requirements.txt ruff` → `ruff check services/ml` → `cd services/ml && pytest -q`.

**Job `docker-build`** (ubuntu-latest, needs: node): build (no push) the three images (`apps/api`, `apps/web`, `services/ml`) to prove the Dockerfiles build. (Uses `docker/build-push-action@v6` with `push:false` or plain `docker build`.)

CI cannot be run from this session — it is verified on the first push to GitHub. The YAML will be checked with `actionlint` if available, else by careful review.

## 5. Containerization

### 5.1 `apps/api/Dockerfile` (monorepo-aware, **tsx runtime**)
**Why tsx, not `tsc → node dist`:** `@sev/shared` is consumed as **TypeScript source** (no build step / no dist), exactly as `apps/api` imports it. A plain `tsc` build of the api emits `.js` that still `import`s `@sev/shared`, which Node can't resolve at runtime (it's `.ts`). Matching dev, the prod image runs the api with **`tsx`** (Node + esbuild loader), which transpiles the api and the workspace `.ts` dep on the fly. This is the pragmatic, working choice for the prototype (a future optimization is bundling api+shared with esbuild/tsup).
- Single stage `node:20-slim`: enable corepack (pnpm 9); set `WORKDIR /app`; copy `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `apps/api/`, `packages/shared/` (NOT `apps/web`); `pnpm install --frozen-lockfile` (full install — `tsx` is needed at runtime, so do not `--prod`-prune it away); `pnpm --filter @sev/api exec prisma generate`.
- `CMD ["sh","-c","pnpm --filter @sev/api exec prisma migrate deploy && pnpm --filter @sev/api exec tsx apps/api/src/server.ts"]` (migrate, then serve). Exposes 4000. Config from env (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ML_SERVICE_URL`, `PORT`). A `.dockerignore` (repo-root or `apps/api/`) excludes `node_modules`, `.env`, test artifacts.

### 5.2 `apps/web/Dockerfile` (build → nginx)
- **build stage** (`node:20-slim`): pnpm install; `pnpm --filter @sev/web build` → `apps/web/dist`. Build-time `VITE_API_URL` defaults to `/api/v1` (so the browser calls the same origin, proxied by nginx).
- **serve stage** (`nginx:alpine`): copy `dist` → `/usr/share/nginx/html`; add `apps/web/nginx.conf` — SPA fallback (`try_files $uri /index.html`) + `location /api/ { proxy_pass http://api:4000; }` (so `/api/...` reaches the api service). Exposes 80.

## 6. Production compose — `docker-compose.prod.yml`
- `db`: `postgres:16`, named volume, healthcheck.
- `ml`: `build: ./services/ml`, healthcheck on `/health`.
- `api`: `build: { context: ., dockerfile: apps/api/Dockerfile }`, env (`DATABASE_URL=postgresql://sev:sev@db:5432/smartev?schema=public`, `ML_SERVICE_URL=http://ml:8000`, `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` from env, `NODE_ENV=production`), `depends_on: { db: healthy, ml: healthy }`, healthcheck on `/health`.
- `web`: `build: { context: ., dockerfile: apps/web/Dockerfile }`, `ports: ["8080:80"]`, `depends_on: { api: healthy }`.
- A `.env.production.example` documents the required secrets; compose reads them via `env_file`/`environment`. Optional one-shot seed documented (`docker compose -f docker-compose.prod.yml run --rm api pnpm --filter @sev/api exec tsx prisma/seed.ts`).
- The existing `docker-compose.yml` (db + ml for dev) stays unchanged.

## 7. Documentation
- **`docs/ARCHITECTURE.md`** — monorepo layout (`apps/web`, `apps/api`, `packages/shared`, `services/ml`); the 5 phases; request/data flow; the gaze → `ComponentView` → analytics → prediction pipeline; the graceful `PredictionService`/sentiment ML seam; Prisma schema overview; tech choices + why.
- **`docs/DEPLOYMENT.md`** — prerequisites; build images; `docker compose -f docker-compose.prod.yml up`; env-var table; migrations + optional seed; the CI overview; ports; scaling/ops notes.
- **`README.md` refresh** — current stack + feature list (Phases 0–5), a dev quickstart (link `RUNBOOK.md`) + a prod quickstart (link `DEPLOYMENT.md`), architecture link, screenshots/structure. Replace any stale legacy content.
- **Archive legacy docs** — `git mv` the Flask-era docs into `legacy/docs/`: `docs/deployment_guide.md`, `docs/user_manual.md`, `docs/future_enhancements.md`, `docs/diagrams/`, `docs/api/` (verify each is legacy before moving). Keep `docs/RUNBOOK.md` and `docs/superpowers/`.

## 8. Production env
- `.env.production.example` at repo root: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ML_SERVICE_URL`, `NODE_ENV`, optional `VITE_API_URL`. No real secrets committed; `.gitignore` already ignores `.env*` except examples.

## 9. Testing / verification
- **CI YAML:** `actionlint` if available; else careful review against the documented steps.
- **Docker builds (local, this session):** `docker compose -f docker-compose.prod.yml build` must succeed for all four services.
- **Prod-compose smoke (local):** `docker compose -f docker-compose.prod.yml up -d`; wait for health; `curl http://localhost:8080` (web) returns the SPA; `curl http://localhost:8080/api/v1/health` (proxied) → `{"status":"ok"}`; api logs show `migrate deploy` ran.
- **No app regressions:** `pnpm -r test` + `pytest` still green (Phase 5 is infra/docs only — these should be untouched).
- **Docs:** links resolve; no stale Flask instructions remain in `README.md`/`docs/` (outside `legacy/`).

## 10. Locked decisions
- Provider-agnostic **full-stack Docker Compose** + per-service Dockerfiles.
- Web = Vite static behind **nginx**, proxying `/api` → api.
- CI = lint + typecheck + Node tests (Postgres service on **5544**) + Python tests + a docker-build job; **no registry push**.
- **Archive** legacy Flask docs to `legacy/docs/`; write fresh `ARCHITECTURE.md` + `DEPLOYMENT.md` + README refresh.
- api image runs `prisma migrate deploy` on startup.

## 11. Milestones (for the plan)
1. CI workflow (`node` + `python` + `docker-build` jobs).
2. `apps/api/Dockerfile` (+ `.dockerignore`, migrate-on-start).
3. `apps/web/Dockerfile` + `nginx.conf`.
4. `docker-compose.prod.yml` + `.env.production.example` + local build/up smoke.
5. Docs: `ARCHITECTURE.md` + `DEPLOYMENT.md` + README refresh + archive legacy docs.
6. End-to-end verification (image builds, prod-compose smoke, suites still green; CI on push).

# Phase 5 — Docs & Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** CI (GitHub Actions), full-stack containerization (api + web), a production `docker-compose.prod.yml`, and current architecture/deployment docs — superseding the legacy Flask docs. Final phase; infra + docs only.

**Architecture:** web (nginx, serves Vite static + proxies `/api`→api) → api (node 20, **tsx** runtime, migrate-on-start) → db (pg 16); api → ml (FastAPI) over HTTP. See `docs/superpowers/specs/2026-06-28-phase-5-docs-deploy-design.md`.

**Tech Stack:** GitHub Actions, Docker, docker-compose, nginx, pnpm 9, Node 20, Python 3.12.

## Global Constraints
- **No app/contract/schema changes** — Phase 5 must not modify `apps/*/src` logic, `packages/shared/src`, `services/ml/app`, or Prisma schema. (Editing `package.json` deps/scripts, adding Dockerfiles/CI/compose/docs, and `git mv` of legacy docs are allowed.)
- The prod api runs via **`tsx`** (not compiled) because `@sev/shared` is TS-source; matches dev.
- CI Postgres service publishes on host **5544** (the committed `apps/api/.env.test` — loaded by `vitest.config.ts` with `override:true` — points at `localhost:5544/smartev_test`).
- Web is built with `VITE_API_URL=/api/v1` so the browser calls same-origin; nginx proxies `/api/`→`api:4000`.
- Suites must stay green (`pnpm -r test`, `pytest`); CI itself is verified on first push (cannot run in-session). Commit per task; trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## File Structure
**Create:** `.github/workflows/ci.yml`; `apps/api/Dockerfile`, `apps/api/.dockerignore`; `apps/web/Dockerfile`, `apps/web/nginx.conf` (+ `apps/web/.dockerignore`); `docker-compose.prod.yml`; `.env.production.example`; `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`.
**Modify:** `README.md`. **Move:** `docs/{deployment_guide.md,user_manual.md,future_enhancements.md,diagrams/,api/}` → `legacy/docs/`.

---

## Milestone 1 — CI

### Task 1.1: GitHub Actions workflow
**Files:** Create `.github/workflows/ci.yml`.
- [ ] **Step 1: Confirm lint is green locally** (CI runs it): `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 20; pnpm -r lint`. If it fails, STOP and report — do not weaken the CI (the controller decides whether to fix lint or drop the lint step).
- [ ] **Step 2: Write the workflow**
```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  node:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_USER: sev, POSTGRES_PASSWORD: sev, POSTGRES_DB: smartev_test }
        ports: ["5544:5432"]
        options: >-
          --health-cmd "pg_isready -U sev" --health-interval 5s --health-timeout 5s --health-retries 15
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @sev/api exec prisma generate
      - run: pnpm --filter @sev/api exec prisma migrate deploy
        env: { DATABASE_URL: "postgresql://sev:sev@localhost:5544/smartev_test?schema=public" }
      - run: pnpm -r typecheck
      - run: pnpm -r lint
      - run: pnpm -r test
      - run: pnpm --filter @sev/web build
  python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r services/ml/requirements.txt ruff
      - run: ruff check services/ml
      - run: cd services/ml && pytest -q
  docker-build:
    runs-on: ubuntu-latest
    needs: node
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t sev-api -f apps/api/Dockerfile .
      - run: docker build -t sev-web -f apps/web/Dockerfile .
      - run: docker build -t sev-ml services/ml
```
- [ ] **Step 3: Validate** with `actionlint` if installed (`actionlint .github/workflows/ci.yml`); else verify YAML parses (`python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))"`). **Commit** `ci: GitHub Actions (node + python + docker-build)`. (The `docker-build` job references Dockerfiles created in M2/M3 — that's fine; the job only runs on GitHub after they exist on the branch.)

---

## Milestone 2 — API image

### Task 2.1: `apps/api/Dockerfile` (tsx runtime) + .dockerignore
**Files:** Create `apps/api/Dockerfile`, `apps/api/.dockerignore`.
- [ ] **Dockerfile**
```dockerfile
FROM node:20-slim
RUN corepack enable
WORKDIR /app
# All workspace manifests must be present or pnpm install errors on the workspace globs.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile
# Source needed to run the api via tsx (api + its workspace dep shared).
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN pnpm --filter @sev/api exec prisma generate
EXPOSE 4000
CMD ["sh","-c","pnpm --filter @sev/api exec prisma migrate deploy && pnpm --filter @sev/api exec tsx apps/api/src/server.ts"]
```
- [ ] **`apps/api/.dockerignore`**: `node_modules`, `dist`, `.env`, `*.log`, `test`, `coverage`.
- [ ] **Verify build:** `docker build -t sev-api -f apps/api/Dockerfile .` succeeds (allow a few min). **Commit** `feat(deploy): api Dockerfile (tsx runtime, migrate-on-start)`.

---

## Milestone 3 — Web image

### Task 3.1: `apps/web/Dockerfile` + nginx.conf
**Files:** Create `apps/web/Dockerfile`, `apps/web/nginx.conf`, `apps/web/.dockerignore`.
- [ ] **Dockerfile**
```dockerfile
FROM node:20-slim AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
ENV VITE_API_URL=/api/v1
RUN pnpm --filter @sev/web build
FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
```
- [ ] **nginx.conf**
```nginx
server {
  listen 80;
  server_name _;
  location /api/ {
    proxy_pass http://api:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
  location / {
    root /usr/share/nginx/html;
    try_files $uri /index.html;
  }
}
```
- [ ] **`apps/web/.dockerignore`**: `node_modules`, `dist`, `.env`, `*.log`.
- [ ] **Verify build:** `docker build -t sev-web -f apps/web/Dockerfile .` succeeds. **Commit** `feat(deploy): web Dockerfile (vite build → nginx + /api proxy)`.

---

## Milestone 4 — Production compose

### Task 4.1: `docker-compose.prod.yml` + prod env + smoke
**Files:** Create `docker-compose.prod.yml`, `.env.production.example`.
- [ ] **`docker-compose.prod.yml`**
```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment: { POSTGRES_USER: sev, POSTGRES_PASSWORD: sev, POSTGRES_DB: smartev }
    volumes: ["sev_pgdata_prod:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sev -d smartev"]
      interval: 10s
      timeout: 5s
      retries: 15
  ml:
    build: ./services/ml
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').status==200 else 1)"]
      interval: 10s
      timeout: 5s
      retries: 10
  api:
    build: { context: ., dockerfile: apps/api/Dockerfile }
    restart: unless-stopped
    environment:
      DATABASE_URL: "postgresql://sev:sev@db:5432/smartev?schema=public"
      ML_SERVICE_URL: "http://ml:8000"
      JWT_ACCESS_SECRET: "${JWT_ACCESS_SECRET:-dev-access-change-me}"
      JWT_REFRESH_SECRET: "${JWT_REFRESH_SECRET:-dev-refresh-change-me}"
      NODE_ENV: "production"
      PORT: "4000"
    depends_on:
      db: { condition: service_healthy }
      ml: { condition: service_healthy }
    healthcheck:
      test: ["CMD-SHELL", "node -e \"require('http').get('http://localhost:4000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))\""]
      interval: 10s
      timeout: 5s
      retries: 20
  web:
    build: { context: ., dockerfile: apps/web/Dockerfile }
    restart: unless-stopped
    ports: ["8080:80"]
    depends_on:
      api: { condition: service_healthy }
volumes:
  sev_pgdata_prod: {}
```
- [ ] **`.env.production.example`** (repo root): `JWT_ACCESS_SECRET="<long-random>"` + `JWT_REFRESH_SECRET="<different-long-random>"` + a comment that `DATABASE_URL`/`ML_SERVICE_URL` are wired by compose.
- [ ] **Smoke (local):** `docker compose -f docker-compose.prod.yml build` (all 4); `docker compose -f docker-compose.prod.yml up -d`; wait for `api` healthy; then:
  - `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/` → 200 (SPA).
  - `curl -s http://localhost:8080/api/v1/vehicles` → JSON `{"vehicles":[...]}` (proxy → api → db; empty list is fine — proves the chain; optionally seed first via `docker compose -f docker-compose.prod.yml run --rm api pnpm --filter @sev/api exec tsx prisma/seed.ts`).
  - `docker compose -f docker-compose.prod.yml logs api | grep -i "migrat"` → migrations applied on start.
  Then `docker compose -f docker-compose.prod.yml down` (keep the volume). **Commit** `feat(deploy): production docker-compose (db+ml+api+web) + env template`.
  (Auth over plain HTTP: cookies may need `secure:false`/TLS — the smoke uses only the public `/health` + `/vehicles`; document TLS for real auth in DEPLOYMENT.md.)

---

## Milestone 5 — Documentation

### Task 5.1: Architecture + Deployment docs + README refresh + archive legacy
**Files:** Create `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`; modify `README.md`; `git mv` legacy docs.
- [ ] **`docs/ARCHITECTURE.md`** — monorepo layout (`apps/web`, `apps/api`, `packages/shared`, `services/ml`); the 5 phases summary; request/data flow (browser→nginx/web→api→db, api→ml); the gaze→`ComponentView`→analytics→prediction pipeline + the graceful `PredictionService`/sentiment seam; Prisma schema overview (key models); tech choices + rationale. Use a couple of ASCII diagrams.
- [ ] **`docs/DEPLOYMENT.md`** — prerequisites (Docker); `docker compose -f docker-compose.prod.yml build && up -d`; env-var table (`JWT_*`, `DATABASE_URL`, `ML_SERVICE_URL`, `NODE_ENV`, `VITE_API_URL`); migrations (auto on api start) + optional seed command; ports (web 8080, api 4000, ml 8000, db 5432 internal); the CI overview; a TLS note for cookie auth in real deployments; ops notes (logs, volume, rebuild ml for sentiment).
- [ ] **`README.md` refresh** — current stack + Phases 0–5 feature list; **Dev quickstart** (link `docs/RUNBOOK.md`) + **Prod quickstart** (link `docs/DEPLOYMENT.md`); architecture link; repo structure. Remove/replace any stale legacy (Flask) content in the README body.
- [ ] **Archive legacy** (verify each is Flask-era first): `mkdir -p legacy/docs && git mv docs/deployment_guide.md docs/user_manual.md docs/future_enhancements.md legacy/docs/ 2>/dev/null` and `git mv docs/diagrams docs/api legacy/docs/ 2>/dev/null` (skip any that don't exist). Keep `docs/RUNBOOK.md` + `docs/superpowers/`. Add a one-line `legacy/docs/README.md` noting these describe the original Flask prototype.
- [ ] **Verify:** `pnpm -r typecheck` still clean (docs don't affect it); grep the refreshed `README.md` for stray "flask"/"gunicorn"/"pip install" (should be none outside `legacy/`). **Commit** `docs(phase-5): ARCHITECTURE + DEPLOYMENT + README refresh; archive legacy docs`.

---

## Milestone 6 — End-to-end verification (controller-run)
- [ ] `pnpm -r typecheck` clean; `pnpm -r test` green; `cd services/ml && pytest -q` green; `ruff check services/ml` clean; `pnpm -r lint` clean.
- [ ] `docker compose -f docker-compose.prod.yml build` — all four images build.
- [ ] `docker compose -f docker-compose.prod.yml up -d` → api healthy → web `/` 200 + `/api/v1/vehicles` proxied 200 → `down`.
- [ ] CI: confirmed green on the first push to GitHub (deferred — note in the final report).
- [ ] Final fixups commit if needed.

---

## Self-Review
- **Spec coverage:** CI (M1), api image (M2), web image (M3), prod compose (M4), docs + legacy archive (M5), verification (M6). ✓
- **Consistency:** CI PG on 5544 matches `.env.test`; web `VITE_API_URL=/api/v1` matches nginx `/api/` proxy; api `tsx` runtime matches the "no @sev/shared build" reality; compose env matches the Dockerfile's expected vars. ✓
- **No app changes:** only CI/Docker/compose/docs/deps + `git mv` — no `src` logic touched. ✓
- **No placeholders:** full YAML/Dockerfiles/nginx/compose given; docs have concrete section outlines; commands exact. ✓

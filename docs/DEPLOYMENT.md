# SmartEV Vision — Production Deployment

> For local development setup see `docs/RUNBOOK.md`.
> For architecture details see `docs/ARCHITECTURE.md`.

---

## Prerequisites

- **Docker** 24+ running (Docker Desktop on macOS/Windows, or `colima start` on macOS).
  No other local tooling is required for a prod run — Node, pnpm, and Python all live inside the images.

---

## Run in Production

```bash
# Clone the repo (if not already)
git clone https://github.com/ByteCodeSculptor/smartev-vision.git
cd smartev-vision

# Set required secrets (see env-var table below)
cp .env.production.example .env.production   # then edit JWT secrets

# Build images and start all four services
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

> **Project flag note:** On a clean host this is the only Compose stack, so no `-p` flag is needed.
> The flag `-p smartev-prod` was only used when running the prod stack alongside an existing dev
> stack (`docker compose up -d`) on the same machine to avoid name collisions.

The `api` container runs `prisma migrate deploy` automatically on start before the server
process begins. There is no manual migration step.

Check health:

```bash
docker compose -f docker-compose.prod.yml ps         # all four services should show "healthy"
curl -s http://localhost:8080/api/v1/vehicles | head  # proxied through nginx
```

Open **http://localhost:8080** in your browser.

---

## Environment Variables

The prod compose reads these from the `.env.production` file. Load it with `--env-file .env.production` when running the docker compose command (see the "Run in Production" section above).

| Variable | Required | Default in compose | Notes |
|----------|----------|--------------------|-------|
| `JWT_ACCESS_SECRET` | **Yes — set a real value** | `dev-access-change-me` | Signs short-lived access tokens. Use a random 64-char string. |
| `JWT_REFRESH_SECRET` | **Yes — set a real value** | `dev-refresh-change-me` | Signs long-lived refresh tokens. Must differ from access secret. |
| `DATABASE_URL` | Wired by compose | `postgresql://sev:sev@db:5432/smartev?schema=public` | Do not override unless connecting to an external Postgres. |
| `ML_SERVICE_URL` | Wired by compose | `http://ml:8000` | Do not override unless running ml externally. |
| `NODE_ENV` | Set by compose | `production` | Controls Express error verbosity and cookie `Secure` flag. |
| `VITE_API_URL` | Build-time (baked in) | `/api/v1` | Used by the Vite build; nginx proxies `/api/` to the api container. Override only if the api is on a different origin. |

---

## Optional: Seed the Database

After the stack is running, seed 3 roles, 3 vehicles, and demo users:

```bash
docker compose -f docker-compose.prod.yml run --rm api \
  pnpm --filter @sev/api exec tsx prisma/seed.ts
```

Seeded logins (password `Password123`):

| Email | Role |
|-------|------|
| admin@smartev.io | ADMIN |
| analyst@smartev.io | ANALYST |
| customer@smartev.io | CUSTOMER |

---

## Ports

| Service | Internal port | Host port |
|---------|--------------|-----------|
| web (nginx) | 80 | **8080** |
| api (Express) | 4000 | not published |
| ml (FastAPI) | 8000 | not published |
| db (Postgres) | 5432 | not published |

Only the `web` container exposes a host port. `api` and `ml` are reachable only within the
Docker bridge network. The `db` volume (`sev_pgdata_prod`) persists data across restarts.

---

## CI Overview (GitHub Actions)

The workflow at `.github/workflows/ci.yml` runs on every push to `main` and on all pull requests.

**Job `node`** (ubuntu-latest)
- Spins up a Postgres 16 service container published on host port **5544** (matches `apps/api/.env.test` used by the Vitest integration tests).
- Steps: checkout → pnpm install → `prisma generate` → `prisma migrate deploy` (against the CI test DB) → `pnpm -r typecheck` → `pnpm -r lint` → `pnpm -r test` → `pnpm --filter @sev/web build`.

**Job `python`** (ubuntu-latest)
- Steps: checkout → Python 3.12 setup → install `services/ml/requirements.txt` + `ruff` → `ruff check services/ml` → `cd services/ml && pytest -q`.

**Job `docker-build`** (ubuntu-latest, needs: node)
- Builds the three images (`apps/api`, `apps/web`, `services/ml`) without pushing, proving the Dockerfiles compile cleanly.

CI runs are verified on push to GitHub; they cannot be triggered from a local dev session.

---

## TLS Note

In production, auth cookies are set with `HttpOnly` and `SameSite=Lax`. For the `Secure` flag to
take effect (required for cookies to be sent over HTTPS), the stack must be fronted by a TLS
terminator — for example, an nginx reverse proxy, Caddy, or a cloud load balancer — that handles
HTTPS on port 443 and forwards to `localhost:8080`. Without HTTPS, browsers will not send `Secure`
cookies, and the auth flow will not work for cross-origin or public deployments.

---

## Ops Notes

**Logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f ml
```

**Persistent data volume:**
The Postgres data is stored in the named Docker volume `sev_pgdata_prod`. It survives `down`/`up`
cycles. To wipe and start fresh:
```bash
docker compose -f docker-compose.prod.yml down -v   # destroys the volume — data is gone
```

**Rebuild the ml image** (required to pick up changes to sentiment logic or ML model code):
```bash
docker compose -f docker-compose.prod.yml build ml
docker compose -f docker-compose.prod.yml up -d ml
```
The ml image always retrains the scikit-learn models from scratch during the Docker build
(`RUN python -m app.train`), so rebuilding picks up any new training data baked into the image.

**Stop without destroying data:**
```bash
docker compose -f docker-compose.prod.yml down      # stops + removes containers; volume survives
```

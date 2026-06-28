<h1 align="center">SmartEV Vision</h1>

<p align="center">
  <strong>VR showroom + gaze analytics + AI predictions for EV product research</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node 20"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18"/>
  <img src="https://img.shields.io/badge/Three.js-R3F-black?style=for-the-badge&logo=three.js&logoColor=white" alt="React Three Fiber"/>
  <img src="https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma + PostgreSQL"/>
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License"/>
</p>

---

## About

SmartEV Vision is a web platform that lets customers explore electric vehicles in a browser-based
3D/VR showroom while their **gaze and interactions are captured in real time**. The attention data
is fed into an AI/ML pipeline that produces per-session archetype predictions, interest-tier
classification, and vehicle recommendations — giving EV designers and marketers actionable insight
into what customers actually look at.

---

## Feature Phases

| Phase | Feature | Highlights |
|-------|---------|-----------|
| **0 — Foundation** | Auth + RBAC | JWT (access + refresh cookies), bcrypt, three roles: ADMIN / ANALYST / CUSTOMER, password-reset flow |
| **1 — VR Showroom** | 3D vehicle explorer | Real GLB models (Draco/KTX2), database-driven parts via `meshName` mapping, interactive hotspot panels, Orbit/Walk/First-person cameras, WebXR VR entry |
| **2 — Gaze & Analytics** | Attention capture | Raycast-based gaze at ~20 Hz, `ComponentView` dwell accumulation, 3D heatmap overlay, multi-dashboard with KPIs + session detail |
| **3 — AI/ML** | Predictions & recommender | scikit-learn RandomForest archetype + interest-tier classifiers, vehicle recommender, VADER sentiment, emotion placeholder |
| **4 — Feedback & Reports** | Customer voice | Post-session feedback form, VADER sentiment on comments, PDF/Excel report export (`pdfkit`, `exceljs`) |
| **5 — Docs & Deploy** | Production-ready | GitHub Actions CI, full-stack Docker images, `docker-compose.prod.yml`, architecture + deployment docs |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + React Three Fiber + Tailwind + shadcn/ui |
| Backend | Express + Prisma (Node 20, TypeScript via `tsx`) |
| Shared contracts | Zod schemas + TypeScript types (`packages/shared`) |
| ML service | FastAPI + scikit-learn + VADER (Python 3.12) |
| Database | PostgreSQL 16 (Prisma ORM) |
| Containerisation | Docker Compose (dev: db + ml; prod: all four services) |
| CI | GitHub Actions (node + python + docker-build jobs) |

---

## Repo Structure

```
smartev-vision/
├── apps/
│   ├── api/          # Express + Prisma backend; owns prisma/ schema + migrations
│   └── web/          # React + Vite + R3F frontend; nginx.conf for prod serving
├── packages/
│   └── shared/       # Zod contracts + types shared between api and web
├── services/
│   └── ml/           # FastAPI microservice — predictions, recommender, sentiment
├── docs/
│   ├── RUNBOOK.md       # Dev quickstart
│   ├── ARCHITECTURE.md  # System design + data flows
│   └── DEPLOYMENT.md    # Production deployment guide
├── legacy/docs/      # Original prototype docs (archived; see legacy/docs/README.md)
├── docker-compose.yml         # Dev: db + ml only
└── docker-compose.prod.yml    # Prod: db + ml + api + web
```

---

## Dev Quickstart

See **[docs/RUNBOOK.md](docs/RUNBOOK.md)** for the full setup.

```bash
cp .env.example .env
docker compose up -d          # Postgres on host :5544
nvm use 20 && pnpm install
pnpm db:migrate && pnpm db:seed
pnpm dev                      # web :5173 + api :4000
```

---

## Prod Quickstart

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the full guide, env-var table, TLS notes, and ops commands.

```bash
# Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in your environment, then:
docker compose -f docker-compose.prod.yml up -d --build
# Open http://localhost:8080
```

---

## Architecture

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full monorepo layout, phase details,
request/data flow diagrams, the gaze-to-prediction pipeline, Prisma schema overview, and tech
rationale.

---

## License

MIT — see [LICENSE](LICENSE).

---

<p align="center">SmartEV Vision — enterprise rebuild on a TypeScript + React Three Fiber + FastAPI stack</p>

# SmartEV Vision — Phase 0 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a running, tested, documented enterprise foundation — pnpm monorepo, full Postgres schema, 3-role JWT auth API, glassmorphism design system, animated landing page, and role-aware dashboard shells.

**Architecture:** TypeScript monorepo (pnpm workspaces). `apps/web` (React + Vite + Tailwind + R3F) talks to `apps/api` (Express + Prisma) over REST with httpOnly-cookie auth; `packages/shared` holds zod contracts and types consumed by both. Postgres runs via Docker Compose. `services/ml` exists as an inert placeholder (built in Phase 3). Enterprise layering in the API: `routes → controllers → services → repositories(Prisma)`.

**Tech Stack:** Node 20, pnpm 9, TypeScript 5 (strict), Postgres 16, Prisma 5, Express 4, React 18, Vite 5, Tailwind 3, Framer Motion 11, @react-three/fiber 8 + drei, React Router 6, TanStack Query 5, zod 3, argon2, jsonwebtoken, Vitest, Supertest, Testing Library.

## Global Constraints

- **Package manager:** pnpm 9 with workspaces; Node `>=20`. Every package is `"type": "module"`, TypeScript `strict: true`, `"moduleResolution": "Bundler"` (web) / `"NodeNext"` (api).
- **API base path:** all endpoints under `/api/v1`. JSON only.
- **Auth:** access + refresh JWTs in **httpOnly, SameSite=Lax, Secure-in-prod** cookies named `sev_access` and `sev_refresh`. Passwords hashed with **argon2id**. Reset tokens stored as **sha256 hashes**, never plaintext.
- **Roles (verbatim):** `ADMIN`, `ANALYST`, `CUSTOMER`. Post-login redirect: `ADMIN → /admin`, `ANALYST → /insights`, `CUSTOMER → /app`.
- **Design tokens (verbatim):** dark base `#0a0a0f`, surface `#12121a`, neon-blue accent `#00d4ff`, violet `#a855f7`, teal `#06d6a0`. Font: Inter (UI), Space Grotesk (display).
- **Later-phase tables ship now but stay inert:** `HeatmapCell`, `EmotionDetection`, `GazeData`, `InteractionLog`, `Report`, `Feedback`, `Rating` get schema + seed only — no behavior in Phase 0.
- **Every task ends green:** `pnpm -w typecheck`, `pnpm -w lint`, and the task's tests must pass before commit. Conventional-commit messages.
- **Env:** all secrets via `.env` (never committed); `.env.example` documents every key.

## File Structure

```
package.json                      # workspace root: scripts, devDeps, packageManager
pnpm-workspace.yaml               # apps/*, packages/*, services/*
tsconfig.base.json                # shared compiler options
docker-compose.yml                # Postgres 16
.env.example                      # documented env keys
.gitignore

packages/shared/
  src/index.ts                    # barrel
  src/roles.ts                    # Role enum + zod
  src/contracts/auth.ts           # zod schemas: register/login/forgot/reset/profile/role
  src/types/api.ts                # AuthUser, ApiError, Paginated<T>
  src/providers/gaze.ts           # GazeProvider interface (inert seam)
  src/providers/emotion.ts        # EmotionProvider interface (inert seam)
  src/*.test.ts                   # vitest

prisma/
  schema.prisma                   # all 13 models + enums
  seed.ts                         # 3 role users, 3 vehicles+parts, synthetic sessions, audit
  seed.test.ts                    # seed count/role assertions

apps/api/
  src/config.ts                   # typed env loader
  src/db.ts                       # Prisma client singleton
  src/app.ts                      # express app factory (no listen)
  src/server.ts                   # listen()
  src/lib/cookies.ts              # set/clear auth cookies
  src/lib/mailer.ts               # console mailer (dev)
  src/middleware/error.ts         # central error handler
  src/middleware/auth.ts          # requireAuth, requireRole
  src/services/auth.service.ts    # hashing, JWT, reset tokens
  src/services/audit.service.ts   # audit()
  src/repositories/user.repo.ts   # Prisma user access
  src/controllers/auth.controller.ts
  src/controllers/user.controller.ts
  src/routes/auth.routes.ts
  src/routes/user.routes.ts
  src/routes/index.ts             # mounts /api/v1 + /health + /api/docs
  src/openapi.ts                  # OpenAPI 3 document
  test/helpers/db.ts              # disposable test DB harness
  test/*.test.ts                  # supertest integration

apps/web/
  index.html
  vite.config.ts
  tailwind.config.ts
  src/main.tsx
  src/index.css                   # tokens + base
  src/lib/apiClient.ts
  src/auth/AuthContext.tsx
  src/router.tsx
  src/routes/ProtectedRoute.tsx   # auth + role guards
  src/components/ui/*             # design-system primitives
  src/components/shell/AppShell.tsx
  src/pages/Landing.tsx + sections/*
  src/three/LowPolyCar.tsx        # R3F placeholder model
  src/pages/auth/*                # Login/Register/Forgot/Reset/Profile
  src/pages/dashboards/*          # Customer/Analyst/Admin shells
  src/test/setup.ts

services/ml/
  README.md                       # placeholder; built Phase 3

docs/
  diagrams/er-diagram.md
  api/openapi.json
  RUNBOOK.md                      # how to run Phase 0
```

---

## PART A — Workspace & Data Foundation

### Task 1: Monorepo scaffold + Postgres

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `docker-compose.yml`, `.env.example`, `.gitignore`
- Create: `services/ml/README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: workspace root scripts (`dev`, `db:migrate`, `db:seed`, `test`, `typecheck`, `lint`); a running Postgres on `localhost:5432`; env keys.

- [ ] **Step 1: Move legacy app aside and create root manifests**

```bash
mkdir -p legacy && git mv app config.py run.py setup_db.py generate_sample_data.py requirements.txt ml data tests legacy/ 2>/dev/null || true
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "services/*"
```

`package.json`:
```json
{
  "name": "smartev-vision",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "pnpm --parallel --filter ./apps/* dev",
    "db:migrate": "pnpm --filter @sev/api exec prisma migrate dev --schema ../../prisma/schema.prisma",
    "db:seed": "pnpm --filter @sev/api exec tsx ../../prisma/seed.ts",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "tsx": "^4.19.0",
    "prettier": "^3.3.0"
  }
}
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true
  }
}
```

`docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: sev
      POSTGRES_PASSWORD: sev
      POSTGRES_DB: smartev
    ports: ["5432:5432"]
    volumes: ["sev_pgdata:/var/lib/postgresql/data"]
volumes:
  sev_pgdata:
```

`.env.example`:
```bash
DATABASE_URL="postgresql://sev:sev@localhost:5432/smartev?schema=public"
JWT_ACCESS_SECRET="dev-access-change-me"
JWT_REFRESH_SECRET="dev-refresh-change-me"
ACCESS_TTL="900"          # 15m (seconds)
REFRESH_TTL="604800"      # 7d (seconds)
RESET_TTL="3600"          # 1h (seconds)
API_PORT="4000"
WEB_ORIGIN="http://localhost:5173"
NODE_ENV="development"
VITE_API_URL="http://localhost:4000/api/v1"
```

`.gitignore`:
```
node_modules/
dist/
.env
*.log
.DS_Store
```

`services/ml/README.md`:
```markdown
# services/ml (placeholder)
Python FastAPI + scikit-learn analytics service. Built in Phase 3 by lifting
`legacy/app/services/analytics.py`, `heatmap.py`, and `legacy/ml/`. Inert in Phase 0.
```

- [ ] **Step 2: Verify Postgres comes up**

Run: `cp .env.example .env && docker compose up -d && sleep 4 && docker compose exec -T db pg_isready -U sev`
Expected: `... accepting connections`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: scaffold pnpm monorepo + Postgres; archive legacy Flask app to legacy/"
```

### Task 2: `packages/shared` — contracts, types, provider seams

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`
- Create: `packages/shared/src/roles.ts`, `src/contracts/auth.ts`, `src/types/api.ts`, `src/providers/gaze.ts`, `src/providers/emotion.ts`, `src/index.ts`
- Test: `packages/shared/src/contracts/auth.test.ts`

**Interfaces:**
- Produces: `Role`, `RoleSchema`; `registerSchema`, `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `updateProfileSchema`, `updateRoleSchema` (all zod); types `RegisterInput`, `LoginInput`, `AuthUser`, `ApiError`, `Paginated<T>`; interfaces `GazeProvider`, `GazeSample`, `EmotionProvider`, `EmotionSample`.

- [ ] **Step 1: Write the failing test**

`packages/shared/src/contracts/auth.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema, updateRoleSchema } from "./auth.js";

describe("auth contracts", () => {
  it("accepts a valid registration", () => {
    const r = registerSchema.safeParse({ name: "Ada", email: "ada@x.io", password: "supersecret1" });
    expect(r.success).toBe(true);
  });
  it("rejects a short password", () => {
    const r = registerSchema.safeParse({ name: "Ada", email: "ada@x.io", password: "short" });
    expect(r.success).toBe(false);
  });
  it("rejects a bad email on login", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "supersecret1" }).success).toBe(false);
  });
  it("constrains role to the three enum values", () => {
    expect(updateRoleSchema.safeParse({ role: "ADMIN" }).success).toBe(true);
    expect(updateRoleSchema.safeParse({ role: "GOD" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sev/shared test`
Expected: FAIL — cannot find module `./auth.js`.

- [ ] **Step 3: Write package manifests + minimal implementation**

`packages/shared/package.json`:
```json
{
  "name": "@sev/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "echo ok"
  },
  "dependencies": { "zod": "^3.23.0" },
  "devDependencies": { "vitest": "^2.1.0", "typescript": "^5.6.0" }
}
```

`packages/shared/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "moduleResolution": "Bundler" }, "include": ["src"] }
```

`packages/shared/src/roles.ts`:
```ts
import { z } from "zod";
export const RoleSchema = z.enum(["ADMIN", "ANALYST", "CUSTOMER"]);
export type Role = z.infer<typeof RoleSchema>;
export const ROLE_HOME: Record<Role, string> = { ADMIN: "/admin", ANALYST: "/insights", CUSTOMER: "/app" };
```

`packages/shared/src/contracts/auth.ts`:
```ts
import { z } from "zod";
import { RoleSchema } from "../roles.js";

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  age: z.number().int().min(13).max(120).optional(),
  gender: z.string().max(40).optional(),
});
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const forgotPasswordSchema = z.object({ email: z.string().email() });
export const resetPasswordSchema = z.object({ token: z.string().min(10), password: z.string().min(8).max(200) });
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  age: z.number().int().min(13).max(120).optional(),
  gender: z.string().max(40).optional(),
  avatarUrl: z.string().url().max(500).optional(),
});
export const updateRoleSchema = z.object({ role: RoleSchema });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

`packages/shared/src/types/api.ts`:
```ts
import type { Role } from "../roles.js";
export interface AuthUser {
  id: string; email: string; name: string; role: Role;
  age?: number | null; gender?: string | null; avatarUrl?: string | null;
}
export interface ApiError { error: string; code?: string; details?: unknown; }
export interface Paginated<T> { items: T[]; total: number; page: number; pageSize: number; }
```

`packages/shared/src/providers/gaze.ts`:
```ts
/** Inert seam (Phase 2 implements SimulatedMouseGazeProvider; Tobii/WebGazer later). */
export interface GazeSample { tMs: number; x: number; y: number; depth?: number; partMeshName?: string; }
export interface GazeProvider {
  readonly id: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  onSample(cb: (s: GazeSample) => void): () => void;
}
```

`packages/shared/src/providers/emotion.ts`:
```ts
/** Inert seam (later phase implements OpenCV/DeepFace/MediaPipe provider). */
export interface EmotionSample { tMs: number; emotion: string; confidence: number; }
export interface EmotionProvider {
  readonly id: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  onSample(cb: (s: EmotionSample) => void): () => void;
}
```

`packages/shared/src/index.ts`:
```ts
export * from "./roles.js";
export * from "./contracts/auth.js";
export * from "./types/api.js";
export * from "./providers/gaze.js";
export * from "./providers/emotion.js";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm install && pnpm --filter @sev/shared test`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/shared && git commit -m "feat(shared): zod auth contracts, API types, gaze/emotion provider seams"
```

### Task 3: Prisma schema (all 13 models) + migration

**Files:**
- Create: `prisma/schema.prisma`
- Modify: `apps/api/package.json` (created here as the Prisma host package)

**Interfaces:**
- Produces: generated Prisma client with models `User, PasswordResetToken, Vehicle, VehiclePart, Session, GazeData, InteractionLog, HeatmapCell, EmotionDetection, Feedback, Rating, Report, AuditLog` and enums `Role, VehicleType, PartCategory, SessionStatus, InteractionType, ReportType, AuditAction`.

- [ ] **Step 1: Create the api host package + Prisma deps**

`apps/api/package.json`:
```json
{
  "name": "@sev/api",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "echo ok",
    "prisma": "prisma"
  },
  "dependencies": {
    "@prisma/client": "^5.20.0",
    "@sev/shared": "workspace:*",
    "argon2": "^0.41.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "jsonwebtoken": "^9.0.2",
    "swagger-ui-express": "^5.0.1",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/supertest": "^6.0.2",
    "@types/swagger-ui-express": "^4.1.6",
    "prisma": "^5.20.0",
    "supertest": "^7.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Write `prisma/schema.prisma`**

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role { ADMIN ANALYST CUSTOMER }
enum VehicleType { SEDAN SUV HATCHBACK TRUCK SPORTS }
enum PartCategory { EXTERIOR INTERIOR WHEELS LIGHTING BATTERY INFOTAINMENT DOORS MIRRORS }
enum SessionStatus { ACTIVE COMPLETED ABANDONED }
enum InteractionType { HOVER FOCUS CLICK OPEN ROTATE ZOOM }
enum ReportType { PDF EXCEL }
enum AuditAction { LOGIN LOGOUT REGISTER PASSWORD_RESET ROLE_CHANGE VEHICLE_CREATE VEHICLE_UPDATE VEHICLE_DELETE REPORT_GENERATE DATA_EXPORT }

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role     @default(CUSTOMER)
  age          Int?
  gender       String?
  avatarUrl    String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  sessions     Session[]
  feedback     Feedback[]
  ratings      Rating[]
  reports      Report[]
  auditLogs    AuditLog[]
  resetTokens  PasswordResetToken[]
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model Vehicle {
  id           String        @id @default(cuid())
  slug         String        @unique
  name         String
  make         String
  modelName    String
  year         Int
  type         VehicleType
  batteryKwh   Float
  rangeKm      Int
  priceUsd     Int
  modelUrl     String
  thumbnailUrl String?
  description  String?
  isPublished  Boolean       @default(true)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  parts        VehiclePart[]
  sessions     Session[]
  feedback     Feedback[]
  ratings      Rating[]
}

model VehiclePart {
  id           String       @id @default(cuid())
  vehicleId    String
  name         String
  category     PartCategory
  meshName     String
  description  String?
  displayOrder Int          @default(0)
  vehicle      Vehicle      @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  gaze         GazeData[]
  interactions InteractionLog[]
  heatmap      HeatmapCell[]
  ratings      Rating[]
  @@index([vehicleId])
}

model Session {
  id              String        @id @default(cuid())
  userId          String
  vehicleId       String
  startedAt       DateTime      @default(now())
  endedAt         DateTime?
  durationSec     Float?
  device          String        @default("web")
  status          SessionStatus @default(ACTIVE)
  engagementScore Float?
  createdAt       DateTime      @default(now())
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  vehicle         Vehicle       @relation(fields: [vehicleId], references: [id])
  gaze            GazeData[]
  interactions    InteractionLog[]
  heatmap         HeatmapCell[]
  emotions        EmotionDetection[]
  feedback        Feedback[]
  reports         Report[]
  @@index([userId])
  @@index([vehicleId])
  @@index([startedAt])
}

model GazeData {
  id        String       @id @default(cuid())
  sessionId String
  partId    String?
  tMs       Float
  x         Float
  y         Float
  depth     Float?
  createdAt DateTime     @default(now())
  session   Session      @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  part      VehiclePart? @relation(fields: [partId], references: [id])
  @@index([sessionId])
}

model InteractionLog {
  id        String          @id @default(cuid())
  sessionId String
  partId    String?
  type      InteractionType
  tMs       Float
  metadata  Json?
  createdAt DateTime        @default(now())
  session   Session         @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  part      VehiclePart?    @relation(fields: [partId], references: [id])
  @@index([sessionId])
}

model HeatmapCell {
  id        String       @id @default(cuid())
  sessionId String
  partId    String?
  x         Float
  y         Float
  intensity Float
  session   Session      @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  part      VehiclePart? @relation(fields: [partId], references: [id])
  @@index([sessionId])
}

model EmotionDetection {
  id         String   @id @default(cuid())
  sessionId  String
  tMs        Float
  emotion    String
  confidence Float
  createdAt  DateTime @default(now())
  session    Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  @@index([sessionId])
}

model Feedback {
  id              String   @id @default(cuid())
  userId          String
  vehicleId       String
  sessionId       String?
  comment         String?
  favoriteFeature String?
  suggestion      String?
  sentiment       String?
  createdAt       DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  vehicle         Vehicle  @relation(fields: [vehicleId], references: [id])
  session         Session? @relation(fields: [sessionId], references: [id])
  @@index([vehicleId])
}

model Rating {
  id        String       @id @default(cuid())
  userId    String
  vehicleId String
  partId    String?
  score     Int
  createdAt DateTime     @default(now())
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  vehicle   Vehicle      @relation(fields: [vehicleId], references: [id])
  part      VehiclePart? @relation(fields: [partId], references: [id])
  @@index([vehicleId])
}

model Report {
  id            String     @id @default(cuid())
  generatedById String
  sessionId     String?
  type          ReportType
  scope         String
  fileUrl       String
  createdAt     DateTime   @default(now())
  generatedBy   User       @relation(fields: [generatedById], references: [id])
  session       Session?   @relation(fields: [sessionId], references: [id])
  @@index([generatedById])
}

model AuditLog {
  id          String      @id @default(cuid())
  actorUserId String?
  action      AuditAction
  entityType  String?
  entityId    String?
  metadata    Json?
  ip          String?
  userAgent   String?
  createdAt   DateTime    @default(now())
  actor       User?       @relation(fields: [actorUserId], references: [id])
  @@index([actorUserId])
  @@index([createdAt])
}
```

- [ ] **Step 3: Generate client + create migration**

Run: `pnpm install && pnpm --filter @sev/api exec prisma migrate dev --name init --schema ../../prisma/schema.prisma`
Expected: migration `init` created in `prisma/migrations/`, "Your database is now in sync", client generated.

- [ ] **Step 4: Verify the schema is valid**

Run: `pnpm --filter @sev/api exec prisma validate --schema ../../prisma/schema.prisma`
Expected: "The schema at ../../prisma/schema.prisma is valid 🚀"

- [ ] **Step 5: Commit**

```bash
git add apps/api/package.json prisma pnpm-lock.yaml && git commit -m "feat(db): full normalized Prisma schema (13 models, audit log) + init migration"
```

### Task 4: Seed data

**Files:**
- Create: `prisma/seed.ts`
- Test: `prisma/seed.test.ts`

**Interfaces:**
- Consumes: Prisma client, `argon2`.
- Produces: a runnable seed creating exactly 3 users (one per role), 3 vehicles (each with 8 parts), 6 completed sessions, plus sample feedback/ratings/audit rows. Seed users: `admin@smartev.io`, `analyst@smartev.io`, `customer@smartev.io`, all password `Password123`.

- [ ] **Step 1: Write the failing test**

`prisma/seed.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { runSeed } from "./seed.js";

const prisma = new PrismaClient();
beforeAll(async () => { await runSeed(prisma); });
afterAll(async () => { await prisma.$disconnect(); });

describe("seed", () => {
  it("creates one user per role", async () => {
    const roles = await prisma.user.groupBy({ by: ["role"], _count: true });
    expect(roles.length).toBe(3);
  });
  it("creates 3 vehicles with 8 parts each", async () => {
    const vehicles = await prisma.vehicle.findMany({ include: { parts: true } });
    expect(vehicles.length).toBe(3);
    for (const v of vehicles) expect(v.parts.length).toBe(8);
  });
  it("creates audit rows", async () => {
    expect(await prisma.auditLog.count()).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sev/api exec vitest run ../../prisma/seed.test.ts`
Expected: FAIL — cannot find `./seed.js` / `runSeed`.

- [ ] **Step 3: Implement `prisma/seed.ts`**

```ts
import { PrismaClient, Role, VehicleType, PartCategory, SessionStatus, AuditAction } from "@prisma/client";
import argon2 from "argon2";

const PARTS: { name: string; category: PartCategory; meshName: string }[] = [
  { name: "Hood", category: "EXTERIOR", meshName: "hood" },
  { name: "Body", category: "EXTERIOR", meshName: "body" },
  { name: "Front Wheels", category: "WHEELS", meshName: "wheels" },
  { name: "Headlights", category: "LIGHTING", meshName: "headlights" },
  { name: "Windshield", category: "EXTERIOR", meshName: "windshield" },
  { name: "Doors", category: "DOORS", meshName: "doors" },
  { name: "Infotainment", category: "INFOTAINMENT", meshName: "infotainment" },
  { name: "Battery Pack", category: "BATTERY", meshName: "battery" },
];

const VEHICLES = [
  { slug: "aurora-s", name: "Aurora S", make: "SmartEV", modelName: "Aurora", year: 2026, type: "SEDAN" as VehicleType, batteryKwh: 82, rangeKm: 560, priceUsd: 48000 },
  { slug: "terra-x", name: "Terra X", make: "SmartEV", modelName: "Terra", year: 2026, type: "SUV" as VehicleType, batteryKwh: 100, rangeKm: 610, priceUsd: 61000 },
  { slug: "volt-gt", name: "Volt GT", make: "SmartEV", modelName: "Volt", year: 2026, type: "SPORTS" as VehicleType, batteryKwh: 95, rangeKm: 540, priceUsd: 89000 },
];

export async function runSeed(prisma: PrismaClient): Promise<void> {
  // Idempotent reset (FK-safe order)
  await prisma.$transaction([
    prisma.auditLog.deleteMany(), prisma.report.deleteMany(), prisma.rating.deleteMany(),
    prisma.feedback.deleteMany(), prisma.emotionDetection.deleteMany(), prisma.heatmapCell.deleteMany(),
    prisma.interactionLog.deleteMany(), prisma.gazeData.deleteMany(), prisma.session.deleteMany(),
    prisma.vehiclePart.deleteMany(), prisma.vehicle.deleteMany(),
    prisma.passwordResetToken.deleteMany(), prisma.user.deleteMany(),
  ]);

  const passwordHash = await argon2.hash("Password123", { type: argon2.argon2id });
  const roles: Role[] = ["ADMIN", "ANALYST", "CUSTOMER"];
  const users = await Promise.all(roles.map((role) =>
    prisma.user.create({ data: {
      email: `${role.toLowerCase()}@smartev.io`, name: `${role[0]}${role.slice(1).toLowerCase()} User`,
      role, passwordHash, age: 30, gender: "other",
    } })));
  const customer = users.find((u) => u.role === "CUSTOMER")!;

  const vehicles = [];
  for (const v of VEHICLES) {
    const vehicle = await prisma.vehicle.create({ data: {
      ...v, modelUrl: `/models/${v.slug}.glb`, thumbnailUrl: `/thumbs/${v.slug}.png`,
      description: `${v.name} — a ${v.type.toLowerCase()} EV.`,
      parts: { create: PARTS.map((p, i) => ({ ...p, displayOrder: i })) },
    } });
    vehicles.push(vehicle);
  }

  // Synthetic completed sessions so later dashboards have data
  for (let i = 0; i < 6; i++) {
    const vehicle = vehicles[i % vehicles.length]!;
    const started = new Date(Date.now() - (i + 1) * 86_400_000);
    await prisma.session.create({ data: {
      userId: customer.id, vehicleId: vehicle.id, startedAt: started,
      endedAt: new Date(started.getTime() + 120_000), durationSec: 120,
      status: "COMPLETED" as SessionStatus, engagementScore: 60 + i * 5, device: "web",
    } });
  }

  await prisma.feedback.create({ data: {
    userId: customer.id, vehicleId: vehicles[0]!.id, comment: "Love the interior.",
    favoriteFeature: "Infotainment", sentiment: "positive",
  } });
  await prisma.rating.create({ data: { userId: customer.id, vehicleId: vehicles[0]!.id, score: 5 } });
  await prisma.auditLog.create({ data: { actorUserId: users[0]!.id, action: "LOGIN" as AuditAction } });

  console.log(`Seeded ${users.length} users, ${vehicles.length} vehicles, 6 sessions.`);
}

// Allow `tsx prisma/seed.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  const prisma = new PrismaClient();
  runSeed(prisma).catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @sev/api exec vitest run ../../prisma/seed.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts prisma/seed.test.ts && git commit -m "feat(db): idempotent seed (3 roles, 3 vehicles x8 parts, sessions, audit)"
```

---

## PART B — Backend Auth API (`apps/api`)

> Layering: `routes → controllers → services/repositories`. `req.user` is `{ id, role }`, set by `requireAuth`. All routes mount under `/api/v1`.

### Task 5: API skeleton + health route + test harness

**Files:**
- Create: `apps/api/src/config.ts`, `src/db.ts`, `src/lib/httpError.ts`, `src/middleware/error.ts`, `src/app.ts`, `src/server.ts`, `src/routes/index.ts`, `src/types/express.d.ts`, `apps/api/tsconfig.json`, `apps/api/vitest.config.ts`, `apps/api/test/helpers/db.ts`, `apps/api/.env.test`
- Test: `apps/api/test/health.test.ts`

**Interfaces:**
- Produces: `createApp(): express.Express`; `prisma` (singleton); `env` config; `HttpError`; `errorHandler`; `resetDb()` + test `prisma`. `req.user?: { id: string; role: Role }`.

- [ ] **Step 1: Write the failing test**

`apps/api/test/health.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(createApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sev/api add dotenv && pnpm --filter @sev/api test`
Expected: FAIL — cannot find `../src/app.js`.

- [ ] **Step 3: Implement the skeleton**

`apps/api/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json",
  "compilerOptions": { "moduleResolution": "NodeNext", "module": "NodeNext", "outDir": "dist", "rootDir": "src" },
  "include": ["src"] }
```

`apps/api/src/config.ts`:
```ts
import "dotenv/config";
function req(name: string): string { const v = process.env[name]; if (!v) throw new Error(`Missing env ${name}`); return v; }
export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.API_PORT ?? 4000),
  jwtAccessSecret: req("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: req("JWT_REFRESH_SECRET"),
  accessTtl: Number(process.env.ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.REFRESH_TTL ?? 604800),
  resetTtl: Number(process.env.RESET_TTL ?? 3600),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
};
```

`apps/api/src/db.ts`:
```ts
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();
```

`apps/api/src/lib/httpError.ts`:
```ts
export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}
```

`apps/api/src/middleware/error.ts`:
```ts
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/httpError.js";
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) return res.status(400).json({ error: "Validation failed", details: err.flatten() });
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, code: err.code });
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
};
```

`apps/api/src/types/express.d.ts`:
```ts
import type { Role } from "@sev/shared";
declare global { namespace Express { interface Request { user?: { id: string; role: Role } } } }
export {};
```

`apps/api/src/routes/index.ts`:
```ts
import { Router } from "express";
export const router = Router();
router.get("/health", (_req, res) => res.json({ status: "ok" }));
```

`apps/api/src/app.ts`:
```ts
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { env } from "./config.js";
import { router } from "./routes/index.js";
import { errorHandler } from "./middleware/error.js";
export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: env.webOrigin, credentials: true }));
  app.use(router);
  app.use(errorHandler);
  return app;
}
```

`apps/api/src/server.ts`:
```ts
import { createApp } from "./app.js";
import { env } from "./config.js";
createApp().listen(env.port, () => console.log(`API listening on :${env.port}`));
```

`apps/api/.env.test`:
```bash
DATABASE_URL="postgresql://sev:sev@localhost:5432/smartev_test?schema=public"
JWT_ACCESS_SECRET="test-access"
JWT_REFRESH_SECRET="test-refresh"
```

`apps/api/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import { config } from "dotenv";
config({ path: "./.env.test" });
export default defineConfig({ test: { environment: "node", pool: "forks", fileParallelism: false } });
```

`apps/api/test/helpers/db.ts`:
```ts
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();
const TABLES = ['"AuditLog"','"Report"','"Rating"','"Feedback"','"EmotionDetection"','"HeatmapCell"',
  '"InteractionLog"','"GazeData"','"Session"','"VehiclePart"','"Vehicle"','"PasswordResetToken"','"User"'];
export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE;`);
}
```

Add `.env.test` to `.gitignore`:
```bash
printf "\n.env.test\n" >> .gitignore
```

- [ ] **Step 4: Prepare the test database, then run**

Run: `docker compose exec -T db createdb -U sev smartev_test 2>/dev/null; pnpm --filter @sev/api exec prisma migrate deploy --schema ../../prisma/schema.prisma` then set the test DB up by running migrations against it: `cd apps/api && DATABASE_URL="postgresql://sev:sev@localhost:5432/smartev_test?schema=public" pnpm exec prisma migrate deploy --schema ../../prisma/schema.prisma && cd ../..`
Then: `pnpm --filter @sev/api test`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add apps/api .gitignore && git commit -m "feat(api): express skeleton, health route, error handler, test DB harness"
```

### Task 6: Auth service (hashing, JWT, reset tokens)

**Files:**
- Create: `apps/api/src/services/auth.service.ts`
- Test: `apps/api/test/auth.service.test.ts`

**Interfaces:**
- Produces: `TokenPayload { sub: string; role: Role }`; `hashPassword`, `verifyPassword`, `signAccess`, `signRefresh`, `verifyAccess`, `verifyRefresh`, `hashResetToken`, `newResetToken`.

- [ ] **Step 1: Write the failing test**

`apps/api/test/auth.service.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import * as auth from "../src/services/auth.service.js";

describe("auth.service", () => {
  it("hashes and verifies a password", async () => {
    const h = await auth.hashPassword("Password123");
    expect(await auth.verifyPassword(h, "Password123")).toBe(true);
    expect(await auth.verifyPassword(h, "wrong")).toBe(false);
  });
  it("signs and verifies an access token", () => {
    const t = auth.signAccess({ sub: "u1", role: "ADMIN" });
    expect(auth.verifyAccess(t)).toMatchObject({ sub: "u1", role: "ADMIN" });
  });
  it("rejects a tampered token", () => {
    expect(() => auth.verifyAccess("not.a.jwt")).toThrow();
  });
  it("produces a deterministic reset-token hash", () => {
    const { raw, hash } = auth.newResetToken();
    expect(auth.hashResetToken(raw)).toBe(hash);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sev/api test auth.service`
Expected: FAIL — cannot find `auth.service.js`.

- [ ] **Step 3: Implement**

`apps/api/src/services/auth.service.ts`:
```ts
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import type { Role } from "@sev/shared";
import { env } from "../config.js";

export interface TokenPayload { sub: string; role: Role; }

export function hashPassword(pw: string): Promise<string> { return argon2.hash(pw, { type: argon2.argon2id }); }
export function verifyPassword(hash: string, pw: string): Promise<boolean> { return argon2.verify(hash, pw); }

export function signAccess(p: TokenPayload): string { return jwt.sign(p, env.jwtAccessSecret, { expiresIn: env.accessTtl }); }
export function signRefresh(p: TokenPayload): string { return jwt.sign(p, env.jwtRefreshSecret, { expiresIn: env.refreshTtl }); }
export function verifyAccess(t: string): TokenPayload { return jwt.verify(t, env.jwtAccessSecret) as TokenPayload; }
export function verifyRefresh(t: string): TokenPayload { return jwt.verify(t, env.jwtRefreshSecret) as TokenPayload; }

export function hashResetToken(raw: string): string { return createHash("sha256").update(raw).digest("hex"); }
export function newResetToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: hashResetToken(raw) };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sev/api test auth.service`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/auth.service.ts apps/api/test/auth.service.test.ts && git commit -m "feat(api): auth service — argon2 hashing, JWT access/refresh, reset tokens"
```

### Task 7: Audit service

**Files:**
- Create: `apps/api/src/services/audit.service.ts`
- Test: `apps/api/test/audit.service.test.ts`

**Interfaces:**
- Consumes: `prisma`, `AuditAction`.
- Produces: `audit(prisma, { actorUserId?, action, entityType?, entityId?, metadata?, req? }): Promise<void>`.

- [ ] **Step 1: Write the failing test**

`apps/api/test/audit.service.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma, resetDb } from "./helpers/db.js";
import { audit } from "../src/services/audit.service.js";

beforeEach(resetDb);

describe("audit.service", () => {
  it("writes an audit row", async () => {
    await audit(prisma, { action: "LOGIN", entityType: "User", entityId: "u1" });
    const rows = await prisma.auditLog.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: "LOGIN", entityType: "User", entityId: "u1" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sev/api test audit.service`
Expected: FAIL — cannot find `audit.service.js`.

- [ ] **Step 3: Implement**

`apps/api/src/services/audit.service.ts`:
```ts
import type { PrismaClient, AuditAction } from "@prisma/client";
import type { Request } from "express";
export interface AuditInput {
  actorUserId?: string | null; action: AuditAction;
  entityType?: string; entityId?: string; metadata?: unknown; req?: Request;
}
export async function audit(prisma: PrismaClient, input: AuditInput): Promise<void> {
  await prisma.auditLog.create({ data: {
    actorUserId: input.actorUserId ?? null, action: input.action,
    entityType: input.entityType, entityId: input.entityId,
    metadata: (input.metadata ?? undefined) as never,
    ip: input.req?.ip, userAgent: input.req?.get("user-agent") ?? undefined,
  } });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sev/api test audit.service`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/audit.service.ts apps/api/test/audit.service.test.ts && git commit -m "feat(api): central audit() service"
```

### Task 8: Cookies + auth/role middleware

**Files:**
- Create: `apps/api/src/lib/cookies.ts`, `src/middleware/auth.ts`
- Test: `apps/api/test/middleware.auth.test.ts`

**Interfaces:**
- Produces: `ACCESS_COOKIE`, `REFRESH_COOKIE`, `setAuthCookies(res, {access,refresh})`, `clearAuthCookies(res)`; `requireAuth`, `requireRole(...roles)`.

- [ ] **Step 1: Write the failing test**

`apps/api/test/middleware.auth.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { requireRole } from "../src/middleware/auth.js";
import { HttpError } from "../src/lib/httpError.js";
import type { Request, Response } from "express";

function call(role: string | undefined, allowed: any[]) {
  const req = { user: role ? { id: "u1", role } : undefined } as unknown as Request;
  const next = vi.fn();
  requireRole(...allowed)(req, {} as Response, next);
  return next.mock.calls[0]?.[0];
}

describe("requireRole", () => {
  it("passes when role is allowed", () => { expect(call("ADMIN", ["ADMIN"])).toBeUndefined(); });
  it("403s when role is not allowed", () => {
    const err = call("CUSTOMER", ["ADMIN"]);
    expect(err).toBeInstanceOf(HttpError); expect((err as HttpError).status).toBe(403);
  });
  it("401s when unauthenticated", () => {
    expect((call(undefined, ["ADMIN"]) as HttpError).status).toBe(401);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sev/api test middleware.auth`
Expected: FAIL — cannot find `middleware/auth.js`.

- [ ] **Step 3: Implement**

`apps/api/src/lib/cookies.ts`:
```ts
import type { Response } from "express";
import { env } from "../config.js";
export const ACCESS_COOKIE = "sev_access";
export const REFRESH_COOKIE = "sev_refresh";
const base = { httpOnly: true, sameSite: "lax" as const, secure: env.isProd, path: "/" };
export function setAuthCookies(res: Response, t: { access: string; refresh: string }): void {
  res.cookie(ACCESS_COOKIE, t.access, { ...base, maxAge: env.accessTtl * 1000 });
  res.cookie(REFRESH_COOKIE, t.refresh, { ...base, maxAge: env.refreshTtl * 1000 });
}
export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, base); res.clearCookie(REFRESH_COOKIE, base);
}
```

`apps/api/src/middleware/auth.ts`:
```ts
import type { Request, Response, NextFunction } from "express";
import type { Role } from "@sev/shared";
import { ACCESS_COOKIE } from "../lib/cookies.js";
import { verifyAccess } from "../services/auth.service.js";
import { HttpError } from "../lib/httpError.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return next(new HttpError(401, "Authentication required"));
  try { const p = verifyAccess(token); req.user = { id: p.sub, role: p.role }; next(); }
  catch { next(new HttpError(401, "Invalid or expired token")); }
}
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new HttpError(401, "Authentication required"));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, "Forbidden"));
    next();
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sev/api test middleware.auth`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/cookies.ts apps/api/src/middleware/auth.ts apps/api/test/middleware.auth.test.ts && git commit -m "feat(api): auth cookies + requireAuth/requireRole middleware"
```

### Task 9: Register + Login endpoints

**Files:**
- Create: `apps/api/src/repositories/user.repo.ts`, `src/controllers/helpers.ts`, `src/controllers/auth.controller.ts`, `src/routes/auth.routes.ts`
- Modify: `apps/api/src/routes/index.ts`
- Test: `apps/api/test/auth.register-login.test.ts`

**Interfaces:**
- Consumes: `auth.service`, `audit`, `setAuthCookies`, shared schemas.
- Produces: `userRepo` (findByEmail/findById/create/update/list); `asyncHandler`, `toAuthUser(user): AuthUser`, `issueAndSetTokens(res, {id,role})`; `POST /api/v1/auth/register`, `POST /api/v1/auth/login`; `register`, `login` controllers.

- [ ] **Step 1: Write the failing test**

`apps/api/test/auth.register-login.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";

const app = createApp();
beforeEach(resetDb);
const newUser = { name: "Ada Lovelace", email: "ada@smartev.io", password: "Password123" };

describe("register + login", () => {
  it("registers a user and sets auth cookies", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(newUser);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: newUser.email, role: "CUSTOMER" });
    expect(res.headers["set-cookie"].join(";")).toContain("sev_access");
  });
  it("rejects duplicate email with 409", async () => {
    await request(app).post("/api/v1/auth/register").send(newUser);
    const res = await request(app).post("/api/v1/auth/register").send(newUser);
    expect(res.status).toBe(409);
  });
  it("rejects a short password with 400", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({ ...newUser, password: "x" });
    expect(res.status).toBe(400);
  });
  it("logs in with correct credentials", async () => {
    await request(app).post("/api/v1/auth/register").send(newUser);
    const res = await request(app).post("/api/v1/auth/login").send({ email: newUser.email, password: newUser.password });
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"].join(";")).toContain("sev_access");
  });
  it("rejects wrong password with 401", async () => {
    await request(app).post("/api/v1/auth/register").send(newUser);
    const res = await request(app).post("/api/v1/auth/login").send({ email: newUser.email, password: "nope" });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sev/api test auth.register-login`
Expected: FAIL — 404 on `/api/v1/auth/register` (routes not mounted).

- [ ] **Step 3: Implement repo, helpers, controller, routes; mount them**

`apps/api/src/repositories/user.repo.ts`:
```ts
import { prisma } from "../db.js";
import type { Prisma } from "@prisma/client";
export const userRepo = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  findById: (id: string) => prisma.user.findUnique({ where: { id } }),
  create: (data: Prisma.UserCreateInput) => prisma.user.create({ data }),
  update: (id: string, data: Prisma.UserUpdateInput) => prisma.user.update({ where: { id }, data }),
  list: (skip: number, take: number) =>
    prisma.$transaction([
      prisma.user.findMany({ skip, take, orderBy: { createdAt: "desc" } }),
      prisma.user.count(),
    ]),
};
```

`apps/api/src/controllers/helpers.ts`:
```ts
import type { Response, RequestHandler } from "express";
import type { User } from "@prisma/client";
import type { AuthUser, Role } from "@sev/shared";
import { setAuthCookies } from "../lib/cookies.js";
import * as auth from "../services/auth.service.js";

export const asyncHandler = (fn: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function toAuthUser(u: User): AuthUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role, age: u.age, gender: u.gender, avatarUrl: u.avatarUrl };
}
export function issueAndSetTokens(res: Response, u: { id: string; role: Role }): void {
  setAuthCookies(res, { access: auth.signAccess({ sub: u.id, role: u.role }), refresh: auth.signRefresh({ sub: u.id, role: u.role }) });
}
```

`apps/api/src/controllers/auth.controller.ts`:
```ts
import type { Request, Response } from "express";
import { registerSchema, loginSchema } from "@sev/shared";
import { prisma } from "../db.js";
import { userRepo } from "../repositories/user.repo.js";
import * as auth from "../services/auth.service.js";
import { audit } from "../services/audit.service.js";
import { HttpError } from "../lib/httpError.js";
import { toAuthUser, issueAndSetTokens } from "./helpers.js";

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  if (await userRepo.findByEmail(input.email)) throw new HttpError(409, "Email already registered");
  const user = await userRepo.create({
    name: input.name, email: input.email, passwordHash: await auth.hashPassword(input.password),
    age: input.age, gender: input.gender,
  });
  await audit(prisma, { actorUserId: user.id, action: "REGISTER", entityType: "User", entityId: user.id, req });
  issueAndSetTokens(res, user);
  res.status(201).json({ user: toAuthUser(user) });
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const user = await userRepo.findByEmail(input.email);
  if (!user || !(await auth.verifyPassword(user.passwordHash, input.password))) throw new HttpError(401, "Invalid credentials");
  if (!user.isActive) throw new HttpError(403, "Account disabled");
  await audit(prisma, { actorUserId: user.id, action: "LOGIN", entityType: "User", entityId: user.id, req });
  issueAndSetTokens(res, user);
  res.json({ user: toAuthUser(user) });
}
```

`apps/api/src/routes/auth.routes.ts`:
```ts
import { Router } from "express";
import { asyncHandler } from "../controllers/helpers.js";
import * as ctrl from "../controllers/auth.controller.js";
export const authRoutes = Router();
authRoutes.post("/register", asyncHandler(ctrl.register));
authRoutes.post("/login", asyncHandler(ctrl.login));
```

Replace `apps/api/src/routes/index.ts` with:
```ts
import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
export const router = Router();
router.get("/health", (_req, res) => res.json({ status: "ok" }));
router.use("/api/v1/auth", authRoutes);
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sev/api test auth.register-login`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src apps/api/test/auth.register-login.test.ts && git commit -m "feat(api): register + login endpoints with audit + auth cookies"
```

### Task 10: Refresh + Logout endpoints

**Files:**
- Modify: `apps/api/src/controllers/auth.controller.ts`, `src/routes/auth.routes.ts`
- Test: `apps/api/test/auth.refresh-logout.test.ts`

**Interfaces:**
- Consumes: `verifyRefresh`, `clearAuthCookies`, `requireAuth`.
- Produces: `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`; `refresh`, `logout` controllers.

- [ ] **Step 1: Write the failing test**

`apps/api/test/auth.refresh-logout.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";

const app = createApp();
beforeEach(resetDb);
async function registerAgent() {
  const agent = request.agent(app);
  await agent.post("/api/v1/auth/register").send({ name: "Ada", email: "ada@smartev.io", password: "Password123" });
  return agent;
}

describe("refresh + logout", () => {
  it("issues fresh cookies on refresh", async () => {
    const agent = await registerAgent();
    const res = await agent.post("/api/v1/auth/refresh");
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"].join(";")).toContain("sev_access");
  });
  it("401s refresh without a refresh cookie", async () => {
    const res = await request(app).post("/api/v1/auth/refresh");
    expect(res.status).toBe(401);
  });
  it("clears cookies on logout", async () => {
    const agent = await registerAgent();
    const res = await agent.post("/api/v1/auth/logout");
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"].join(";")).toContain("sev_access=;");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sev/api test auth.refresh-logout`
Expected: FAIL — 404 on `/refresh`.

- [ ] **Step 3: Implement**

Add to `apps/api/src/controllers/auth.controller.ts` (new imports + functions):
```ts
import { REFRESH_COOKIE, clearAuthCookies } from "../lib/cookies.js";

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new HttpError(401, "Missing refresh token");
  let payload: auth.TokenPayload;
  try { payload = auth.verifyRefresh(token); } catch { throw new HttpError(401, "Invalid refresh token"); }
  const user = await userRepo.findById(payload.sub);
  if (!user || !user.isActive) throw new HttpError(401, "User no longer valid");
  issueAndSetTokens(res, user);
  res.json({ ok: true });
}

export async function logout(req: Request, res: Response) {
  if (req.user) await audit(prisma, { actorUserId: req.user.id, action: "LOGOUT", req });
  clearAuthCookies(res);
  res.json({ ok: true });
}
```

Add to `apps/api/src/routes/auth.routes.ts`:
```ts
import { requireAuth } from "../middleware/auth.js";
authRoutes.post("/refresh", asyncHandler(ctrl.refresh));
authRoutes.post("/logout", requireAuth, asyncHandler(ctrl.logout));
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sev/api test auth.refresh-logout`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src apps/api/test/auth.refresh-logout.test.ts && git commit -m "feat(api): refresh (rotation) + logout endpoints"
```

### Task 11: Forgot + Reset password (console mailer)

**Files:**
- Create: `apps/api/src/lib/mailer.ts`
- Modify: `apps/api/src/controllers/auth.controller.ts`, `src/routes/auth.routes.ts`
- Test: `apps/api/test/auth.reset.test.ts`

**Interfaces:**
- Consumes: `newResetToken`, `hashResetToken`, `hashPassword`, `mailer`.
- Produces: `mailer.sendPasswordReset(email, link)`; `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`; `forgotPassword`, `resetPassword` controllers.

- [ ] **Step 1: Write the failing test**

`apps/api/test/auth.reset.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma, resetDb } from "./helpers/db.js";
import { mailer } from "../src/lib/mailer.js";

const app = createApp();
beforeEach(resetDb);

describe("forgot + reset password", () => {
  it("always returns 200 for forgot (no account enumeration)", async () => {
    const res = await request(app).post("/api/v1/auth/forgot-password").send({ email: "ghost@smartev.io" });
    expect(res.status).toBe(200);
  });
  it("emails a reset link and resets the password", async () => {
    await request(app).post("/api/v1/auth/register").send({ name: "Ada", email: "ada@smartev.io", password: "Password123" });
    const spy = vi.spyOn(mailer, "sendPasswordReset").mockResolvedValue();
    await request(app).post("/api/v1/auth/forgot-password").send({ email: "ada@smartev.io" });
    const link = spy.mock.calls[0]![1];
    const token = new URL(link).searchParams.get("token")!;
    const res = await request(app).post("/api/v1/auth/reset-password").send({ token, password: "NewPassword123" });
    expect(res.status).toBe(200);
    const login = await request(app).post("/api/v1/auth/login").send({ email: "ada@smartev.io", password: "NewPassword123" });
    expect(login.status).toBe(200);
    spy.mockRestore();
  });
  it("rejects an unknown reset token with 400", async () => {
    const res = await request(app).post("/api/v1/auth/reset-password").send({ token: "0".repeat(64), password: "NewPassword123" });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sev/api test auth.reset`
Expected: FAIL — 404 on `/forgot-password`.

- [ ] **Step 3: Implement**

`apps/api/src/lib/mailer.ts`:
```ts
export interface Mailer { sendPasswordReset(email: string, link: string): Promise<void>; }
export const mailer: Mailer = {
  // Dev: log to console. Prod: swap for a Resend/SMTP adapter (same interface).
  async sendPasswordReset(email, link) { console.log(`[mailer] password reset for ${email}: ${link}`); },
};
```

Add to `apps/api/src/controllers/auth.controller.ts`:
```ts
import { forgotPasswordSchema, resetPasswordSchema } from "@sev/shared";
import { env } from "../config.js";
import { mailer } from "../lib/mailer.js";

export async function forgotPassword(req: Request, res: Response) {
  const { email } = forgotPasswordSchema.parse(req.body);
  const user = await userRepo.findByEmail(email);
  if (user) {
    const { raw, hash } = auth.newResetToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + env.resetTtl * 1000) },
    });
    await mailer.sendPasswordReset(email, `${env.webOrigin}/reset?token=${raw}`);
  }
  res.json({ ok: true }); // same response whether or not the account exists
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = resetPasswordSchema.parse(req.body);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: auth.hashResetToken(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) throw new HttpError(400, "Invalid or expired token");
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await auth.hashPassword(password) } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
  await audit(prisma, { actorUserId: row.userId, action: "PASSWORD_RESET", req });
  res.json({ ok: true });
}
```

Add to `apps/api/src/routes/auth.routes.ts`:
```ts
authRoutes.post("/forgot-password", asyncHandler(ctrl.forgotPassword));
authRoutes.post("/reset-password", asyncHandler(ctrl.resetPassword));
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sev/api test auth.reset`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src apps/api/test/auth.reset.test.ts && git commit -m "feat(api): forgot/reset password with hashed tokens + console mailer"
```

### Task 12: `GET /auth/me` + `PATCH /users/me`

**Files:**
- Create: `apps/api/src/controllers/user.controller.ts`, `src/routes/user.routes.ts`
- Modify: `apps/api/src/controllers/auth.controller.ts` (add `me`), `src/routes/auth.routes.ts`, `src/routes/index.ts`
- Test: `apps/api/test/user.me.test.ts`

**Interfaces:**
- Consumes: `requireAuth`, `updateProfileSchema`, `userRepo`.
- Produces: `GET /api/v1/auth/me`; `PATCH /api/v1/users/me`; `me` (auth.controller), `updateMe` (user.controller).

- [ ] **Step 1: Write the failing test**

`apps/api/test/user.me.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";

const app = createApp();
beforeEach(resetDb);
async function agent() {
  const a = request.agent(app);
  await a.post("/api/v1/auth/register").send({ name: "Ada", email: "ada@smartev.io", password: "Password123" });
  return a;
}

describe("me + profile", () => {
  it("returns the current user", async () => {
    const a = await agent();
    const res = await a.get("/api/v1/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("ada@smartev.io");
  });
  it("401s when unauthenticated", async () => {
    expect((await request(app).get("/api/v1/auth/me")).status).toBe(401);
  });
  it("updates the profile name", async () => {
    const a = await agent();
    const res = await a.patch("/api/v1/users/me").send({ name: "Ada L." });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Ada L.");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sev/api test user.me`
Expected: FAIL — 404 on `/auth/me`.

- [ ] **Step 3: Implement**

Add to `apps/api/src/controllers/auth.controller.ts`:
```ts
export async function me(req: Request, res: Response) {
  const user = await userRepo.findById(req.user!.id);
  if (!user) throw new HttpError(404, "User not found");
  res.json({ user: toAuthUser(user) });
}
```

`apps/api/src/controllers/user.controller.ts`:
```ts
import type { Request, Response } from "express";
import { updateProfileSchema } from "@sev/shared";
import { userRepo } from "../repositories/user.repo.js";
import { toAuthUser } from "./helpers.js";

export async function updateMe(req: Request, res: Response) {
  const input = updateProfileSchema.parse(req.body);
  const user = await userRepo.update(req.user!.id, input);
  res.json({ user: toAuthUser(user) });
}
```

`apps/api/src/routes/user.routes.ts`:
```ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../controllers/helpers.js";
import * as ctrl from "../controllers/user.controller.js";
export const userRoutes = Router();
userRoutes.patch("/me", requireAuth, asyncHandler(ctrl.updateMe));
```

Add to `apps/api/src/routes/auth.routes.ts`:
```ts
authRoutes.get("/me", requireAuth, asyncHandler(ctrl.me));
```

Add the user routes mount to `apps/api/src/routes/index.ts` (after the auth mount):
```ts
import { userRoutes } from "./user.routes.js";
router.use("/api/v1/users", userRoutes);
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sev/api test user.me`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src apps/api/test/user.me.test.ts && git commit -m "feat(api): GET /auth/me + PATCH /users/me"
```

### Task 13: Admin — list users + change role (RBAC)

**Files:**
- Modify: `apps/api/src/controllers/user.controller.ts`, `src/routes/user.routes.ts`
- Test: `apps/api/test/admin.users.test.ts`

**Interfaces:**
- Consumes: `requireRole("ADMIN")`, `updateRoleSchema`, `audit` (`ROLE_CHANGE`), `userRepo.list`.
- Produces: `GET /api/v1/users` (admin, paginated `Paginated<AuthUser>`); `PATCH /api/v1/users/:id/role` (admin); `listUsers`, `updateUserRole` controllers.

- [ ] **Step 1: Write the failing test**

`apps/api/test/admin.users.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma, resetDb } from "./helpers/db.js";
import { hashPassword } from "../src/services/auth.service.js";

const app = createApp();
beforeEach(resetDb);

async function seedAdminAgent() {
  await prisma.user.create({ data: { name: "Admin", email: "admin@smartev.io", role: "ADMIN", passwordHash: await hashPassword("Password123") } });
  const a = request.agent(app);
  await a.post("/api/v1/auth/login").send({ email: "admin@smartev.io", password: "Password123" });
  return a;
}

describe("admin users", () => {
  it("lets an admin list users", async () => {
    const a = await seedAdminAgent();
    const res = await a.get("/api/v1/users");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });
  it("forbids a customer from listing users", async () => {
    const a = request.agent(app);
    await a.post("/api/v1/auth/register").send({ name: "Cust", email: "c@smartev.io", password: "Password123" });
    expect((await a.get("/api/v1/users")).status).toBe(403);
  });
  it("lets an admin change a user role and audits it", async () => {
    const a = await seedAdminAgent();
    const target = await prisma.user.create({ data: { name: "T", email: "t@smartev.io", role: "CUSTOMER", passwordHash: "x" } });
    const res = await a.patch(`/api/v1/users/${target.id}/role`).send({ role: "ANALYST" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("ANALYST");
    expect(await prisma.auditLog.count({ where: { action: "ROLE_CHANGE" } })).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sev/api test admin.users`
Expected: FAIL — 404 on `/users`.

- [ ] **Step 3: Implement**

Add to `apps/api/src/controllers/user.controller.ts`:
```ts
import { updateRoleSchema } from "@sev/shared";
import { prisma } from "../db.js";
import { audit } from "../services/audit.service.js";

export async function listUsers(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const [users, total] = await userRepo.list((page - 1) * pageSize, pageSize);
  res.json({ items: users.map(toAuthUser), total, page, pageSize });
}

export async function updateUserRole(req: Request, res: Response) {
  const { role } = updateRoleSchema.parse(req.body);
  const user = await userRepo.update(req.params.id!, { role });
  await audit(prisma, { actorUserId: req.user!.id, action: "ROLE_CHANGE", entityType: "User", entityId: user.id, metadata: { role }, req });
  res.json({ user: toAuthUser(user) });
}
```

Add to `apps/api/src/routes/user.routes.ts`:
```ts
import { requireRole } from "../middleware/auth.js";
userRoutes.get("/", requireAuth, requireRole("ADMIN"), asyncHandler(ctrl.listUsers));
userRoutes.patch("/:id/role", requireAuth, requireRole("ADMIN"), asyncHandler(ctrl.updateUserRole));
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sev/api test admin.users`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src apps/api/test/admin.users.test.ts && git commit -m "feat(api): admin user list + role change with RBAC + audit"
```

### Task 14: OpenAPI spec + Swagger UI + docs export

**Files:**
- Create: `apps/api/src/openapi.ts`
- Modify: `apps/api/src/routes/index.ts`
- Create: `docs/api/openapi.json`
- Test: `apps/api/test/docs.test.ts`

**Interfaces:**
- Produces: `openapiDocument` (OpenAPI 3 object); `GET /api/docs` (Swagger UI) and `GET /api/openapi.json`.

- [ ] **Step 1: Write the failing test**

`apps/api/test/docs.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("api docs", () => {
  it("serves the OpenAPI json", async () => {
    const res = await request(createApp()).get("/api/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.paths["/auth/login"]).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sev/api test docs`
Expected: FAIL — 404 on `/api/openapi.json`.

- [ ] **Step 3: Implement**

`apps/api/src/openapi.ts`:
```ts
export const openapiDocument = {
  openapi: "3.0.3",
  info: { title: "SmartEV Vision API", version: "0.1.0", description: "Phase 0 — auth & users" },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/auth/register": { post: { summary: "Register", responses: { "201": { description: "Created" }, "409": { description: "Email exists" } } } },
    "/auth/login": { post: { summary: "Login", responses: { "200": { description: "OK" }, "401": { description: "Invalid credentials" } } } },
    "/auth/refresh": { post: { summary: "Rotate tokens", responses: { "200": { description: "OK" }, "401": { description: "No/invalid refresh" } } } },
    "/auth/logout": { post: { summary: "Logout", responses: { "200": { description: "OK" } } } },
    "/auth/forgot-password": { post: { summary: "Request reset", responses: { "200": { description: "OK" } } } },
    "/auth/reset-password": { post: { summary: "Reset password", responses: { "200": { description: "OK" }, "400": { description: "Invalid token" } } } },
    "/auth/me": { get: { summary: "Current user", responses: { "200": { description: "OK" }, "401": { description: "Unauthenticated" } } } },
    "/users/me": { patch: { summary: "Update profile", responses: { "200": { description: "OK" } } } },
    "/users": { get: { summary: "List users (admin)", responses: { "200": { description: "OK" }, "403": { description: "Forbidden" } } } },
    "/users/{id}/role": { patch: { summary: "Change role (admin)", responses: { "200": { description: "OK" } } } },
  },
} as const;
```

Add to `apps/api/src/routes/index.ts`:
```ts
import swaggerUi from "swagger-ui-express";
import { openapiDocument } from "../openapi.js";
router.get("/api/openapi.json", (_req, res) => res.json(openapiDocument));
router.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
```

Export the doc to `docs/api/openapi.json`:
```bash
mkdir -p docs/api
pnpm --filter @sev/api exec tsx -e "import('./src/openapi.js').then(m => process.stdout.write(JSON.stringify(m.openapiDocument, null, 2)))" > docs/api/openapi.json
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sev/api test docs`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/openapi.ts apps/api/src/routes/index.ts apps/api/test/docs.test.ts docs/api/openapi.json && git commit -m "feat(api): OpenAPI doc + Swagger UI at /api/docs"
```

---

## PART C — Frontend (`apps/web`)

> Cookie-based auth (no token storage in JS). `apiClient` always sends `credentials: "include"`. Tests run in jsdom; 3D is lazy-loaded and mocked in tests.

### Task 15: Web scaffold + Tailwind design tokens

**Files:**
- Create: `apps/web/package.json`, `index.html`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `apps/web/tsconfig.json`, `src/index.css`, `src/main.tsx`, `src/test/setup.ts`, `src/App.tsx`
- Test: `apps/web/src/App.test.tsx`

**Interfaces:**
- Produces: a Vite React app rendering `<App/>`; Tailwind tokens (`base`, `surface`, `neon`, `violet`, `teal`, fonts, `.glass`, `.glow-text`). `main.tsx` wires `QueryClientProvider > BrowserRouter > AuthProvider > AppRoutes` (AppRoutes added Task 18; for now App renders a placeholder).

- [ ] **Step 1: Write the failing test**

`apps/web/src/App.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App.js";

describe("App", () => {
  it("renders the brand", () => {
    render(<App />);
    expect(screen.getByText(/SmartEV Vision/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sev/web test` (after Step 3 installs deps; expect FAIL: cannot find `./App.js`).

- [ ] **Step 3: Implement scaffold**

`apps/web/package.json`:
```json
{
  "name": "@sev/web",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "echo ok"
  },
  "dependencies": {
    "@sev/shared": "workspace:*",
    "@tanstack/react-query": "^5.59.0",
    "@react-three/drei": "^9.114.0",
    "@react-three/fiber": "^8.17.0",
    "framer-motion": "^11.11.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.27.0",
    "three": "^0.169.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/three": "^0.169.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

`apps/web/index.html`:
```html
<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>SmartEV Vision</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

`apps/web/vite.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: { environment: "jsdom", globals: true, setupFiles: ["./src/test/setup.ts"] },
});
```

`apps/web/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json",
  "compilerOptions": { "moduleResolution": "Bundler", "jsx": "react-jsx", "types": ["vitest/globals", "@testing-library/jest-dom"] },
  "include": ["src"] }
```

`apps/web/tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { base: "#0a0a0f", surface: "#12121a", neon: "#00d4ff", violet: "#a855f7", teal: "#06d6a0" },
    fontFamily: { sans: ["Inter", "system-ui", "sans-serif"], display: ["'Space Grotesk'", "sans-serif"] },
    boxShadow: { glow: "0 0 24px rgba(0,212,255,0.35)" },
  } },
  plugins: [],
} satisfies Config;
```

`apps/web/postcss.config.js`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`apps/web/src/index.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;
@layer base { html, body, #root { height: 100%; } body { @apply bg-base text-slate-200 font-sans antialiased; } }
@layer components {
  .glass { @apply bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl; }
  .glow-text { text-shadow: 0 0 18px rgba(0,212,255,0.45); }
}
```

`apps/web/src/test/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

`apps/web/src/App.tsx` (placeholder until Task 18 wires the router):
```tsx
export default function App() {
  return <div className="p-8 font-display text-neon">SmartEV Vision</div>;
}
```

`apps/web/src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import "./index.css";
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
```

- [ ] **Step 4: Install + run to verify it passes**

Run: `pnpm install && pnpm --filter @sev/web test`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add apps/web && git commit -m "feat(web): Vite + React + Tailwind scaffold with design tokens"
```

### Task 16: Design-system primitives

**Files:**
- Create: `apps/web/src/components/ui/Button.tsx`, `GlassCard.tsx`, `Input.tsx`, `Badge.tsx`, `GradientText.tsx`, `StatCard.tsx`, `ChartCard.tsx`, `Skeleton.tsx`, `index.ts`
- Test: `apps/web/src/components/ui/ui.test.tsx`

**Interfaces:**
- Produces: `Button({variant})`, `GlassCard`, `Input`, `Field({label,error,children})`, `Badge`, `GradientText`, `StatCard({label,value,delta?,icon?})`, `ChartCard({title,children?})`, `Skeleton({className?})`, all re-exported from `components/ui/index.js`.

- [ ] **Step 1: Write the failing test**

`apps/web/src/components/ui/ui.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, Field, Input, StatCard } from "./index.js";

describe("ui primitives", () => {
  it("Button fires onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByText("Go"));
    expect(onClick).toHaveBeenCalledOnce();
  });
  it("Field shows an error message", () => {
    render(<Field label="Email" error="Required"><Input /></Field>);
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });
  it("StatCard shows label and value", () => {
    render(<StatCard label="Users" value={42} />);
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sev/web test ui.test`
Expected: FAIL — cannot find `./index.js`.

- [ ] **Step 3: Implement primitives**

`Button.tsx`:
```tsx
import type { ButtonHTMLAttributes } from "react";
type Variant = "primary" | "ghost" | "danger";
export function Button({ variant = "primary", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: "bg-neon text-base hover:shadow-glow",
    ghost: "bg-white/5 text-slate-200 hover:bg-white/10 border border-white/10",
    danger: "bg-rose-500 text-white hover:bg-rose-400",
  };
  return <button className={`px-4 py-2 rounded-xl font-medium transition disabled:opacity-50 ${styles[variant]} ${className}`} {...rest} />;
}
```

`GlassCard.tsx`:
```tsx
import type { HTMLAttributes } from "react";
export function GlassCard({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`glass p-6 ${className}`} {...rest} />;
}
```

`Input.tsx`:
```tsx
import type { InputHTMLAttributes, ReactNode } from "react";
export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-neon outline-none ${className}`} {...rest} />;
}
export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-slate-400">{label}</span>
      {children}
      {error && <span className="text-xs text-rose-400" role="alert">{error}</span>}
    </label>
  );
}
```

`Badge.tsx`:
```tsx
import type { ReactNode } from "react";
export function Badge({ children }: { children: ReactNode }) {
  return <span className="px-2 py-0.5 text-xs rounded-full bg-neon/15 text-neon border border-neon/30">{children}</span>;
}
```

`GradientText.tsx`:
```tsx
import type { ReactNode } from "react";
export function GradientText({ children }: { children: ReactNode }) {
  return <span className="bg-gradient-to-r from-neon to-violet bg-clip-text text-transparent">{children}</span>;
}
```

`StatCard.tsx`:
```tsx
import type { ReactNode } from "react";
import { GlassCard } from "./GlassCard.js";
export function StatCard({ label, value, delta, icon }: { label: string; value: ReactNode; delta?: string; icon?: ReactNode }) {
  return (
    <GlassCard className="flex items-center justify-between">
      <div>
        <div className="text-sm text-slate-400">{label}</div>
        <div className="text-2xl font-display text-white">{value}</div>
        {delta && <div className="text-xs text-teal">{delta}</div>}
      </div>
      {icon && <div className="text-neon text-3xl">{icon}</div>}
    </GlassCard>
  );
}
```

`ChartCard.tsx`:
```tsx
import type { ReactNode } from "react";
import { GlassCard } from "./GlassCard.js";
export function ChartCard({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <GlassCard>
      <div className="mb-3 font-display text-white">{title}</div>
      <div className="h-48 grid place-items-center text-slate-500 text-sm">{children ?? "Live data arrives in Phase 4"}</div>
    </GlassCard>
  );
}
```

`Skeleton.tsx`:
```tsx
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-white/10 rounded ${className}`} />;
}
```

`index.ts`:
```ts
export * from "./Button.js";
export * from "./GlassCard.js";
export * from "./Input.js";
export * from "./Badge.js";
export * from "./GradientText.js";
export * from "./StatCard.js";
export * from "./ChartCard.js";
export * from "./Skeleton.js";
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sev/web test ui.test`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui && git commit -m "feat(web): glassmorphism design-system primitives (Button, Field, StatCard, ChartCard, ...)"
```

### Task 17: API client + AuthContext

**Files:**
- Create: `apps/web/src/lib/apiClient.ts`, `src/auth/AuthContext.tsx`
- Test: `apps/web/src/auth/AuthContext.test.tsx`

**Interfaces:**
- Produces: `api.get/post/patch(path, body?)` (cookie-credentialed, throws `Error(body.error)` on !ok); `AuthProvider`, `useAuth(): { user, loading, login(email,password), register(input), logout(), refreshMe() }`.

- [ ] **Step 1: Write the failing test**

`apps/web/src/auth/AuthContext.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext.js";
import { api } from "../lib/apiClient.js";

vi.mock("../lib/apiClient", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

function Probe() {
  const { user, loading, login } = useAuth();
  if (loading) return <div>loading</div>;
  return <div><span>{user ? user.email : "anon"}</span><button onClick={() => void login("a@x.io", "pw")}>login</button></div>;
}
beforeEach(() => vi.clearAllMocks());

describe("AuthContext", () => {
  it("starts anonymous when /auth/me fails", async () => {
    (api.get as any).mockRejectedValue(new Error("401"));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("anon")).toBeInTheDocument());
  });
  it("sets the user after login", async () => {
    (api.get as any).mockRejectedValue(new Error("401"));
    (api.post as any).mockResolvedValue({ user: { id: "1", email: "a@x.io", name: "A", role: "CUSTOMER" } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => screen.getByText("anon"));
    fireEvent.click(screen.getByText("login"));
    await waitFor(() => expect(screen.getByText("a@x.io")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sev/web test AuthContext`
Expected: FAIL — cannot find `./AuthContext.js`.

- [ ] **Step 3: Implement**

`apps/web/src/lib/apiClient.ts`:
```ts
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";
async function handle(res: Response) {
  if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`); }
  return res.status === 204 ? null : res.json();
}
const json = { "Content-Type": "application/json" };
export const api = {
  get: (p: string) => fetch(`${BASE}${p}`, { credentials: "include" }).then(handle),
  post: (p: string, body?: unknown) => fetch(`${BASE}${p}`, { method: "POST", credentials: "include", headers: json, body: body ? JSON.stringify(body) : undefined }).then(handle),
  patch: (p: string, body?: unknown) => fetch(`${BASE}${p}`, { method: "PATCH", credentials: "include", headers: json, body: body ? JSON.stringify(body) : undefined }).then(handle),
};
```

`apps/web/src/auth/AuthContext.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthUser } from "@sev/shared";
import { api } from "../lib/apiClient.js";

interface AuthState {
  user: AuthUser | null; loading: boolean;
  login(email: string, password: string): Promise<AuthUser>;
  register(input: { name: string; email: string; password: string }): Promise<AuthUser>;
  logout(): Promise<void>; refreshMe(): Promise<void>;
}
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  async function refreshMe() {
    try { const { user } = await api.get("/auth/me"); setUser(user); }
    catch { setUser(null); } finally { setLoading(false); }
  }
  useEffect(() => { void refreshMe(); }, []);
  async function login(email: string, password: string) { const { user } = await api.post("/auth/login", { email, password }); setUser(user); return user; }
  async function register(input: { name: string; email: string; password: string }) { const { user } = await api.post("/auth/register", input); setUser(user); return user; }
  async function logout() { await api.post("/auth/logout"); setUser(null); }
  return <Ctx.Provider value={{ user, loading, login, register, logout, refreshMe }}>{children}</Ctx.Provider>;
}
export function useAuth(): AuthState { const c = useContext(Ctx); if (!c) throw new Error("useAuth used outside AuthProvider"); return c; }
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sev/web test AuthContext`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib apps/web/src/auth && git commit -m "feat(web): cookie-credentialed api client + AuthContext"
```

### Task 18: Router + guards + AppShell

**Files:**
- Create: `apps/web/src/routes/ProtectedRoute.tsx`, `src/components/shell/AppShell.tsx`, `src/router.tsx`
- Create (page stubs imported by router; filled in Tasks 19–21): `src/pages/Landing.tsx`, `src/pages/auth/Login.tsx`, `Register.tsx`, `Forgot.tsx`, `Reset.tsx`, `Profile.tsx`, `src/pages/dashboards/CustomerDashboard.tsx`, `AnalystDashboard.tsx`, `AdminDashboard.tsx`
- Modify: `apps/web/src/App.tsx`, `src/main.tsx`
- Test: `apps/web/src/routes/guards.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `ROLE_HOME`.
- Produces: `ProtectedRoute({roles?})` (auth + role guard); `AppShell({role,title,children})`; `AppRoutes` component mounting all routes; `App` renders providers + `AppRoutes`.

- [ ] **Step 1: Write the failing test**

`apps/web/src/routes/guards.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../auth/AuthContext.js";
import { AppRoutes } from "../router.js";
import { api } from "../lib/apiClient.js";

vi.mock("../lib/apiClient", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock("../three/CarPreview", () => ({ default: () => <div>car</div> })); // avoid WebGL

function renderAt(path: string) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}><AuthProvider><AppRoutes /></AuthProvider></MemoryRouter>
    </QueryClientProvider>
  );
}
beforeEach(() => vi.clearAllMocks());

describe("route guards", () => {
  it("redirects an unauthenticated user from /app to /login", async () => {
    (api.get as any).mockRejectedValue(new Error("401"));
    renderAt("/app");
    await waitFor(() => expect(screen.getByText(/welcome back/i)).toBeInTheDocument());
  });
  it("redirects a CUSTOMER away from /admin to their home", async () => {
    (api.get as any).mockResolvedValue({ user: { id: "1", email: "c@x.io", name: "C", role: "CUSTOMER" } });
    renderAt("/admin");
    await waitFor(() => expect(screen.getByText(/my dashboard/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sev/web test guards`
Expected: FAIL — cannot find `../router.js`.

- [ ] **Step 3: Implement guards, shell, router, page stubs**

`apps/web/src/routes/ProtectedRoute.tsx`:
```tsx
import { Navigate, Outlet } from "react-router-dom";
import type { Role } from "@sev/shared";
import { ROLE_HOME } from "@sev/shared";
import { useAuth } from "../auth/AuthContext.js";
export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
}
```

`apps/web/src/components/shell/AppShell.tsx`:
```tsx
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Role } from "@sev/shared";
import { useAuth } from "../../auth/AuthContext.js";
const NAV: Record<Role, { to: string; label: string }[]> = {
  ADMIN: [{ to: "/admin", label: "Overview" }, { to: "/admin", label: "Users" }],
  ANALYST: [{ to: "/insights", label: "Insights" }],
  CUSTOMER: [{ to: "/app", label: "My Sessions" }, { to: "/profile", label: "Profile" }],
};
export function AppShell({ role, title, children }: { role: Role; title: string; children: ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-full grid grid-cols-[240px_1fr]">
      <aside className="glass m-3 p-4 space-y-3">
        <div className="font-display text-neon text-lg">SmartEV</div>
        <nav className="flex flex-col gap-1">{NAV[role].map((n, i) => <Link key={i} to={n.to} className="px-3 py-2 rounded-lg hover:bg-white/10">{n.label}</Link>)}</nav>
      </aside>
      <main className="p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-white">{title}</h1>
          <div className="flex items-center gap-3 text-sm text-slate-400"><span>{user?.name}</span><button onClick={() => void logout()} className="text-rose-400">Logout</button></div>
        </header>
        {children}
      </main>
    </div>
  );
}
```

`apps/web/src/router.tsx`:
```tsx
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute.js";
import Landing from "./pages/Landing.js";
import Login from "./pages/auth/Login.js";
import Register from "./pages/auth/Register.js";
import Forgot from "./pages/auth/Forgot.js";
import Reset from "./pages/auth/Reset.js";
import Profile from "./pages/auth/Profile.js";
import CustomerDashboard from "./pages/dashboards/CustomerDashboard.js";
import AnalystDashboard from "./pages/dashboards/AnalystDashboard.js";
import AdminDashboard from "./pages/dashboards/AdminDashboard.js";
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot" element={<Forgot />} />
      <Route path="/reset" element={<Reset />} />
      <Route element={<ProtectedRoute />}><Route path="/profile" element={<Profile />} /></Route>
      <Route element={<ProtectedRoute roles={["CUSTOMER"]} />}><Route path="/app" element={<CustomerDashboard />} /></Route>
      <Route element={<ProtectedRoute roles={["ANALYST"]} />}><Route path="/insights" element={<AnalystDashboard />} /></Route>
      <Route element={<ProtectedRoute roles={["ADMIN"]} />}><Route path="/admin" element={<AdminDashboard />} /></Route>
    </Routes>
  );
}
```

`apps/web/src/App.tsx` (replace placeholder):
```tsx
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth/AuthContext.js";
import { AppRoutes } from "./router.js";
const qc = new QueryClient();
export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>
    </QueryClientProvider>
  );
}
```

Create minimal page stubs so the router compiles (each is fully built in Tasks 19–21). For now:

`apps/web/src/pages/auth/Login.tsx`:
```tsx
import { GradientText } from "../../components/ui/index.js";
export default function Login() { return <div className="p-8"><GradientText>Welcome back</GradientText></div>; }
```

Create the same one-line stub pattern for `Register.tsx` (text "Create account"), `Forgot.tsx` ("Forgot password"), `Reset.tsx` ("Reset password"), `Profile.tsx` ("Profile") — each a default component returning a `<div className="p-8">` with that text.

`apps/web/src/pages/Landing.tsx` (stub; full build in Task 19):
```tsx
export default function Landing() { return <div className="p-8 font-display text-neon">SmartEV Vision</div>; }
```

`apps/web/src/pages/dashboards/CustomerDashboard.tsx`:
```tsx
import { AppShell } from "../../components/shell/AppShell.js";
export default function CustomerDashboard() { return <AppShell role="CUSTOMER" title="My Dashboard"><div /></AppShell>; }
```

Create `AnalystDashboard.tsx` (role `ANALYST`, title "Insights") and `AdminDashboard.tsx` (role `ADMIN`, title "Admin Overview") with the same stub shape.

Update `apps/web/src/main.tsx` to drop the inline render of the placeholder (App now owns providers) — it already renders `<App/>`, so no change needed beyond Step 3's App rewrite.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sev/web test guards`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src && git commit -m "feat(web): router, auth+role guards, AppShell, page stubs"
```

### Task 19: Landing page + R3F 3D preview

**Files:**
- Create: `apps/web/src/three/LowPolyCar.tsx`, `src/three/CarPreview.tsx`
- Modify: `apps/web/src/pages/Landing.tsx`
- Test: `apps/web/src/pages/Landing.test.tsx`

**Interfaces:**
- Consumes: `Button`, `GlassCard`, `GradientText`, `Badge`.
- Produces: `LowPolyCar` (R3F group), `CarPreview` (default export, lazy-loaded `<Canvas>`), full `Landing` page.

- [ ] **Step 1: Write the failing test**

`apps/web/src/pages/Landing.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Landing from "./Landing.js";

vi.mock("../three/CarPreview", () => ({ default: () => <div>car-preview</div> }));

describe("Landing", () => {
  it("renders hero, features, and CTA", () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);
    expect(screen.getByText(/truly notice/i)).toBeInTheDocument();
    expect(screen.getByText(/VR Showroom/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get started/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sev/web test Landing`
Expected: FAIL — current `Landing` stub has none of that text.

- [ ] **Step 3: Implement 3D + landing**

`apps/web/src/three/LowPolyCar.tsx`:
```tsx
export function LowPolyCar() {
  const wheels: [number, number][] = [[-1.3, -1.0], [1.3, -1.0], [-1.3, 1.0], [1.3, 1.0]];
  return (
    <group>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[4, 0.8, 1.8]} /><meshStandardMaterial color="#00d4ff" metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[0, 1.1, 0]}><boxGeometry args={[2.2, 0.7, 1.6]} /><meshStandardMaterial color="#0a0a0f" metalness={0.4} roughness={0.4} /></mesh>
      {wheels.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.1, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.3, 24]} /><meshStandardMaterial color="#111111" />
        </mesh>
      ))}
    </group>
  );
}
```

`apps/web/src/three/CarPreview.tsx`:
```tsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage } from "@react-three/drei";
import { LowPolyCar } from "./LowPolyCar.js";
export default function CarPreview() {
  return (
    <Canvas camera={{ position: [4, 2, 6], fov: 45 }} className="h-full w-full">
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <Stage environment={null} intensity={0.3}><LowPolyCar /></Stage>
      <OrbitControls autoRotate enablePan={false} />
    </Canvas>
  );
}
```

`apps/web/src/pages/Landing.tsx` (full):
```tsx
import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button, GlassCard, GradientText, Badge } from "../components/ui/index.js";
const CarPreview = lazy(() => import("../three/CarPreview.js"));

const FEATURES = [
  { title: "VR Showroom", body: "Walk around EVs in the browser." },
  { title: "Eye Tracking", body: "Capture gaze and dwell on every component." },
  { title: "Attention Heatmaps", body: "See exactly what customers focus on." },
  { title: "AI Insights", body: "Engagement, interest, and recommendation scores." },
];
const STACK = ["React", "Three.js / R3F", "Node + Express", "Prisma", "PostgreSQL", "scikit-learn"];

export default function Landing() {
  return (
    <div>
      <section className="grid lg:grid-cols-2 gap-8 items-center px-8 py-20 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-6">
          <Badge>EV Design Research Platform</Badge>
          <h1 className="font-display text-5xl leading-tight">See what customers <GradientText>truly notice</GradientText>.</h1>
          <p className="text-slate-400 text-lg">A VR + eye-tracking studio that turns showroom attention into design decisions.</p>
          <div className="flex gap-3">
            <Link to="/register"><Button>Get started</Button></Link>
            <Link to="/login"><Button variant="ghost">Request demo</Button></Link>
          </div>
        </motion.div>
        <div className="h-[420px] glass overflow-hidden">
          <Suspense fallback={<div className="h-full grid place-items-center text-slate-500">Loading 3D preview…</div>}><CarPreview /></Suspense>
        </div>
      </section>

      <section className="px-8 py-16 max-w-7xl mx-auto">
        <h2 className="font-display text-3xl mb-8">Platform <GradientText>highlights</GradientText></h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => <GlassCard key={f.title}><h3 className="font-display text-white mb-2">{f.title}</h3><p className="text-sm text-slate-400">{f.body}</p></GlassCard>)}
        </div>
      </section>

      <section className="px-8 py-16 max-w-7xl mx-auto">
        <h2 className="font-display text-3xl mb-6">Built with a modern stack</h2>
        <div className="flex flex-wrap gap-2">{STACK.map((s) => <Badge key={s}>{s}</Badge>)}</div>
      </section>

      <section className="px-8 py-20 max-w-3xl mx-auto text-center space-y-5">
        <h2 className="font-display text-4xl">Ready to <GradientText>understand</GradientText> your customers?</h2>
        <Link to="/register"><Button>Create your account</Button></Link>
      </section>

      <footer className="px-8 py-8 text-center text-slate-500 text-sm">© 2026 SmartEV Vision</footer>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sev/web test Landing`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/three apps/web/src/pages/Landing.tsx apps/web/src/pages/Landing.test.tsx && git commit -m "feat(web): animated landing page with R3F low-poly EV preview"
```

### Task 20: Auth pages wired to the API

**Files:**
- Modify: `apps/web/src/pages/auth/Login.tsx`, `Register.tsx`, `Forgot.tsx`, `Reset.tsx`, `Profile.tsx`
- Test: `apps/web/src/pages/auth/Login.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `ROLE_HOME`, `api`, ui primitives, `useNavigate`, `useSearchParams`.
- Produces: functional `Login`, `Register`, `Forgot`, `Reset`, `Profile` pages.

- [ ] **Step 1: Write the failing test**

`apps/web/src/pages/auth/Login.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login.js";
import { AuthProvider } from "../../auth/AuthContext.js";
import { api } from "../../lib/apiClient.js";

vi.mock("../../lib/apiClient", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); (api.get as any).mockRejectedValue(new Error("401")); });

function renderLogin() {
  return render(<MemoryRouter><AuthProvider><Login /></AuthProvider></MemoryRouter>);
}

describe("Login page", () => {
  it("shows an error when login fails", async () => {
    (api.post as any).mockRejectedValue(new Error("Invalid credentials"));
    renderLogin();
    await waitFor(() => screen.getByText(/welcome back/i));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@x.io" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/invalid credentials/i));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sev/web test Login`
Expected: FAIL — stub `Login` has no form.

- [ ] **Step 3: Implement the auth pages**

`apps/web/src/pages/auth/Login.tsx`:
```tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ROLE_HOME } from "@sev/shared";
import { useAuth } from "../../auth/AuthContext.js";
import { Button, Field, Input, GlassCard, GradientText } from "../../components/ui/index.js";
export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState<string>();
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(undefined);
    try { const u = await login(email, password); nav(ROLE_HOME[u.role]); } catch (err) { setError((err as Error).message); }
  }
  return (
    <div className="min-h-full grid place-items-center p-6">
      <GlassCard className="w-full max-w-md space-y-4">
        <h1 className="font-display text-2xl"><GradientText>Welcome back</GradientText></h1>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Email"><Input type="email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Field label="Password" error={error}><Input type="password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
          <Button type="submit" className="w-full">Log in</Button>
        </form>
        <div className="text-sm text-slate-400 flex justify-between"><Link to="/forgot">Forgot password?</Link><Link to="/register">Create account</Link></div>
      </GlassCard>
    </div>
  );
}
```

`apps/web/src/pages/auth/Register.tsx`:
```tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ROLE_HOME } from "@sev/shared";
import { useAuth } from "../../auth/AuthContext.js";
import { Button, Field, Input, GlassCard, GradientText } from "../../components/ui/index.js";
export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" }); const [error, setError] = useState<string>();
  function set(k: keyof typeof form) { return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value }); }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(undefined);
    try { const u = await register(form); nav(ROLE_HOME[u.role]); } catch (err) { setError((err as Error).message); }
  }
  return (
    <div className="min-h-full grid place-items-center p-6">
      <GlassCard className="w-full max-w-md space-y-4">
        <h1 className="font-display text-2xl"><GradientText>Create account</GradientText></h1>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Name"><Input aria-label="Name" value={form.name} onChange={set("name")} required /></Field>
          <Field label="Email"><Input type="email" aria-label="Email" value={form.email} onChange={set("email")} required /></Field>
          <Field label="Password" error={error}><Input type="password" aria-label="Password" value={form.password} onChange={set("password")} required /></Field>
          <Button type="submit" className="w-full">Sign up</Button>
        </form>
        <div className="text-sm text-slate-400"><Link to="/login">Already have an account? Log in</Link></div>
      </GlassCard>
    </div>
  );
}
```

`apps/web/src/pages/auth/Forgot.tsx`:
```tsx
import { useState } from "react";
import { api } from "../../lib/apiClient.js";
import { Button, Field, Input, GlassCard, GradientText } from "../../components/ui/index.js";
export default function Forgot() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent) { e.preventDefault(); await api.post("/auth/forgot-password", { email }); setSent(true); }
  return (
    <div className="min-h-full grid place-items-center p-6">
      <GlassCard className="w-full max-w-md space-y-4">
        <h1 className="font-display text-2xl"><GradientText>Forgot password</GradientText></h1>
        {sent ? <p className="text-slate-400">If that email exists, a reset link has been sent (check the server console in dev).</p> : (
          <form onSubmit={submit} className="space-y-3">
            <Field label="Email"><Input type="email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
            <Button type="submit" className="w-full">Send reset link</Button>
          </form>
        )}
      </GlassCard>
    </div>
  );
}
```

`apps/web/src/pages/auth/Reset.tsx`:
```tsx
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/apiClient.js";
import { Button, Field, Input, GlassCard, GradientText } from "../../components/ui/index.js";
export default function Reset() {
  const [params] = useSearchParams(); const nav = useNavigate();
  const [password, setPassword] = useState(""); const [error, setError] = useState<string>();
  const token = params.get("token") ?? "";
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(undefined);
    try { await api.post("/auth/reset-password", { token, password }); nav("/login"); } catch (err) { setError((err as Error).message); }
  }
  return (
    <div className="min-h-full grid place-items-center p-6">
      <GlassCard className="w-full max-w-md space-y-4">
        <h1 className="font-display text-2xl"><GradientText>Reset password</GradientText></h1>
        <form onSubmit={submit} className="space-y-3">
          <Field label="New password" error={error}><Input type="password" aria-label="New password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
          <Button type="submit" className="w-full">Update password</Button>
        </form>
      </GlassCard>
    </div>
  );
}
```

`apps/web/src/pages/auth/Profile.tsx`:
```tsx
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext.js";
import { api } from "../../lib/apiClient.js";
import { Button, Field, Input, GlassCard, GradientText } from "../../components/ui/index.js";
export default function Profile() {
  const { user, refreshMe } = useAuth();
  const [name, setName] = useState(user?.name ?? ""); const [saved, setSaved] = useState(false);
  async function submit(e: React.FormEvent) { e.preventDefault(); await api.patch("/users/me", { name }); await refreshMe(); setSaved(true); }
  return (
    <div className="p-8 max-w-lg">
      <GlassCard className="space-y-4">
        <h1 className="font-display text-2xl"><GradientText>Profile</GradientText></h1>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Name"><Input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Button type="submit">Save</Button>
          {saved && <span className="ml-3 text-teal text-sm">Saved</span>}
        </form>
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sev/web test Login`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/auth && git commit -m "feat(web): login/register/forgot/reset/profile pages wired to the API"
```

### Task 21: Role dashboard shells (KPI + chart components)

**Files:**
- Modify: `apps/web/src/pages/dashboards/CustomerDashboard.tsx`, `AnalystDashboard.tsx`, `AdminDashboard.tsx`
- Test: `apps/web/src/pages/dashboards/AdminDashboard.test.tsx`

**Interfaces:**
- Consumes: `AppShell`, `StatCard`, `ChartCard`, `useQuery`, `api`, `Paginated<AuthUser>`.
- Produces: three role dashboards. `AdminDashboard` fetches `GET /users` (real end-to-end); Customer/Analyst show seeded placeholder KPIs + chart placeholders.

- [ ] **Step 1: Write the failing test**

`apps/web/src/pages/dashboards/AdminDashboard.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminDashboard from "./AdminDashboard.js";
import { AuthProvider } from "../../auth/AuthContext.js";
import { api } from "../../lib/apiClient.js";

vi.mock("../../lib/apiClient", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  (api.get as any).mockImplementation((p: string) =>
    p === "/users" ? Promise.resolve({ items: [], total: 7, page: 1, pageSize: 20 })
                    : Promise.resolve({ user: { id: "1", email: "admin@x.io", name: "Admin", role: "ADMIN" } }));
});

describe("AdminDashboard", () => {
  it("renders the total-users KPI from the API", async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}><MemoryRouter><AuthProvider><AdminDashboard /></AuthProvider></MemoryRouter></QueryClientProvider>
    );
    expect(screen.getByText(/admin overview/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("7")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @sev/web test AdminDashboard`
Expected: FAIL — stub renders no KPI.

- [ ] **Step 3: Implement the dashboards**

`apps/web/src/pages/dashboards/CustomerDashboard.tsx`:
```tsx
import { AppShell } from "../../components/shell/AppShell.js";
import { StatCard, ChartCard } from "../../components/ui/index.js";
export default function CustomerDashboard() {
  return (
    <AppShell role="CUSTOMER" title="My Dashboard">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Sessions" value="6" />
        <StatCard label="Avg. Engagement" value="72%" delta="+4% vs last week" />
        <StatCard label="Favorite Model" value="Aurora S" />
      </div>
      <ChartCard title="Attention over time" />
    </AppShell>
  );
}
```

`apps/web/src/pages/dashboards/AnalystDashboard.tsx`:
```tsx
import { AppShell } from "../../components/shell/AppShell.js";
import { StatCard, ChartCard } from "../../components/ui/index.js";
export default function AnalystDashboard() {
  return (
    <AppShell role="ANALYST" title="Insights">
      <div className="grid sm:grid-cols-4 gap-4">
        <StatCard label="Total Sessions" value="6" />
        <StatCard label="Avg. Engagement" value="68%" />
        <StatCard label="Top Component" value="Infotainment" />
        <StatCard label="Satisfaction" value="4.6/5" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4"><ChartCard title="Most-viewed components" /><ChartCard title="Engagement distribution" /></div>
    </AppShell>
  );
}
```

`apps/web/src/pages/dashboards/AdminDashboard.tsx`:
```tsx
import { useQuery } from "@tanstack/react-query";
import type { AuthUser, Paginated } from "@sev/shared";
import { AppShell } from "../../components/shell/AppShell.js";
import { StatCard, ChartCard } from "../../components/ui/index.js";
import { api } from "../../lib/apiClient.js";
export default function AdminDashboard() {
  const { data } = useQuery<Paginated<AuthUser>>({ queryKey: ["users"], queryFn: () => api.get("/users") });
  return (
    <AppShell role="ADMIN" title="Admin Overview">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Total Users" value={data?.total ?? "—"} />
        <StatCard label="Vehicles" value="3" />
        <StatCard label="Sessions" value="6" />
      </div>
      <ChartCard title="Sessions over time" />
    </AppShell>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @sev/web test AdminDashboard`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/dashboards && git commit -m "feat(web): role dashboard shells with KPI + chart-placeholder components"
```

---

## PART D — Docs & Phase Close

### Task 22: ER diagram, runbook, full verification + PR

**Files:**
- Create: `docs/diagrams/er-diagram.md`, `docs/RUNBOOK.md`

**Interfaces:**
- Consumes: everything above.
- Produces: committed docs + a verified Phase 0 build + an opened PR.

- [ ] **Step 1: Write the ER diagram doc**

`docs/diagrams/er-diagram.md`:
````markdown
# SmartEV Vision — ER Diagram (Phase 0)

```mermaid
erDiagram
    USER ||--o{ SESSION : conducts
    USER ||--o{ FEEDBACK : gives
    USER ||--o{ RATING : gives
    USER ||--o{ REPORT : generates
    USER ||--o{ AUDIT_LOG : triggers
    USER ||--o{ PASSWORD_RESET_TOKEN : owns
    VEHICLE ||--o{ VEHICLE_PART : contains
    VEHICLE ||--o{ SESSION : viewed_in
    VEHICLE ||--o{ FEEDBACK : about
    VEHICLE ||--o{ RATING : about
    SESSION ||--o{ GAZE_DATA : records
    SESSION ||--o{ INTERACTION_LOG : records
    SESSION ||--o{ HEATMAP_CELL : aggregates
    SESSION ||--o{ EMOTION_DETECTION : records
    VEHICLE_PART ||--o{ GAZE_DATA : targeted_by
    VEHICLE_PART ||--o{ INTERACTION_LOG : targeted_by
    VEHICLE_PART ||--o{ HEATMAP_CELL : targeted_by
```

Authoritative schema: `prisma/schema.prisma`. Inactive-until-later tables: `GazeData`,
`InteractionLog`, `HeatmapCell`, `EmotionDetection`, `Feedback`, `Rating`, `Report`.
````

- [ ] **Step 2: Write the runbook**

`docs/RUNBOOK.md`:
````markdown
# SmartEV Vision — Phase 0 Runbook

## Prerequisites
- Node 20+, pnpm 9, Docker Desktop.

## Run
```bash
cp .env.example .env
docker compose up -d                 # Postgres on :5432
pnpm install
pnpm db:migrate                      # apply migrations
pnpm db:seed                         # seed 3 roles, 3 vehicles, sessions
pnpm dev                             # web :5173 + api :4000
```

## Seeded logins (password `Password123`)
- admin@smartev.io → /admin
- analyst@smartev.io → /insights
- customer@smartev.io → /app

## Tests
```bash
# one-time: create the test DB
docker compose exec -T db createdb -U sev smartev_test
(cd apps/api && DATABASE_URL="postgresql://sev:sev@localhost:5432/smartev_test?schema=public" pnpm exec prisma migrate deploy --schema ../../prisma/schema.prisma)

pnpm -r test          # all unit + integration tests
pnpm -w typecheck
```

## API docs
Swagger UI at http://localhost:4000/api/docs (JSON at /api/openapi.json).

## Password reset (dev)
`forgot-password` logs the reset link to the **api server console**; open it to reach `/reset?token=...`.
````

- [ ] **Step 3: Full Phase 0 verification (Definition of Done)**

Run each; all must succeed:
```bash
docker compose up -d
pnpm install
pnpm db:migrate && pnpm db:seed
pnpm -w typecheck
docker compose exec -T db createdb -U sev smartev_test 2>/dev/null || true
(cd apps/api && DATABASE_URL="postgresql://sev:sev@localhost:5432/smartev_test?schema=public" pnpm exec prisma migrate deploy --schema ../../prisma/schema.prisma)
pnpm -r test
```
Expected: typecheck clean; all test suites pass (shared, api ×8, web ×6). Then manually: `pnpm dev`, open http://localhost:5173, register, and log in as each seeded role to confirm the correct dashboard loads.

- [ ] **Step 4: Commit docs**

```bash
git add docs/diagrams/er-diagram.md docs/RUNBOOK.md && git commit -m "docs: Phase 0 ER diagram + runbook"
```

- [ ] **Step 5: Push and open the PR**

```bash
git push -u origin rebuild/enterprise-v2
gh pr create --base main --head rebuild/enterprise-v2 \
  --title "Phase 0 — Foundation: monorepo, schema, 3-role auth, design system, landing" \
  --body "Implements the approved Phase 0 spec (docs/superpowers/specs/2026-06-27-phase-0-foundation-design.md). Runnable via docs/RUNBOOK.md; all unit + integration tests green.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

## Self-Review (author check against the spec)

- **Spec coverage:** monorepo + Postgres (T1), shared contracts + provider seams incl. emotion (T2), full 13-model schema + ER + migration (T3), seed (T4), API skeleton/health (T5), auth service (T6), audit (T7), RBAC middleware (T8), register/login (T9), refresh/logout (T10), forgot/reset console-mailer (T11), me/profile (T12), admin users + role (T13), OpenAPI/Swagger (T14), design system + tokens (T15–16), api client + AuthContext (T17), router + guards + AppShell (T18), animated landing + R3F preview (T19), auth pages (T20), 3-role dashboard shells with KPI/chart components (T21), ER diagram + runbook + verification + PR (T22). All spec §5 items map to a task.
- **Inert later-phase tables:** present in schema (T3) + seed (T4), no behavior — matches the spec's scope boundary.
- **Type consistency:** `Role`/`ROLE_HOME` (shared) used identically in api middleware and web guards; `AuthUser` shape returned by `toAuthUser` matches the web `AuthUser` type and `Paginated<AuthUser>` in admin list/dashboard; cookie names `sev_access`/`sev_refresh` consistent across `cookies.ts`, middleware, and tests; `TokenPayload {sub, role}` consistent across sign/verify and middleware.
- **No placeholders:** every code step contains complete, runnable code; no "TBD"/"similar to".



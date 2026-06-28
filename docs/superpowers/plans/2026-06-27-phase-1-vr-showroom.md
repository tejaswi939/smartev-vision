# SmartEV Vision — Phase 1 (VR Showroom) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A premium, data-driven R3F EV showroom: 3 procedural vehicles (Compact/SUV/Sports) with 15 interactive components each, hotspots, multi-mode camera (+ optional WebXR), a GLB-ready loader, and per-object IDs + interaction hooks prepared for Phase 2 gaze tracking.

**Architecture:** Backend serves a DB-driven catalog (`/vehicles`). The web showroom (`apps/web/src/showroom/`) renders a `<Canvas>` with a Lightformer studio environment, reflective floor, contact shadows, and bloom. `VehicleModel` resolves `modelUrl` → GLB (with mesh→part auto-mapping) or a **data-driven procedural vehicle** (per-type descriptor table → one generic part renderer). Every interactive part is wrapped by `InteractivePart`, which assigns a unique `objectId` (also to `mesh.userData`), wires hover/click animations + hotspot, and emits typed `InteractionEvent`s on a client bus (no-op sink now; Phase-2 seam).

**Tech Stack:** React 18 + R3F 8 + drei + `@react-three/postprocessing` + `@react-three/xr`, TanStack Query, Prisma/Postgres, Express, Vitest + `@react-three/test-renderer`.

## Global Constraints

- **Node 20** via nvm (`. "$HOME/.nvm/nvm.sh"; nvm use 20` before every command); pnpm 9. Postgres on host **5544**; test DB `smartev_test` on 5544.
- **TypeScript strict** across web/api/shared; `.js` import specifiers (NodeNext in api, Bundler in web).
- **No external runtime assets** — procedural Lightformer environment (no CDN HDR); Draco/KTX2 decoders served from a local `/decoders/` path (unused until real GLBs arrive).
- **Design tokens (verbatim):** base `#0a0a0f`, surface `#12121a`, neon `#00d4ff`, violet `#a855f7`, teal `#06d6a0`.
- **15 components (verbatim meshName keys):** `body, doors, hood, trunk, wheels, steering-wheel, dashboard, infotainment, battery, charging-port, mirrors, seats, headlights, taillights, windows`.
- **Add-a-vehicle = data only:** a `Vehicle` row + `VehiclePart` rows (+ optional `.glb` at `modelUrl`); `modelUrl=null` → procedural. No app-code change.
- **Every task ends green:** `pnpm -r typecheck` + the task's tests pass before commit. Conventional commits. Stacked on `rebuild/phase-1-showroom`.

## File Structure

```
apps/api/prisma/schema.prisma         # +VehiclePart fields, +Vehicle fields, +PartCategory values, modelUrl nullable
apps/api/prisma/seed.ts               # 15 components/vehicle with specs+hotspot+animation; modelUrl=null
apps/api/src/repositories/vehicle.repo.ts
apps/api/src/controllers/vehicle.controller.ts   # list + bySlug -> DTOs
apps/api/src/routes/vehicle.routes.ts            # GET /vehicles, /vehicles/:slug
apps/api/src/routes/index.ts          # mount /api/v1/vehicles
apps/api/src/openapi.ts               # + vehicle paths
apps/api/test/vehicles.test.ts

packages/shared/src/types/showroom.ts # VehicleSummary, VehiclePartDTO, VehicleDetail, Vec3
packages/shared/src/index.ts          # export showroom types

apps/web/src/showroom/
  ShowroomPage.tsx                     # route page: Canvas + HUD + HotspotPanel + state
  ShowroomCanvas.tsx                   # <Canvas> config
  scene/StudioEnvironment.tsx  Lighting.tsx  ReflectiveFloor.tsx  PostFX.tsx
  scene/CameraRig.tsx  cameraModes.ts  XRLayer.tsx
  vehicle/VehicleModel.tsx             # GLB-or-procedural resolver
  vehicle/ProceduralVehicle.tsx        # maps a descriptor table -> InteractivePart(s)
  vehicle/proceduralData.ts            # per-VehicleType part descriptors (geometry/transform/material)
  vehicle/PartMesh.tsx                 # generic geometry renderer for a descriptor
  vehicle/InteractivePart.tsx          # IDs + hooks + hover/click animation + hotspot wiring
  vehicle/Hotspot.tsx                  # drei <Html> marker
  vehicle/useVehicleAnimation.ts       # useFrame lerp controller
  vehicle/glbMapping.ts                # pure mesh-name -> part mapping
  ui/ShowroomHUD.tsx  VehicleSwitcher.tsx  CameraModeToggle.tsx  HotspotPanel.tsx
  data/useVehicleCatalog.ts  useVehicle.ts
  interaction/objectId.ts  interactionBus.ts  InteractionProvider.tsx
apps/web/src/router.tsx                # + /showroom route (lazy)
apps/web/public/decoders/README.md     # where Draco/KTX2 decoders go for real GLBs

docs/RUNBOOK.md                        # + showroom section
```

---

## Milestone 1 — Catalog data model & API

### Task 1: Extend schema + seed for showroom

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/prisma/seed.ts`
- Modify: `apps/api/prisma/seed.test.ts`

**Interfaces:**
- Produces: `VehiclePart{ specs Json?, hotspotPosition Json?, animation String?, interactive Boolean }`; `Vehicle{ category String?, metadata Json?, modelUrl String? }`; `PartCategory + CHARGING|GLASS|SEATING`; seed creates 3 vehicles × **15** parts, `modelUrl=null`.

- [ ] **Step 1: Edit `schema.prisma`** — set `Vehicle.modelUrl String?`; add `category String?`, `metadata Json?` to `Vehicle`; add to `VehiclePart`: `specs Json?`, `hotspotPosition Json?`, `animation String?`, `interactive Boolean @default(true)`; add `CHARGING GLASS SEATING` to `enum PartCategory`.

- [ ] **Step 2: Rewrite the `PARTS` table in `seed.ts`** to the 15 components, each with `specs`, `hotspotPosition`, `animation`:

```ts
const PARTS: { name: string; category: PartCategory; meshName: string; animation: string | null;
  hotspotPosition: { x: number; y: number; z: number }; specs: Record<string, string> }[] = [
  { name: "Body", category: "EXTERIOR", meshName: "body", animation: null,
    hotspotPosition: { x: 0, y: 1.0, z: 1.0 }, specs: { Drag: "0.23 Cd", Material: "Aluminium" } },
  { name: "Doors", category: "DOORS", meshName: "doors", animation: "door-open",
    hotspotPosition: { x: 1.0, y: 1.0, z: 0 }, specs: { Type: "Frameless", Opening: "Soft-close" } },
  { name: "Hood", category: "EXTERIOR", meshName: "hood", animation: "hood-open",
    hotspotPosition: { x: 0, y: 1.0, z: 1.8 }, specs: { Storage: "Frunk 60 L" } },
  { name: "Trunk", category: "EXTERIOR", meshName: "trunk", animation: "trunk-open",
    hotspotPosition: { x: 0, y: 1.0, z: -1.8 }, specs: { Capacity: "425 L" } },
  { name: "Wheels", category: "WHEELS", meshName: "wheels", animation: "wheel-spin",
    hotspotPosition: { x: 1.3, y: 0.4, z: 1.2 }, specs: { Size: "20-inch", Type: "Aero alloy" } },
  { name: "Steering Wheel", category: "INTERIOR", meshName: "steering-wheel", animation: null,
    hotspotPosition: { x: 0.35, y: 1.1, z: 0.2 }, specs: { Type: "Heated", Mode: "Drive-by-wire" } },
  { name: "Dashboard", category: "INTERIOR", meshName: "dashboard", animation: null,
    hotspotPosition: { x: 0, y: 1.1, z: 0.4 }, specs: { Display: "12.3-inch" } },
  { name: "Infotainment Screen", category: "INFOTAINMENT", meshName: "infotainment", animation: "screen-on",
    hotspotPosition: { x: 0, y: 1.1, z: 0.5 }, specs: { Size: "15.4-inch", OS: "SmartEV OS" } },
  { name: "Battery Pack", category: "BATTERY", meshName: "battery", animation: "battery-glow",
    hotspotPosition: { x: 0, y: 0.2, z: 0 }, specs: { Capacity: "82 kWh", Chemistry: "NMC" } },
  { name: "Charging Port", category: "CHARGING", meshName: "charging-port", animation: "port-open",
    hotspotPosition: { x: -1.0, y: 0.8, z: -1.5 }, specs: { Standard: "CCS2", Peak: "250 kW" } },
  { name: "Mirrors", category: "MIRRORS", meshName: "mirrors", animation: null,
    hotspotPosition: { x: 1.1, y: 1.2, z: 0.6 }, specs: { Type: "Auto-dimming" } },
  { name: "Seats", category: "SEATING", meshName: "seats", animation: null,
    hotspotPosition: { x: 0, y: 0.9, z: 0 }, specs: { Trim: "Vegan leather", Heating: "Front + rear" } },
  { name: "Headlights", category: "LIGHTING", meshName: "headlights", animation: "lights-on",
    hotspotPosition: { x: 0.7, y: 0.8, z: 1.9 }, specs: { Type: "Matrix LED" } },
  { name: "Taillights", category: "LIGHTING", meshName: "taillights", animation: "lights-on",
    hotspotPosition: { x: 0.7, y: 0.8, z: -1.9 }, specs: { Type: "Full-width OLED" } },
  { name: "Windows", category: "GLASS", meshName: "windows", animation: null,
    hotspotPosition: { x: 0, y: 1.5, z: 0 }, specs: { Glazing: "Acoustic", Tint: "UV-block" } },
];
```

  In the vehicle-create loop, set `modelUrl: null`, add `category` per vehicle (`"Compact"|"SUV"|"Sports"`), and `parts: { create: PARTS.map((p, i) => ({ ...p, displayOrder: i })) }`. Set vehicle `category` from a small map: Aurora S→Compact, Terra X→SUV, Volt GT→Sports (also adjust `VEHICLES[0].type` to `HATCHBACK` for the Compact, keep SUV/SPORTS).

- [ ] **Step 3: Update `seed.test.ts`** — change the parts-per-vehicle assertion from 8 to 15:

```ts
  it("creates 3 vehicles with 15 parts each", async () => {
    const vehicles = await prisma.vehicle.findMany({ include: { parts: true } });
    expect(vehicles.length).toBe(3);
    for (const v of vehicles) expect(v.parts.length).toBe(15);
  });
```

- [ ] **Step 4: Migrate + seed + test**

Run:
```bash
. "$HOME/.nvm/nvm.sh"; nvm use 20
set -a; . ./.env; set +a
pnpm --filter @sev/api exec prisma migrate dev --name phase1_showroom
DATABASE_URL="postgresql://sev:sev@localhost:5544/smartev_test?schema=public" pnpm --filter @sev/api exec prisma migrate deploy
pnpm --filter @sev/api exec vitest run prisma/seed.test.ts
pnpm db:seed
```
Expected: migration `phase1_showroom` applies to both DBs; seed test passes (15 parts × 3); dev DB reseeded.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma && git commit -m "feat(db): showroom fields on Vehicle/VehiclePart + 15-component seed (phase1_showroom)"
```

### Task 2: Shared DTOs + catalog API

**Files:**
- Create: `packages/shared/src/types/showroom.ts`; Modify: `packages/shared/src/index.ts`
- Create: `apps/api/src/repositories/vehicle.repo.ts`, `src/controllers/vehicle.controller.ts`, `src/routes/vehicle.routes.ts`
- Modify: `apps/api/src/routes/index.ts`, `src/openapi.ts`
- Test: `apps/api/test/vehicles.test.ts`

**Interfaces:**
- Produces (shared): `Vec3`, `VehicleSummary`, `VehiclePartDTO`, `VehicleDetail`. API: `GET /api/v1/vehicles` → `{ vehicles: VehicleSummary[] }`; `GET /api/v1/vehicles/:slug` → `{ vehicle: VehicleDetail }` (404 if unknown). `vehicleRepo.listPublished()`, `vehicleRepo.bySlug(slug)`.

- [ ] **Step 1: Write the failing test** `apps/api/test/vehicles.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "./helpers/db.js";
import { runSeed } from "../prisma/seed.js";

const app = createApp();
beforeAll(async () => { await runSeed(prisma); });

describe("vehicle catalog", () => {
  it("lists published vehicles", async () => {
    const res = await request(app).get("/api/v1/vehicles");
    expect(res.status).toBe(200);
    expect(res.body.vehicles.length).toBe(3);
    expect(res.body.vehicles[0]).toHaveProperty("slug");
  });
  it("returns a vehicle with 15 parts by slug", async () => {
    const res = await request(app).get("/api/v1/vehicles/aurora-s");
    expect(res.status).toBe(200);
    expect(res.body.vehicle.parts).toHaveLength(15);
    expect(res.body.vehicle.parts[0]).toHaveProperty("meshName");
  });
  it("404s for an unknown slug", async () => {
    expect((await request(app).get("/api/v1/vehicles/nope")).status).toBe(404);
  });
});
```

- [ ] **Step 2: Run → fail** (`pnpm --filter @sev/api test vehicles` → 404 on `/vehicles`).

- [ ] **Step 3: Implement.** `packages/shared/src/types/showroom.ts`:

```ts
export interface Vec3 { x: number; y: number; z: number; }
export interface VehicleSummary {
  id: string; slug: string; name: string; category: string | null;
  type: string; thumbnailUrl: string | null; rangeKm: number; priceUsd: number;
}
export interface VehiclePartDTO {
  id: string; name: string; category: string; meshName: string;
  specs: Record<string, string> | null; hotspotPosition: Vec3 | null;
  animation: string | null; interactive: boolean; displayOrder: number;
}
export interface VehicleDetail extends VehicleSummary {
  modelUrl: string | null; metadata: Record<string, unknown> | null; parts: VehiclePartDTO[];
}
```
Append `export * from "./types/showroom.js";` to `packages/shared/src/index.ts`.

`apps/api/src/repositories/vehicle.repo.ts`:
```ts
import { prisma } from "../db.js";
export const vehicleRepo = {
  listPublished: () => prisma.vehicle.findMany({ where: { isPublished: true }, orderBy: { name: "asc" } }),
  bySlug: (slug: string) =>
    prisma.vehicle.findUnique({ where: { slug }, include: { parts: { orderBy: { displayOrder: "asc" } } } }),
};
```

`apps/api/src/controllers/vehicle.controller.ts`:
```ts
import type { Request, Response } from "express";
import type { VehicleSummary, VehicleDetail, VehiclePartDTO } from "@sev/shared";
import type { Vehicle, VehiclePart } from "@prisma/client";
import { vehicleRepo } from "../repositories/vehicle.repo.js";
import { HttpError } from "../lib/httpError.js";

function toSummary(v: Vehicle): VehicleSummary {
  return { id: v.id, slug: v.slug, name: v.name, category: v.category, type: v.type,
    thumbnailUrl: v.thumbnailUrl, rangeKm: v.rangeKm, priceUsd: v.priceUsd };
}
function toPart(p: VehiclePart): VehiclePartDTO {
  return { id: p.id, name: p.name, category: p.category, meshName: p.meshName,
    specs: (p.specs as Record<string, string> | null), hotspotPosition: (p.hotspotPosition as never),
    animation: p.animation, interactive: p.interactive, displayOrder: p.displayOrder };
}

export async function listVehicles(_req: Request, res: Response) {
  const rows = await vehicleRepo.listPublished();
  res.json({ vehicles: rows.map(toSummary) });
}
export async function getVehicle(req: Request, res: Response) {
  const v = await vehicleRepo.bySlug(req.params.slug!);
  if (!v || !v.isPublished) throw new HttpError(404, "Vehicle not found");
  const detail: VehicleDetail = { ...toSummary(v), modelUrl: v.modelUrl,
    metadata: (v.metadata as Record<string, unknown> | null), parts: v.parts.map(toPart) };
  res.json({ vehicle: detail });
}
```

`apps/api/src/routes/vehicle.routes.ts`:
```ts
import { Router } from "express";
import { asyncHandler } from "../controllers/helpers.js";
import * as ctrl from "../controllers/vehicle.controller.js";
export const vehicleRoutes: Router = Router();
vehicleRoutes.get("/", asyncHandler(ctrl.listVehicles));
vehicleRoutes.get("/:slug", asyncHandler(ctrl.getVehicle));
```
In `apps/api/src/routes/index.ts` add: `import { vehicleRoutes } from "./vehicle.routes.js";` and `router.use("/api/v1/vehicles", vehicleRoutes);`. In `openapi.ts` add `/vehicles` and `/vehicles/{slug}` GET entries (200/404).

- [ ] **Step 4: Run → pass** (`pnpm --filter @sev/api test vehicles` → 3 pass) and `pnpm --filter @sev/shared typecheck`.

- [ ] **Step 5: Commit**

```bash
git add packages/shared apps/api && git commit -m "feat(api): public vehicle catalog endpoints + shared showroom DTOs"
```

---

## Milestone 2 — Web logic layer (no 3D; fully unit-tested)

### Task 3: objectId + interaction bus

**Files:** Create `apps/web/src/showroom/interaction/objectId.ts`, `interactionBus.ts`, `InteractionProvider.tsx`; Test `interaction/interaction.test.ts`.

**Interfaces:** Produces `makeObjectId(vehicleId, componentId): string`; `InteractionEvent`; `createInteractionBus(): { emit, subscribe }`; `InteractionProvider`, `useInteractionBus()`.

- [ ] **Step 1: Failing test** `interaction/interaction.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { makeObjectId } from "./objectId.js";
import { createInteractionBus } from "./interactionBus.js";

describe("interaction", () => {
  it("builds a stable object id", () => {
    expect(makeObjectId("veh1", "part1")).toBe("veh1:part1");
  });
  it("delivers events to subscribers and unsubscribes", () => {
    const bus = createInteractionBus();
    const seen = vi.fn();
    const off = bus.subscribe(seen);
    bus.emit({ type: "click", objectId: "v:p", vehicleId: "v", componentId: "p", meshName: "doors", tMs: 0 });
    off();
    bus.emit({ type: "hover", objectId: "v:p", vehicleId: "v", componentId: "p", meshName: "doors", tMs: 1 });
    expect(seen).toHaveBeenCalledOnce();
    expect(seen.mock.calls[0]![0]).toMatchObject({ type: "click", meshName: "doors" });
  });
});
```
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement.**
`objectId.ts`:
```ts
import type { Role } from "@sev/shared"; // not used; placeholder import removed below
export function makeObjectId(vehicleId: string, componentId: string): string {
  return `${vehicleId}:${componentId}`;
}
export interface InteractionEvent {
  type: "hover" | "click" | "gaze" | "focus";
  objectId: string; vehicleId: string; componentId: string; meshName: string; tMs: number;
}
```
(Remove the unused `Role` import line — keep only `makeObjectId` + `InteractionEvent`.)
`interactionBus.ts`:
```ts
import type { InteractionEvent } from "./objectId.js";
type Handler = (e: InteractionEvent) => void;
export interface InteractionBus { emit(e: InteractionEvent): void; subscribe(h: Handler): () => void; }
export function createInteractionBus(): InteractionBus {
  const handlers = new Set<Handler>();
  return {
    emit: (e) => handlers.forEach((h) => h(e)),
    subscribe: (h) => { handlers.add(h); return () => { handlers.delete(h); }; },
  };
}
```
`InteractionProvider.tsx` (singleton bus via context; Phase-1 sink logs in dev):
```tsx
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { createInteractionBus, type InteractionBus } from "./interactionBus.js";
const Ctx = createContext<InteractionBus | null>(null);
export function InteractionProvider({ children }: { children: ReactNode }) {
  const ref = useRef<InteractionBus>(createInteractionBus());
  useEffect(() => ref.current.subscribe((e) => { if (import.meta.env.DEV) console.debug("[interaction]", e); }), []);
  return <Ctx.Provider value={ref.current}>{children}</Ctx.Provider>;
}
export function useInteractionBus(): InteractionBus {
  const c = useContext(Ctx);
  if (!c) throw new Error("useInteractionBus outside InteractionProvider");
  return c;
}
```
- [ ] **Step 4: Run → pass.**
- [ ] **Step 5: Commit** `git commit -m "feat(web): showroom interaction bus + stable object IDs (Phase 2 gaze seam)"`

### Task 4: GLB mesh→part mapping (pure)

**Files:** Create `apps/web/src/showroom/vehicle/glbMapping.ts`; Test `vehicle/glbMapping.test.ts`.

**Interfaces:** Produces `normalizeMeshName(s): string`; `mapMeshesToParts(meshNames: string[], parts: VehiclePartDTO[]): { meshName: string; part: VehiclePartDTO | null }[]`.

- [ ] **Step 1: Failing test:**
```ts
import { describe, it, expect } from "vitest";
import { normalizeMeshName, mapMeshesToParts } from "./glbMapping.js";
import type { VehiclePartDTO } from "@sev/shared";
const part = (meshName: string): VehiclePartDTO => ({
  id: meshName, name: meshName, category: "EXTERIOR", meshName, specs: null,
  hotspotPosition: null, animation: null, interactive: true, displayOrder: 0 });
describe("glbMapping", () => {
  it("normalizes names", () => {
    expect(normalizeMeshName("Front_Doors ")).toBe("front-doors");
  });
  it("maps meshes to parts by normalized name; unmatched -> null", () => {
    const parts = [part("doors"), part("wheels")];
    const res = mapMeshesToParts(["Doors", "Body"], parts);
    expect(res.find((r) => r.meshName === "Doors")!.part!.meshName).toBe("doors");
    expect(res.find((r) => r.meshName === "Body")!.part).toBeNull();
  });
});
```
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** `glbMapping.ts`:
```ts
import type { VehiclePartDTO } from "@sev/shared";
export function normalizeMeshName(s: string): string {
  return s.trim().toLowerCase().replace(/[_\s]+/g, "-");
}
export function mapMeshesToParts(meshNames: string[], parts: VehiclePartDTO[]) {
  const byName = new Map(parts.map((p) => [normalizeMeshName(p.meshName), p]));
  return meshNames.map((meshName) => ({ meshName, part: byName.get(normalizeMeshName(meshName)) ?? null }));
}
```
- [ ] **Step 4: Run → pass.** — [ ] **Step 5: Commit** `git commit -m "feat(web): GLB mesh->part auto-mapping (pure, tested)"`

### Task 5: Data hooks (`useVehicleCatalog`, `useVehicle`)

**Files:** Create `apps/web/src/showroom/data/useVehicleCatalog.ts`, `useVehicle.ts`; Test `data/data.test.tsx`.

**Interfaces:** Consumes `api` (Phase 0 client), TanStack Query. Produces `useVehicleCatalog(): UseQueryResult<VehicleSummary[]>`; `useVehicle(slug): UseQueryResult<VehicleDetail>`.

- [ ] **Step 1: Failing test** (mock `apiClient`, wrap in `QueryClientProvider`):
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useVehicleCatalog } from "./useVehicleCatalog.js";
import { api } from "../../lib/apiClient.js";
vi.mock("../../lib/apiClient", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};
beforeEach(() => vi.clearAllMocks());
describe("useVehicleCatalog", () => {
  it("returns the vehicle list", async () => {
    vi.mocked(api.get).mockResolvedValue({ vehicles: [{ id: "1", slug: "aurora-s", name: "Aurora S", category: "Compact", type: "HATCHBACK", thumbnailUrl: null, rangeKm: 560, priceUsd: 48000 }] });
    const { result } = renderHook(() => useVehicleCatalog(), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data![0]!.slug).toBe("aurora-s");
  });
});
```
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement.**
`useVehicleCatalog.ts`:
```ts
import { useQuery } from "@tanstack/react-query";
import type { VehicleSummary } from "@sev/shared";
import { api } from "../../lib/apiClient.js";
export function useVehicleCatalog() {
  return useQuery<VehicleSummary[]>({
    queryKey: ["vehicles"],
    queryFn: async () => (await api.get("/vehicles")).vehicles,
  });
}
```
`useVehicle.ts`:
```ts
import { useQuery } from "@tanstack/react-query";
import type { VehicleDetail } from "@sev/shared";
import { api } from "../../lib/apiClient.js";
export function useVehicle(slug: string | undefined) {
  return useQuery<VehicleDetail>({
    queryKey: ["vehicle", slug],
    enabled: !!slug,
    queryFn: async () => (await api.get(`/vehicles/${slug}`)).vehicle,
  });
}
```
- [ ] **Step 4: Run → pass.** — [ ] **Step 5: Commit** `git commit -m "feat(web): vehicle catalog data hooks"`

### Task 6: Camera-mode model + animation lerp helper

**Files:** Create `apps/web/src/showroom/scene/cameraModes.ts`, `vehicle/animationMath.ts`; Test `scene/cameraModes.test.ts`, `vehicle/animationMath.test.ts`.

**Interfaces:** Produces `CAMERA_MODES` (`["orbit","walk","first-person"]`), `nextCameraMode(m): CameraMode`, `CameraMode` type; `lerp(a,b,t): number`, `approach(current, target, dt, speed): number`.

- [ ] **Step 1: Failing tests:**
```ts
// cameraModes.test.ts
import { describe, it, expect } from "vitest";
import { nextCameraMode, CAMERA_MODES } from "./cameraModes.js";
describe("cameraModes", () => {
  it("cycles modes", () => {
    expect(CAMERA_MODES).toContain("orbit");
    expect(nextCameraMode("orbit")).toBe("walk");
    expect(nextCameraMode(CAMERA_MODES[CAMERA_MODES.length - 1]!)).toBe("orbit");
  });
});
```
```ts
// animationMath.test.ts
import { describe, it, expect } from "vitest";
import { lerp, approach } from "./animationMath.js";
describe("animationMath", () => {
  it("lerps", () => { expect(lerp(0, 10, 0.5)).toBe(5); });
  it("approaches a target without overshoot", () => {
    expect(approach(0, 1, 1, 100)).toBeCloseTo(1);
    expect(approach(0, 1, 0.001, 1)).toBeLessThan(1);
  });
});
```
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement.**
`cameraModes.ts`:
```ts
export const CAMERA_MODES = ["orbit", "walk", "first-person"] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];
export function nextCameraMode(m: CameraMode): CameraMode {
  const i = CAMERA_MODES.indexOf(m);
  return CAMERA_MODES[(i + 1) % CAMERA_MODES.length]!;
}
```
`animationMath.ts`:
```ts
export function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
/** Frame-rate-independent approach toward target; never overshoots. */
export function approach(current: number, target: number, dt: number, speed: number): number {
  const t = 1 - Math.exp(-speed * dt);
  return lerp(current, target, Math.min(1, t));
}
```
- [ ] **Step 4: Run → pass.** — [ ] **Step 5: Commit** `git commit -m "feat(web): camera-mode model + animation lerp helpers"`

---

## Milestone 3 — Scene chrome (3D; Canvas mocked in DOM tests)

### Task 7: Add R3F scene deps

- [ ] **Step 1:** add to `apps/web/package.json` deps `@react-three/postprocessing@^2.16.0`, `postprocessing@^6.36.0`, `@react-three/xr@^5.7.1`; devDeps `@react-three/test-renderer@^8.2.0`.
- [ ] **Step 2:** `. "$HOME/.nvm/nvm.sh"; nvm use 20; pnpm install` — Expected: added, no peer errors.
- [ ] **Step 3: Commit** `git commit -m "chore(web): add postprocessing + xr + r3f test-renderer"`

### Task 8: ShowroomCanvas + scene chrome

**Files:** Create `showroom/ShowroomCanvas.tsx`, `scene/StudioEnvironment.tsx`, `scene/Lighting.tsx`, `scene/ReflectiveFloor.tsx`, `scene/PostFX.tsx`. Test: none directly (composed/tested via ShowroomPage with a mocked Canvas in Task 17); these are visual.

**Interfaces:** Produces `<ShowroomCanvas>{children}</ShowroomCanvas>` (sets `shadows`, `dpr={[1,2]}`, ACES tone mapping, `gl={{ antialias:true }}`); `<StudioEnvironment/>`, `<Lighting/>`, `<ReflectiveFloor/>`, `<PostFX/>`.

- [ ] **Step 1: Implement** (complete code):
`ShowroomCanvas.tsx`:
```tsx
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping } from "three";
import type { ReactNode } from "react";
export function ShowroomCanvas({ children }: { children: ReactNode }) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [5, 2.5, 6], fov: 45 }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }} className="h-full w-full">
      {children}
    </Canvas>
  );
}
```
`scene/Lighting.tsx`:
```tsx
export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 9, 5]} intensity={1.4} castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001} />
      <directionalLight position={[-6, 4, -4]} intensity={0.5} color="#00d4ff" />
    </>
  );
}
```
`scene/StudioEnvironment.tsx` (Lightformer rig — reflections without external HDR):
```tsx
import { Environment, Lightformer } from "@react-three/drei";
export function StudioEnvironment() {
  return (
    <Environment resolution={256}>
      <Lightformer form="rect" intensity={2} position={[0, 5, -5]} scale={[10, 5, 1]} />
      <Lightformer form="rect" intensity={1} position={[5, 3, 2]} scale={[5, 5, 1]} color="#00d4ff" />
      <Lightformer form="rect" intensity={1} position={[-5, 3, 2]} scale={[5, 5, 1]} color="#a855f7" />
    </Environment>
  );
}
```
`scene/ReflectiveFloor.tsx`:
```tsx
import { MeshReflectorMaterial, ContactShadows } from "@react-three/drei";
export function ReflectiveFloor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <MeshReflectorMaterial mirror={0.4} resolution={1024} mixBlur={1} mixStrength={3}
          roughness={0.85} depthScale={1} color="#0a0a0f" metalness={0.6} />
      </mesh>
      <ContactShadows position={[0, 0, 0]} opacity={0.55} scale={20} blur={2.4} far={6} />
    </>
  );
}
```
`scene/PostFX.tsx`:
```tsx
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
export function PostFX() {
  return (
    <EffectComposer disableNormalPass>
      <Bloom intensity={0.6} luminanceThreshold={0.7} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette eskil={false} offset={0.2} darkness={0.7} />
    </EffectComposer>
  );
}
```
- [ ] **Step 2: typecheck** `pnpm --filter @sev/web typecheck` → clean.
- [ ] **Step 3: Commit** `git commit -m "feat(web): cinematic showroom scene chrome (env, lighting, reflective floor, bloom)"`

### Task 9: CameraRig + XRLayer

**Files:** Create `scene/CameraRig.tsx`, `scene/XRLayer.tsx`.

**Interfaces:** Consumes `CameraMode`. Produces `<CameraRig mode={CameraMode} />`; `<XRLayer enabled boolean>{children}</XRLayer>` + exported `ShowroomVRButton`.

- [ ] **Step 1: Implement** `CameraRig.tsx`:
```tsx
import { OrbitControls, PointerLockControls } from "@react-three/drei";
import type { CameraMode } from "./cameraModes.js";
export function CameraRig({ mode }: { mode: CameraMode }) {
  if (mode === "first-person") return <PointerLockControls />;
  // "walk" = orbit with pan enabled at human height target; "orbit" = framed orbit.
  return (
    <OrbitControls makeDefault enableDamping dampingFactor={0.08}
      enablePan={mode === "walk"} minDistance={2.5} maxDistance={14}
      target={[0, mode === "walk" ? 1.4 : 0.8, 0]} maxPolarAngle={Math.PI / 2} />
  );
}
```
`XRLayer.tsx`:
```tsx
import { XR, VRButton } from "@react-three/xr";
import type { ReactNode } from "react";
export function ShowroomVRButton() { return <VRButton />; }
export function XRLayer({ children }: { children: ReactNode }) {
  return <XR>{children}</XR>;
}
```
- [ ] **Step 2: typecheck** → clean. — [ ] **Step 3: Commit** `git commit -m "feat(web): camera rig (orbit/walk/first-person) + optional WebXR layer"`

---

## Milestone 4 — Vehicles & interactive parts

### Task 10: Procedural descriptor data (DRY: base parts + per-type variants)

**Files:** Create `vehicle/proceduralData.ts`; Test `vehicle/proceduralData.test.ts`.

**Interfaces:** Produces `PartDescriptor` type; `getProceduralParts(type: string): PartDescriptor[]` returning exactly the 15 components for any of `HATCHBACK|SUV|SPORTS` (falls back to HATCHBACK).

- [ ] **Step 1: Failing test:**
```ts
import { describe, it, expect } from "vitest";
import { getProceduralParts } from "./proceduralData.js";
describe("proceduralData", () => {
  it("returns 15 parts for each vehicle type with required mesh names", () => {
    for (const t of ["HATCHBACK", "SUV", "SPORTS"]) {
      const parts = getProceduralParts(t);
      expect(parts).toHaveLength(15);
      expect(parts.map((p) => p.meshName)).toContain("charging-port");
    }
  });
  it("varies body color by type", () => {
    expect(getProceduralParts("SPORTS").find((p) => p.meshName === "body")!.color)
      .not.toBe(getProceduralParts("SUV").find((p) => p.meshName === "body")!.color);
  });
});
```
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** `proceduralData.ts` — a `BASE_PARTS: PartDescriptor[]` array of the 15 components (each: `meshName`, `kind: "box"|"cylinder"|"sphere"`, `args:number[]`, `position:[number,number,number]`, optional `rotation`, `color`, `metalness`, `roughness`, optional `emissive`, `interactive:boolean`), plus `VARIANTS: Record<"HATCHBACK"|"SUV"|"SPORTS", { bodyScale:[number,number,number]; bodyColor:string; accent:string }>`, and `getProceduralParts(type)` that clones BASE_PARTS, applies the variant's `bodyScale` to the body/cabin and sets body color + accent (headlights/taillights/charging emissive). *(Geometry values are authored during implementation; the test fixes the contract: 15 parts, all required meshNames, color varies by type.)*
- [ ] **Step 4: Run → pass.** — [ ] **Step 5: Commit** `git commit -m "feat(web): data-driven procedural vehicle descriptors (3 variants x 15 parts)"`

### Task 11: PartMesh + useVehicleAnimation + InteractivePart

**Files:** Create `vehicle/PartMesh.tsx`, `vehicle/useVehicleAnimation.ts`, `vehicle/InteractivePart.tsx`; Test `vehicle/InteractivePart.test.tsx` (uses `@react-three/test-renderer`).

**Interfaces:** Consumes `PartDescriptor`, `VehiclePartDTO`, `makeObjectId`, `useInteractionBus`, `approach`. Produces `<PartMesh descriptor/>`; `useVehicleAnimation(ref, { animation, active })`; `<InteractivePart part vehicleId descriptor onSelect />` which sets `mesh.userData.objectId` and emits `InteractionEvent`s.

- [ ] **Step 1: Failing test** `InteractivePart.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { InteractivePart } from "./InteractivePart.js";
import { InteractionProvider } from "../interaction/InteractionProvider.js";
import type { VehiclePartDTO } from "@sev/shared";
const part: VehiclePartDTO = { id: "p1", name: "Doors", category: "DOORS", meshName: "doors",
  specs: null, hotspotPosition: null, animation: "door-open", interactive: true, displayOrder: 0 };
const desc = { meshName: "doors", kind: "box" as const, args: [1, 1, 1], position: [0, 0, 0] as [number, number, number],
  color: "#888", metalness: 0.5, roughness: 0.5, interactive: true };
describe("InteractivePart", () => {
  it("tags the mesh with a stable objectId and fires click events", async () => {
    const onSelect = vi.fn();
    const renderer = await ReactThreeTestRenderer.create(
      <InteractionProvider>
        <InteractivePart part={part} vehicleId="v1" descriptor={desc} onSelect={onSelect} />
      </InteractionProvider>,
    );
    const mesh = renderer.scene.findByType("Mesh");
    expect(mesh.instance.userData.objectId).toBe("v1:p1");
    await renderer.fireEvent(mesh, "click");
    expect(onSelect).toHaveBeenCalledWith("p1");
  });
});
```
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement.** `PartMesh.tsx` renders geometry by `descriptor.kind` (`boxGeometry`/`cylinderGeometry`/`sphereGeometry` with `args`) + `meshStandardMaterial` (color/metalness/roughness/emissive), `castShadow receiveShadow`. `useVehicleAnimation.ts` uses `useFrame` + `approach()` to drive a target (hover scale, click open-angle) on the passed `ref`. `InteractivePart.tsx`:
```tsx
import { useMemo, useRef, useState } from "react";
import type { Group } from "three";
import type { VehiclePartDTO } from "@sev/shared";
import { PartMesh, type PartDescriptor } from "./PartMesh.js"; // PartDescriptor re-exported from proceduralData via PartMesh
import { Hotspot } from "./Hotspot.js";
import { makeObjectId, type InteractionEvent } from "../interaction/objectId.js";
import { useInteractionBus } from "../interaction/InteractionProvider.js";
import { useVehicleAnimation } from "./useVehicleAnimation.js";

export function InteractivePart({ part, vehicleId, descriptor, onSelect }:
  { part: VehiclePartDTO; vehicleId: string; descriptor: PartDescriptor; onSelect: (componentId: string) => void }) {
  const ref = useRef<Group>(null);
  const bus = useInteractionBus();
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const objectId = useMemo(() => makeObjectId(vehicleId, part.id), [vehicleId, part.id]);
  useVehicleAnimation(ref, { animation: part.animation, active: open, hovered });
  const fire = (type: InteractionEvent["type"]) =>
    bus.emit({ type, objectId, vehicleId, componentId: part.id, meshName: part.meshName, tMs: performance.now() });
  return (
    <group ref={ref}
      onUpdate={(g) => { g.userData.objectId = objectId; g.children.forEach((c) => (c.userData.objectId = objectId)); }}
      onPointerOver={(e) => { e.stopPropagation(); if (part.interactive) { setHovered(true); fire("hover"); } }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); if (!part.interactive) return; setOpen((o) => !o); fire("click"); onSelect(part.id); }}>
      <PartMesh descriptor={descriptor} />
      {part.interactive && part.hotspotPosition && <Hotspot position={part.hotspotPosition} label={part.name} hovered={hovered} />}
    </group>
  );
}
```
*(Note: the test asserts `userData.objectId` on the mesh; `onUpdate` propagates it to children. If test-renderer doesn't fire `onUpdate`, set `userData` via a `useEffect` traversing `ref.current` instead — implementer picks whichever the renderer supports, keeping the asserted contract `mesh.userData.objectId === "v1:p1"`.)*
- [ ] **Step 4: Run → pass.** — [ ] **Step 5: Commit** `git commit -m "feat(web): InteractivePart with object IDs, hooks, hover/click animation"`

### Task 12: Hotspot + ProceduralVehicle + VehicleModel

**Files:** Create `vehicle/Hotspot.tsx`, `vehicle/ProceduralVehicle.tsx`, `vehicle/VehicleModel.tsx`; Test `vehicle/VehicleModel.test.tsx` (mock heavy children; assert procedural path renders parts).

**Interfaces:** Produces `<Hotspot position label hovered/>`; `<ProceduralVehicle vehicle onSelect/>`; `<VehicleModel vehicle onSelect/>` (null modelUrl → procedural; non-null → `<GlbVehicle>` in Suspense+ErrorBoundary fallback to procedural).

- [ ] **Step 1: Failing test** — render `<ProceduralVehicle>` via test-renderer with a 2-part vehicle, assert 2 `InteractivePart` groups exist (count meshes). *(Full test code authored in implementation; contract: one InteractivePart per DB part whose meshName has a descriptor.)*
- [ ] **Step 2–4:** Implement. `Hotspot.tsx` = drei `<Html>` pill at `position`, highlighted when `hovered`. `ProceduralVehicle.tsx`: `getProceduralParts(vehicle.type)`, join to `vehicle.parts` by `meshName`, render `<InteractivePart>` per matched part. `VehicleModel.tsx`: if `vehicle.modelUrl` render `<Suspense fallback={<ProceduralVehicle…/>}><ErrorBoundary fallback={<ProceduralVehicle…/>}><GlbVehicle url parts onSelect/></ErrorBoundary></Suspense>` else `<ProceduralVehicle/>`. `GlbVehicle` uses `useGLTF` + `mapMeshesToParts`. Run tests → pass.
- [ ] **Step 5: Commit** `git commit -m "feat(web): Hotspot, ProceduralVehicle, GLB-or-procedural VehicleModel"`

---

## Milestone 5 — Assembly & route

### Task 13: HUD, switcher, camera toggle, HotspotPanel

**Files:** Create `ui/ShowroomHUD.tsx`, `ui/VehicleSwitcher.tsx`, `ui/CameraModeToggle.tsx`, `ui/HotspotPanel.tsx`; Test `ui/HotspotPanel.test.tsx`.

**Interfaces:** Produces glassmorphic overlays. `HotspotPanel({ part: VehiclePartDTO | null, onClose })` shows specs rows + a labelled **"Attention — available after Phase 3"** placeholder.

- [ ] **Step 1: Failing test** `HotspotPanel.test.tsx`: renders specs + the attention placeholder when given a part; renders nothing when `part` is null:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HotspotPanel } from "./HotspotPanel.js";
const part = { id: "p", name: "Battery Pack", category: "BATTERY", meshName: "battery",
  specs: { Capacity: "82 kWh" }, hotspotPosition: null, animation: null, interactive: true, displayOrder: 0 };
describe("HotspotPanel", () => {
  it("shows specs and the attention placeholder", () => {
    render(<HotspotPanel part={part} onClose={() => {}} />);
    expect(screen.getByText("Battery Pack")).toBeInTheDocument();
    expect(screen.getByText(/82 kWh/)).toBeInTheDocument();
    expect(screen.getByText(/available after Phase 3/i)).toBeInTheDocument();
  });
  it("renders nothing without a part", () => {
    const { container } = render(<HotspotPanel part={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```
- [ ] **Step 2–4:** Implement the four overlays (glass tokens; `VehicleSwitcher` maps catalog → buttons; `CameraModeToggle` uses `nextCameraMode`; `HotspotPanel` as tested). Run → pass.
- [ ] **Step 5: Commit** `git commit -m "feat(web): showroom HUD, vehicle switcher, camera toggle, hotspot panel"`

### Task 14: ShowroomPage + lazy route

**Files:** Create `showroom/ShowroomPage.tsx`; Modify `apps/web/src/router.tsx`; Test `showroom/ShowroomPage.test.tsx` (mock `ShowroomCanvas` to a div + mock api).

**Interfaces:** Produces default-exported `ShowroomPage` wiring catalog → state (activeSlug, cameraMode, selectedPart) → `InteractionProvider` + `ShowroomCanvas`(scene + VehicleModel) + HUD + HotspotPanel. Route `/showroom` (public), lazy-loaded.

- [ ] **Step 1: Failing test** — mock `./ShowroomCanvas` to render `{children}` in a div and mock `apiClient` (catalog + one vehicle); assert the `VehicleSwitcher` lists 3 vehicles and selecting one shows its name. *(Test authored in implementation; contract: page renders switcher from catalog and reacts to selection.)*
- [ ] **Step 2–4:** Implement `ShowroomPage` (Suspense + lazy heavy scene; default vehicle = first in catalog). Add to `router.tsx`: `const ShowroomPage = lazy(() => import("./showroom/ShowroomPage.js"));` and `<Route path="/showroom" element={<Suspense fallback={<div className="p-8 text-slate-400">Loading showroom…</div>}><ShowroomPage /></Suspense>} />`. Add a "Showroom" link on the landing CTA and customer dashboard. Run → pass.
- [ ] **Step 5: Commit** `git commit -m "feat(web): ShowroomPage assembly + lazy /showroom route"`

---

## Milestone 6 — Performance, docs, verification, PR

### Task 15: Perf pass + decoders placeholder + docs

**Files:** Create `apps/web/public/decoders/README.md`; Modify `docs/RUNBOOK.md`, `vehicle/VehicleModel.tsx` (preload + frameloop note).

- [ ] **Step 1:** Set `<Canvas frameloop="demand">` is not used (controls need continuous) — instead document demand-invalidation; ensure the `/showroom` chunk is lazy (Task 14) and `useGLTF.preload` is called for a vehicle's `modelUrl` when set. Add `public/decoders/README.md` explaining where Draco/KTX2 decoder files go for compressed GLBs.
- [ ] **Step 2:** Add a "VR Showroom" section to `docs/RUNBOOK.md` (route `/showroom`, camera modes, how to add a vehicle = DB row + optional GLB, decoder path).
- [ ] **Step 3: Commit** `git commit -m "perf(web): lazy showroom + GLB preload; docs: showroom runbook + decoders"`

### Task 16: Full verification + PR

- [ ] **Step 1:** Run the gate:
```bash
. "$HOME/.nvm/nvm.sh"; nvm use 20
pnpm -r typecheck
pnpm -r test
pnpm --filter @sev/web build
```
Expected: typecheck clean; all suites pass (api incl. vehicles; web incl. showroom logic + InteractivePart + HotspotPanel + ShowroomPage); web build bundles with the showroom in its own lazy chunk.
- [ ] **Step 2:** Manual smoke: `pnpm dev`, open `/showroom`, switch vehicles, hover/click parts (hotspot panel + animation), toggle camera modes.
- [ ] **Step 3: Push + PR**
```bash
git push -u origin rebuild/phase-1-showroom
gh pr create --base rebuild/enterprise-v2 --head rebuild/phase-1-showroom \
  --title "Phase 1 — VR Showroom: cinematic R3F scene, 3 EVs, interactive parts, GLB-ready" \
  --body "Implements docs/superpowers/specs/2026-06-27-phase-1-vr-showroom-design.md. Stacked on Phase 0 (#2). All typechecks + tests green; see docs/RUNBOOK.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

## Self-Review (author check vs spec)

- **Spec coverage:** scene/env/lighting/reflections/bloom (T8) ✓; 3 vehicles ×15 components (T10 data, T12 render) ✓; interactive parts w/ IDs+vehicleId+componentId+hover/click anim+hotspot+gaze/analytics hooks (T3,T11) ✓; GLB-ready modular loader + auto-map (T4,T12) ✓; camera modes + WebXR (T9) ✓; catalog API + DB-driven (T1,T2) ✓; data hooks (T5) ✓; HUD/switcher/panel (T13) ✓; page+route (T14) ✓; perf lazy/preload/LOD-seam + docs (T15) ✓; verification+PR (T16) ✓.
- **Type consistency:** `VehiclePartDTO`/`VehicleDetail`/`Vec3` defined in shared (T2), consumed identically by hooks (T5), mapping (T4), parts (T11), panel (T13). `CameraMode`/`nextCameraMode` (T6) used by CameraRig (T9) + toggle (T13). `InteractionEvent`/`makeObjectId`/bus (T3) used by InteractivePart (T11). `PartDescriptor` defined once (T10/PartMesh) and threaded through.
- **Placeholder scan:** geometry-authoring and two scene/page tests are marked "authored during implementation" with an explicit asserted **contract** (counts, meshNames, objectId, switcher behavior) — not vague TODOs. All logic/contract/API/hook code is complete.
- **Known divergence from a literal reading of the spec:** procedural parts are a DRY descriptor table + generic renderer (not 15 bespoke component files); this satisfies the spec's "reusable, modular, add-by-data" intent better. Noted here intentionally.


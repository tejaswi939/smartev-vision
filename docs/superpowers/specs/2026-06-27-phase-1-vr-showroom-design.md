# SmartEV Vision — Phase 1 (VR Showroom) Design

- **Date:** 2026-06-27
- **Status:** Design pending stakeholder review
- **Branch:** `rebuild/phase-1-showroom` (stacked on `rebuild/enterprise-v2` / Phase 0)
- **Builds on:** Phase 0 foundation (monorepo, `Vehicle`/`VehiclePart` catalog, `modelUrl`, design system, `GazeProvider` seam).

## 1. Goal & scope

Deliver a **premium, modular EV showroom** in the browser: a high-fidelity R3F scene with HDR-style lighting, reflections, shadows, and bloom; **three procedural EVs** (Compact / SUV / Sports) built from reusable components; **per-component interactive hotspots** with specs + animations; and **multiple camera modes** (orbit / walk / first-person / zoom + optional WebXR). Everything is **data-driven from the database** and **GLB-ready**, so new vehicles are added by inserting DB rows (and optionally dropping in a `.glb`) with **no application-code changes**.

**In scope (Phase 1):**
- Showroom scene + environment + post-processing + camera modes + optional WebXR entry.
- 3 procedural vehicles, each with 15 named interactive components.
- Hotspots showing **specifications** + triggering **component animations** (e.g. doors open).
- A **GLB loading pipeline** (GLTF + Draco/KTX2-ready) that renders a real model when `modelUrl` resolves to one, else the procedural fallback; auto-maps GLB meshes to DB parts by `meshName`.
- Catalog **read API** (`/vehicles`) + a React data layer.
- **Unique IDs + interaction hooks** (gaze / analytics / click / animation) on every interactive object.

**Out of scope (later phases), with seams prepared now:**
- Actual gaze capture & session recording → **Phase 2** (`GazeProvider` implementation + persistence). Phase 1 ships the *hooks/IDs and a client event bus*, wired to a no-op sink.
- Live analytics, heatmaps, real "customer attention" numbers in hotspots → **Phase 3/4**. Phase 1 hotspots show static specs + a clearly-labelled placeholder for attention data.
- Real/photoreal GLB assets → added later by the user via the pipeline.

## 2. Asset strategy (approved: procedural + GLB-ready)

- **Procedural vehicles now:** each EV is composed from reusable PBR part meshes. "Premium" comes from a **Lightformer-based studio environment** (no external HDR file needed → CSP-safe/offline), a **reflective floor** (`MeshReflectorMaterial`), **contact shadows**, and **bloom** post-processing — not from photoreal geometry.
- **GLB pipeline from day one:** a `VehicleModel` component resolves `vehicle.modelUrl`. If it points to a usable `.glb`, it loads via `useGLTF` (Draco + KTX2 decoders configurable via a local decoder path); otherwise it renders the matching `ProceduralVehicle`. The loader **auto-detects interactive meshes by name** and maps them to the vehicle's `VehiclePart` rows; unmapped meshes render as static.
- **Add-a-vehicle contract:** insert a `Vehicle` row + its `VehiclePart` rows (and optionally upload a `.glb` to the `modelUrl` path). No code change. The procedural builder is selected by `Vehicle.type` when no GLB is present.
- **Asset compression/LOD seam:** Draco/KTX2 wired but unused until real GLBs arrive; `<Detailed>` (LOD) wrapper and `frameloop="demand"` documented for when heavy meshes land.

## 3. Data model changes (Prisma migration `phase1_showroom`)

Extend the existing catalog (additive, non-breaking):

- **`VehiclePart`** gains:
  - `specs Json?` — key/value spec rows shown in the hotspot (e.g. `{ "Torque": "430 Nm" }`).
  - `hotspotPosition Json?` — `{ x, y, z }` anchor for the 3D hotspot marker (relative to the vehicle origin).
  - `animation String?` — name of the part's animation clip / procedural animation (e.g. `door-open`).
  - `interactive Boolean @default(true)` — whether the part is a hotspot/clickable.
- **`Vehicle`** gains:
  - `category String?` — display category ("Compact" / "SUV" / "Sports") distinct from the `type` enum, for UI grouping.
  - `metadata Json?` — freeform showroom metadata (tagline, accent color, camera framing).
  - **`modelUrl` made nullable (`String?`)** — `null` means "render the procedural builder"; a non-null path means a real GLB has been uploaded. The seed sets `modelUrl = null` for the three procedural vehicles (so no failed asset fetches), and the Phase 0 placeholder paths are dropped.
- **`PartCategory` enum** gains `CHARGING`, `GLASS`, `SEATING` to cover the 15 components.

**15 canonical components** (seeded for all 3 vehicles): Body, Doors, Hood, Trunk, Wheels, Steering Wheel, Dashboard, Infotainment Screen, Battery Pack, Charging Port, Mirrors, Seats, Headlights, Taillights, Windows. Seed adds `specs`, `hotspotPosition`, and `animation` for each. `meshName` is the stable key used both for procedural part lookup and GLB mesh auto-mapping.

Seed script (`apps/api/prisma/seed.ts`) is updated to emit the richer parts; the Phase 0 seed-count test is updated to the new component count.

## 4. Backend additions (catalog read API)

New public, layered endpoints under `/api/v1` (controllers → `vehicle.repo`):

- `GET /api/v1/vehicles` → `Vehicle[]` (published only; id, slug, name, category, type, thumbnailUrl, headline specs).
- `GET /api/v1/vehicles/:slug` → vehicle + ordered `parts` (each with `meshName`, `category`, `specs`, `hotspotPosition`, `animation`, `interactive`).

No auth required to browse the showroom catalog (read-only). Interaction/gaze **persistence** is deferred to Phase 2; Phase 1 exposes the data the scene needs. Supertest integration tests cover both endpoints (incl. 404 for unknown slug).

## 5. Scene architecture (R3F)

```
<ShowroomCanvas>                     // <Canvas> wrapper: shadows, color mgmt, frameloop, dpr
  <StudioEnvironment/>               // Lightformer rig + <Environment> (procedural) for reflections
  <Lighting/>                        // key/fill/rim directional + ambient; shadow-casting
  <ReflectiveFloor/>                 // MeshReflectorMaterial + ContactShadows
  <CameraRig mode>                   // switches Orbit | Walk | FirstPerson controls; handles zoom
  <Suspense fallback={<SceneLoader/>}>
    <VehicleStage vehicle>           // positions/frames the active vehicle
      <VehicleModel vehicle>         // GLB-or-procedural resolver
        <InteractivePart part …/>    // one per VehiclePart (wraps mesh/group)
        …
        <Hotspot part …/>            // 3D marker per interactive part
      </VehicleModel>
    </VehicleStage>
  </Suspense>
  <PostFX/>                          // EffectComposer + Bloom (+ vignette)
  <XRLayer/>                         // optional: <XR> + controllers when session active
</ShowroomCanvas>
+ <ShowroomHUD/>                     // DOM overlay: vehicle switcher, camera-mode toggle, VR button, part list
+ <HotspotPanel/>                    // DOM overlay: selected part specs + animation + attention placeholder
```

- **Environment & look:** `@react-three/drei` `Environment` (Lightformer children, no external file) + `MeshReflectorMaterial` floor + `ContactShadows`; **bloom/vignette** via `@react-three/postprocessing`.
- **Camera modes** (one `CameraRig`, mode from UI state):
  - *Orbit* (default) — `OrbitControls` (rotate/zoom/pan, damping).
  - *Walk* — ground-plane movement (WASD) at eye height, drag-look.
  - *First-person* — `PointerLockControls` + WASD.
  - *Zoom* — dolly via scroll/controls in every mode.
  - *WebXR (optional)* — `@react-three/xr` `<XR>` + VR button; only active if the device/browser supports WebXR; desktop is fully functional without it.
- New web deps: `@react-three/postprocessing`, `postprocessing`, `@react-three/xr`; dev: `@react-three/test-renderer` (scene-graph assertions).

## 6. Component hierarchy & files (`apps/web/src/showroom/`)

| File | Responsibility |
|------|----------------|
| `ShowroomPage.tsx` | Route page; lays out Canvas + HUD + HotspotPanel; owns showroom UI state (active vehicle, camera mode, selected part). |
| `ShowroomCanvas.tsx` | `<Canvas>` config (shadows, ACES tone mapping, dpr, `frameloop`). |
| `scene/StudioEnvironment.tsx`, `Lighting.tsx`, `ReflectiveFloor.tsx`, `PostFX.tsx` | Environment, lights, floor/shadows, post-processing. |
| `scene/CameraRig.tsx` | Mode-switched controls + zoom. |
| `scene/XRLayer.tsx` | Optional WebXR wrapper + VR button. |
| `vehicle/VehicleModel.tsx` | GLB-or-procedural resolver; auto-maps meshes → parts. |
| `vehicle/procedural/{CompactEV,SuvEV,SportsEV}.tsx` | Three procedural bodies, composed from `parts/` primitives. |
| `vehicle/parts/*` | Reusable part primitives (Body, Door, Wheel, SteeringWheel, Dashboard, Infotainment, BatteryPack, ChargingPort, Mirror, Seat, Headlight, Taillight, Window, Hood, Trunk). |
| `vehicle/InteractivePart.tsx` | Wraps a mesh/group; assigns unique IDs, wires hover/click + gaze/analytics hooks + animation controller. |
| `vehicle/Hotspot.tsx` | 3D annotation marker (drei `<Html>`), opens the panel. |
| `vehicle/useVehicleAnimation.ts` | Procedural/GLB animation controller (e.g. door swing) via a `useFrame`-based lerp — no extra animation dependency. |
| `ui/ShowroomHUD.tsx`, `HotspotPanel.tsx`, `CameraModeToggle.tsx`, `VehicleSwitcher.tsx` | DOM overlays. |
| `data/useVehicleCatalog.ts`, `useVehicle.ts` | React Query hooks → `/vehicles`, `/vehicles/:slug`. |
| `interaction/objectId.ts` | `makeObjectId(vehicleId, componentId)` → stable unique id; `InteractionEvent` type. |
| `interaction/useInteractionBus.ts` | Client event bus; Phase-1 sink = console/no-op, **Phase-2 seam** for the gaze/analytics pipeline. |

## 7. Interactive objects, hotspots & hooks

Every interactive component carries (requirement #7 / your spec):
- **`objectId`** — stable unique id `${vehicleId}:${componentId}` (also written to `mesh.userData.objectId` so a gaze raycaster in Phase 2 can resolve hits).
- **`vehicleId`, `componentId`** (the `VehiclePart.id`), **`meshName`**.
- **Hotspot metadata** — `specs`, `hotspotPosition`, label.
- **Interaction hooks** — `onHover`, `onClick`, `onGaze` (stub) all funnel through `useInteractionBus` as a typed `InteractionEvent { type: 'hover'|'click'|'gaze'|'focus', objectId, vehicleId, componentId, tMs }`.
- **Animation controller** — `useVehicleAnimation` plays the part's `animation` (door open/close, charging-port flap, hood lift) on click.

`HotspotPanel` shows the part's specs + an animation toggle + a labelled **"Attention — available after Phase 3"** placeholder, so the UI is complete and the analytics slot is reserved.

## 8. GLB loader & mesh auto-mapping

`VehicleModel` algorithm:
1. If `vehicle.modelUrl` is **non-null**, load it with `useGLTF` (Draco + KTX2 decoders from a local `/decoders/` path), wrapped in an **error boundary** that falls back to the procedural builder if the asset is missing or fails to load.
2. Traverse the loaded scene; for each mesh whose name matches a `VehiclePart.meshName` (case-insensitive, normalized), wrap it in `InteractivePart` with that part's metadata.
3. Meshes with no matching part render static. Parts with no matching mesh are skipped (logged).
4. If `modelUrl` is **null** (the Phase 1 default), pick the procedural builder by `vehicle.type` and render its parts, each keyed by `meshName`.

This keeps the **same `InteractivePart`/`Hotspot` wiring** for procedural and GLB vehicles — the only difference is where the geometry comes from.

## 9. Interaction flow (end-to-end)

1. `ShowroomPage` loads → `useVehicleCatalog()` fetches `/vehicles` → `VehicleSwitcher` lists Compact/SUV/Sports.
2. Selecting a vehicle → `useVehicle(slug)` fetches parts → `VehicleModel` renders (GLB or procedural) with `InteractivePart`s + `Hotspot`s.
3. User explores via the active camera mode; can switch Orbit/Walk/First-person/zoom, or enter VR if supported.
4. Hovering/clicking a part → `InteractionEvent` on the bus (console sink now) → `HotspotPanel` opens with specs → clicking "animate" runs the part animation.
5. (Phase 2) the same bus + `userData.objectId` feed the gaze provider and session recording — **no Phase-1 rework needed**.

## 10. Performance

- Showroom route **lazy-loaded** (like the landing's `CarPreview`); heavy 3D split into its own chunk.
- `frameloop="demand"` when idle (orbit), continuous only while animating/walking/XR.
- Procedural meshes kept low-poly; shared geometries/materials; instancing for repeated parts (wheels).
- GLB path: Draco/KTX2 compression + `<Detailed>` LOD wrapper ready; `useGLTF.preload` for the active vehicle.
- DPR clamped (`[1, 2]`); shadows on a single key light.

## 11. Testing

R3F rendering is limited under jsdom, so we test the **logic/data/UI layers** directly and use **`@react-three/test-renderer`** for targeted scene-graph assertions:
- `useVehicleCatalog` / `useVehicle` — fetch + shape (mocked api).
- `objectId` — stable id generation.
- `useInteractionBus` — emit/subscribe; events carry the right `objectId`/`componentId`.
- `InteractivePart` (test-renderer) — sets `userData.objectId`; click → emits a `click` `InteractionEvent`.
- `VehicleModel` — selects procedural-vs-GLB by input; maps meshes→parts (unit on the mapping fn).
- `HotspotPanel` — renders specs + the attention placeholder; animation toggle calls the controller.
- `CameraRig` — mode→controls selection (logic).
- API: Supertest for `/vehicles` and `/vehicles/:slug` (+404).
- The Canvas itself is mocked in DOM tests (no WebGL), as in Phase 0's `CarPreview` tests.

## 12. Engineering standards (carried from Phase 0)
Independently runnable + tested before merge; conventional commits per coherent batch; TS strict throughout; reusable components + shared contracts; lazy-loading & code-splitting for the 3D layer. Phase 1 lands as its own stacked PR.

## 13. Risks & mitigations
- **"Premium" vs procedural fidelity** — mitigated by environment/reflections/shadows/bloom; honest that it's stylized until real GLBs drop in.
- **External assets / CSP** — avoided by procedural Lightformer environment (no CDN HDR); Draco/KTX2 decoders served locally.
- **R3F testability** — addressed via logic-layer tests + `@react-three/test-renderer`; Canvas mocked in DOM tests.
- **Scene perf** — lazy load, demand frameloop, instancing, DPR clamp, single shadow light.

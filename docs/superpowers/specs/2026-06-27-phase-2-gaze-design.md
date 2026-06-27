# SmartEV Vision — Phase 2 (Gaze Tracking & Customer Analytics) Design

- **Date:** 2026-06-27
- **Status:** Design pending stakeholder review
- **Branch:** `rebuild/phase-2-gaze` (stacked on `rebuild/phase-1-showroom`)
- **Builds on:** Phase 1 seams — `GazeProvider` interface (`packages/shared`), `mesh.userData.objectId`, `InteractionBus`, and the `GazeData`/`InteractionLog`/`HeatmapCell`/`Session` tables.

## 1. Goal & scope

Turn the showroom into an end-to-end **attention-capture and analytics** system: pluggable (simulated) gaze providers → per-frame raycast resolves what the user is looking at → throttled/batched events → Postgres → an **incremental analytics engine** (attention, dwell, engagement, interest, rankings, popularity) → **heatmaps** (live 3D overlay + 2D dashboard + aggregate) → **near-real-time dashboards**.

**Approved decisions (drive this design):**
- **Compute in Node/TS** now; the analytics engine sits behind an interface (`AnalyticsEngine`) so Phase 3 can delegate ML to the Python service **without changing API contracts or the frontend**.
- **Provider plug-in architecture:** 3 simulated providers (mouse / camera-center / crosshair) + a `WebGazerProvider` **stub** ("Coming Soon"), all behind `GazeProvider`. Events are **provider-agnostic** (identical shape regardless of source) so analytics/DB/API/UI never depend on the provider.
- **Near-real-time via React-Query polling** (3–5s; pause on hidden tab; refetch after session end / vehicle switch; stale-while-revalidate; minimal payloads), abstracted so WS/SSE can replace it later.

**In scope:** providers + selector UI; gaze→object raycast resolution; fixation/dwell + entry/exit + focus-count detection; session recording (camera pose + gaze ray + viewed objects + interactions + vehicle switches); batched ingestion APIs; incremental aggregates; analytics engine + formulas; heatmaps (3D overlay, 2D grid, component scores, time-weighted, session + aggregate); live dashboards (KPIs, charts, timeline, journey, popularity); performance (throttle/batch/cache/incremental, 60 FPS).

**Out of scope (Phase 3+, seams prepared):** ML predictions, recommendation, emotion detection, sentiment (the `AnalyticsEngine` interface + `EmotionProvider`/`Prediction` tables are the seams); PDF/Excel **export** (Phase 5 — Phase 2 returns JSON reports); real WebGazer/Tobii wiring (provider stub).

## 2. Gaze provider architecture (plug-in)

`GazeProvider` (already in `packages/shared`) emits a provider-agnostic `GazeSample { tMs, x, y, depth?, partMeshName? }` where `x,y` are **normalized screen coords [0,1]**. Phase 2 adds, in `apps/web/src/showroom/gaze/providers/`:

- `SimulatedMouseGazeProvider` — gaze = mouse pointer position (default).
- `CameraCenterGazeProvider` — gaze = viewport center (follows camera aim; good for walk/first-person).
- `CrosshairGazeProvider` — gaze = a fixed center reticle the user aims by moving the camera.
- `WebGazerProvider` — **stub** conforming to the interface; `start()` resolves to a "not available" state and logs guidance. Lazy-loads `webgazer` only if later enabled. (Tobii is a future provider of the same shape.)

A **provider registry** (`providerRegistry.ts`) maps id → factory; a **settings selector** in the showroom HUD lists: *Mouse Pointer · Camera Center · Crosshair · WebGazer (Coming Soon, disabled)*. Switching providers swaps the source with **zero change** downstream. Selected provider id is persisted in `localStorage`.

## 3. Event flow (capture → resolve → batch → persist → analyze)

```
GazeProvider.onSample (raw screen x,y, ~throttled)
  └─► useGazeRecorder (inside <Canvas>):
        • throttle to ~20 Hz (decouple from 60 FPS render)
        • raycast from (x,y) through the active camera into the scene
        • read first hit's mesh.userData.objectId → resolve { vehicleId, componentId, meshName }
        • capture camera pos/rot + ray dir
        • update LOCAL dwell accumulator (entry/exit when objectId changes; focus when dwell ≥ FOCUS_MS)
        • emit InteractionEvent('gaze') on the InteractionBus (live 3D overlay reads this)
        • push a ResolvedGazeSample into a ring buffer
  └─► flush loop (every ~1.5s or 60 samples, whichever first; also on end/switch):
        POST /sessions/:id/gaze   (batch of samples)
        POST /sessions/:id/interactions (batch of click/open/enter/exit/switch)
  └─► server: bulk-insert GazeData; INCREMENTALLY upsert ComponentView aggregates; bump Session counters; invalidate cached analytics
Dashboards poll GET analytics/heatmap endpoints every 3–5s (pause when tab hidden; refetch on session end / switch).
```

**Session lifecycle:** a **Session = one vehicle view**. Entering the showroom / selecting a vehicle → `POST /sessions` (start). Switching vehicles → end current session (+ a `SWITCH` interaction) and start a new one. Leaving / unmount / `visibilitychange→hidden` for long → `POST /sessions/:id/end`. `navigator.sendBeacon` is used for the final flush on unload.

## 4. Database updates (migration `phase2_gaze`)

Additive; tuned with indexes for the analytics queries.

- **`Session`** gains: `userId` made **nullable** (anonymous showroom sessions allowed); `gazeProvider String?`; `interestScore Float?`; `totalGazeMs Float?`. (Keeps `engagementScore`, `status`, `durationSec`.)
- **`GazeData`** gains: `objectId String?` (denormalized resolved object — fast heatmap/aggregation without joins), `camPos Json?`, `camRot Json?`, `rayDir Json?`, `provider String?`. This table is the **session-recording + 2D-heatmap source** (throttled, batched). Indexes: `@@index([sessionId, tMs])`, `@@index([objectId])`.
- **NEW `ComponentView`** — the per-component aggregate that powers analytics + component heatmaps:
  `id, sessionId, vehicleId, partId?, meshName, totalViewMs Float, hoverMs Float, focusCount Int, entryCount Int, exitCount Int, interactionCount Int, firstSeenMs Float?, lastSeenMs Float?, updatedAt`. `@@unique([sessionId, meshName])`, `@@index([vehicleId, meshName])` (aggregate-across-users), `@@index([sessionId])`. **Incrementally upserted** per gaze batch.
- **`InteractionType`** enum gains `ENTER, EXIT, SWITCH`.
- **`HeatmapCell`** (exists): used to **persist precomputed aggregate / time-weighted** heatmap grids per vehicle (`vehicleId` added, `partId?` kept, plus `weight Float?`); session 2D heatmaps are computed on the fly from `GazeData`. Add `vehicleId String?` + `@@index([vehicleId])`.

## 5. API contracts (`/api/v1`, layered: routes → controllers → services → repos)

| Method & path | Auth | Body / returns |
|---|---|---|
| `POST /sessions` | optional (anon ok) | `{ vehicleId, gazeProvider, device? }` → `{ session }` |
| `POST /sessions/:id/end` | session owner / anon-by-id | → `{ session, summary }` (finalizes aggregates + engagement/interest) |
| `POST /sessions/:id/gaze` | by-id | `{ samples: ResolvedGazeSample[] }` → `{ inserted }` (bulk insert + incremental `ComponentView` upsert) |
| `POST /sessions/:id/interactions` | by-id | `{ events: InteractionDTO[] }` → `{ inserted }` |
| `GET /sessions/:id/analytics` | owner / ANALYST / ADMIN | → `SessionAnalytics` (attention breakdown, dwell, engagement, interest, ranking, timeline) |
| `GET /sessions/:id/heatmap` | owner / ANALYST / ADMIN | → `{ grid: number[][], resolution, componentScores }` |
| `GET /sessions/:id/report` | owner / ANALYST / ADMIN | → `SessionReport` (JSON insights; PDF/Excel export is Phase 5) |
| `GET /sessions` | auth | → recent sessions for the user (or all, for ANALYST/ADMIN) |
| `GET /vehicles/:slug/analytics` | ANALYST / ADMIN | → aggregate-across-sessions analytics + popularity context |
| `GET /vehicles/:slug/heatmap` | ANALYST / ADMIN | → aggregate heatmap grid + component scores |
| `GET /analytics/overview` | ANALYST / ADMIN | → global KPIs: totals, avg engagement, **vehicle popularity ranking**, top/bottom components |

`ResolvedGazeSample = { tMs, x, y, objectId?, meshName?, partId?, camPos?, camRot?, rayDir?, provider }`. Validation via `zod` contracts in `packages/shared`. Gaze/interaction writes are size-bounded (max batch length) and rate-tolerant.

## 6. Analytics engine (Node/TS, behind `AnalyticsEngine` interface)

`apps/api/src/analytics/` — pure functions + an `AnalyticsEngine` interface (Phase 3 can provide a Python-backed impl). Formulas:

- **Attention % (component)** = `componentView.totalViewMs / Σ(all totalViewMs) × 100`.
- **Most / Least viewed component** = argmax / argmin `totalViewMs` (excluding `body`/background where appropriate).
- **Average dwell time** = `totalViewMs / max(focusCount, 1)` (per component); session avg = `Σ totalViewMs / Σ focusCount`.
- **Engagement score (0–100)** = weighted mean of four normalized terms (carried from the legacy model):
  `coverage` (unique components viewed / total interactive components) · `depth` (avg dwell / `DWELL_BENCHMARK_MS`, capped) · `activity` (interaction events / minute, capped) · `breadth` (entry transitions / total, capped). Weights 0.3/0.3/0.2/0.2.
- **Customer interest score (0–100)** = `0.5·engagement + 0.3·(weighted dwell on high-value components: interior/infotainment/battery/seats) + 0.2·(interaction depth: clicks+opens, capped)`.
- **Component ranking** = components sorted by a composite `0.7·attention% + 0.3·(interactionCount normalized)`.
- **Vehicle popularity** = per vehicle across sessions: `sessionCount`, `avgEngagement`, `avgInterest`, `totalViewMs`; ranked by a composite (sessions × avgEngagement).

Performance: aggregates are **incrementally maintained** in `ComponentView` on write (no full recompute on read); read endpoints do a single indexed query + light math; results **cached** (in-memory TTL ~3s keyed by session/vehicle) to absorb polling.

## 7. Heatmap architecture

- **Real-time 3D overlay (client):** a toggle tints each `InteractivePart` by its **live local dwell** (and/or server `componentScores`) via a heat ramp. Reads the `InteractionBus`/local accumulator — provider-agnostic, no server round-trip for the live view.
- **Component attention score (server):** from `ComponentView` (`attention%`), returned with analytics; also feeds the overlay's "synced" mode.
- **2D dashboard heatmap (server):** aggregate `GazeData (x,y)` into an `N×N` grid (default 40×40), normalize, return as `number[][]`; the dashboard renders it to a `<canvas>` with a defined color ramp (`#0a0a0f → #00d4ff → #a855f7 → #ff006e`). **No server-side image generation** (keeps it in Node; no matplotlib).
- **Time-weighted:** samples weighted by recency and/or dwell when building the grid (`weight = 1 + dwellMs/1000`).
- **Session vs aggregate:** session heatmap computed on the fly from one session's `GazeData`; **aggregate** (across users/sessions for a vehicle) precomputed into `HeatmapCell` (refreshed on session end) and served from there for speed.

## 8. Session recording (replay / customer journey)

Each `GazeData` sample carries `tMs`, screen `x,y`, resolved `objectId/partId/meshName`, `camPos/camRot/rayDir`, and `provider` → enough to reconstruct **camera path + gaze ray + viewed-object sequence**. `InteractionLog` records `CLICK/OPEN/ENTER/EXIT/SWITCH` with `tMs`. The **customer journey** = ordered (viewed-object, dwell) sequence derived from `ComponentView.firstSeenMs` + the gaze stream; **vehicle switches** = the session sequence + `SWITCH` interactions.

## 9. Dashboards (near-real-time)

`apps/web/src/showroom/` (live overlay) + dashboard pages (replace Phase 0 placeholders):
- **Admin / Analyst overview** (`/admin`, `/insights`): real KPI cards (total sessions, avg engagement, avg interest, active sessions), **vehicle popularity** chart, **component popularity** chart, aggregate heatmap, recent sessions. Polls `/analytics/overview` + `/vehicles/:slug/*`.
- **Customer** (`/app`): "My Sessions", a **session detail** view (attention bar chart, **session timeline**, **customer journey**, 2D heatmap, KPI cards). Polls `/sessions/:id/analytics` + `/sessions/:id/heatmap`.
- Charts via **Recharts** (React-native, light) for bars/lines/timeline; the 2D heatmap via `<canvas>`. A shared `useAnalyticsPolling` hook wraps React Query (interval 4s, `refetchOnWindowFocus`, pause when `document.hidden`, manual `invalidate` on session end/switch).

## 10. Performance (60 FPS)

- Gaze **capture throttled to ~20 Hz**, decoupled from the 60 FPS render loop; raycast reuses a single `Raycaster`.
- Client **ring-buffer + batched POST** (size/interval bounded); `sendBeacon` on unload.
- Server **bulk inserts** + **incremental** `ComponentView` upserts (no per-read recompute); **TTL cache** on analytics reads; **indexed** queries only.
- Payloads minimal (only changed metrics); polling paused on hidden tab; 3D overlay updates from local state (no network).

## 11. File structure (key additions)

```
packages/shared/src/contracts/gaze.ts          # zod: ResolvedGazeSample, InteractionDTO, session start
packages/shared/src/types/analytics.ts         # SessionAnalytics, ComponentScore, HeatmapGrid, OverviewKPIs, VehiclePopularity

apps/api/src/repositories/{session.repo,gaze.repo,componentView.repo}.ts
apps/api/src/services/{session.service,gaze-ingest.service}.ts
apps/api/src/analytics/{AnalyticsEngine.ts, engine.node.ts, formulas.ts, heatmap.ts, cache.ts}
apps/api/src/controllers/{session.controller,analytics.controller}.ts
apps/api/src/routes/{session.routes,analytics.routes}.ts
apps/api/test/{gaze-ingest,analytics-formulas,session-api,analytics-api}.test.ts

apps/web/src/showroom/gaze/
  GazeProvider types (re-export shared) · providerRegistry.ts
  providers/{SimulatedMouseGazeProvider,CameraCenterGazeProvider,CrosshairGazeProvider,WebGazerProvider}.ts
  useGazeRecorder.ts (raycast + dwell + buffer) · gazeBatcher.ts · dwellTracker.ts
  HeatmapOverlay.tsx (3D tint) · Crosshair.tsx · GazeProviderSelector.tsx
apps/web/src/showroom/data/{useSession.ts, useAnalyticsPolling.ts}
apps/web/src/analytics/{AttentionChart,PopularityChart,SessionTimeline,CustomerJourney,Heatmap2D}.tsx
apps/web/src/pages/dashboards/* (wire real data)
```

## 12. Testing

- **api:** `gaze-ingest` (batch insert + incremental ComponentView upsert correctness), `analytics-formulas` (pure formula unit tests: attention %, dwell, engagement, interest, ranking, popularity with fixed inputs), `session-api` + `analytics-api` (Supertest: start/end/gaze/interactions/analytics/heatmap/overview, RBAC, anon sessions, 404s).
- **web:** `dwellTracker` (entry/exit/focus from a synthetic objectId stream), `gazeBatcher` (throttle/batch/flush thresholds), `providerRegistry` (id→provider), `useGazeRecorder` raycast→objectId resolution (mock camera/scene), `Heatmap2D` canvas render (grid → draws), chart components (render from fixture), `useAnalyticsPolling` (pauses on hidden, refetch on invalidate). R3F pieces use `@react-three/test-renderer`; Canvas mocked in DOM tests (as established).
- Provider-agnostic: one event-shape test ensures every provider yields the same `GazeSample`.

## 13. Engineering standards (carried forward)
TS strict; layered API; reusable hooks/components; provider/analytics behind interfaces (Phase 3 ML swap-in); near-real-time without new infra; tested + committed per milestone; lands as a stacked PR. Anonymous sessions supported; all gaze/analytics provider-agnostic.

## 14. Risks & mitigations
- **Data volume** — throttle (20 Hz) + batch + incremental aggregates + indexes; "store every event" = every *captured* (throttled) event, not every render frame.
- **60 FPS** — capture decoupled from render; single reusable raycaster; overlay from local state.
- **Anonymous sessions** — `Session.userId` nullable; aggregates are user-agnostic; owner-checks fall back to session id.
- **Phase 3 ML** — `AnalyticsEngine` interface + reserved `Prediction`/`EmotionDetection` tables; API/UI contracts unchanged when the Python impl lands.

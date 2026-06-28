# Phase 3 — AI / ML Service: Design Spec

**Status:** approved approach (Option A) — 2026-06-27
**Branch:** `rebuild/phase-3-ai-ml` (off `main`)

## 1. Goal

Add a Python **FastAPI + scikit-learn** microservice that turns a session's attention data
into **predictions**, **recommendations**, and **(placeholder) emotion** signals, wired into the
existing Node API and dashboards **without changing any existing contract**. Models are genuinely
trained (RandomForest) on **synthetically generated, labelled data**, and are retrainable on real
`ComponentView` data as it accumulates.

This modernizes the legacy Flask ML (`legacy/ml/predictor.py`, `legacy/ml/train_model.py`) onto
the monorepo's current 15-component schema and 3-vehicle catalog.

## 2. Non-goals (out of scope for Phase 3)

- Real webcam/face emotion recognition (emotion stays a **modular placeholder** with a swap-in seam).
- Automated retraining pipelines / online learning / model registry.
- GPU / deep-learning models — classical scikit-learn only.
- Changing the existing Node analytics (`engagement`/`interest`/`heatmap`/`popularity`) — Phase 3 is **additive**.
- PDF/Excel report export (that is Phase 4/5).

## 3. Architecture

```
Browser ──> Node API (Express) ──HTTP──> ML service (FastAPI + sklearn)   [docker compose: service `ml`]
                 │  PredictionService seam              │
                 │  (Python impl + graceful no-op)      ├─ /predict   (RandomForest archetype + interest tier)
                 ▼                                       ├─ /recommend (catalog mapping from prediction)
            Postgres                                     ├─ /emotion   (placeholder EmotionDetector)
            (Prediction, EmotionDetection)               └─ /health, /model/info
```

- The ML service is **stateless about the DB**: the Node API sends the session's component
  aggregates + scores as JSON; Python extracts features and responds. This keeps Python decoupled
  from Postgres/Prisma.
- The ML service is **optional**: if `ML_SERVICE_URL` is unset or the service is unreachable, the
  Node `PredictionService` falls back to a no-op (predictions simply absent; the rest of the app is
  unaffected). No hard dependency.

## 4. ML design

### 4.1 Feature vector (per session)

Computed by Python from the payload the Node API sends. Fixed, ordered:

- **Attention distribution (15):** for each canonical part meshName
  `[body, windows, doors, hood, trunk, wheels, steering-wheel, dashboard, infotainment, battery, charging-port, mirrors, seats, headlights, taillights]`,
  the fraction `totalViewMs(part) / Σ totalViewMs` (0 if no data).
- **coverage (1):** distinct parts viewed / 15.
- **engagement (1):** `engagementScore / 100`.
- **interest (1):** `interestScore / 100`.
- **focusDensity (1):** `Σ focusCount / Σ entryCount` (0 if no entries), clipped to [0, 5] / 5.
- **gazeLog (1):** `log1p(totalGazeMs) / log1p(600000)` (normalized to a ~10-min ceiling).

Total: **20 features**. Defined once in `services/ml/features.py` and unit-tested.

### 4.2 Targets & models

Two `RandomForestClassifier`s (scikit-learn), persisted with `joblib`:

1. **Preference archetype** — 3 classes: `performance` | `family` | `luxury`.
   Each archetype has signature components it over-indexes on:
   - `performance` → wheels, body, headlights, taillights, doors
   - `family` → seats, doors, infotainment, charging-port, windows
   - `luxury` → infotainment, dashboard, seats, steering-wheel, mirrors
2. **Interest tier** — 3 classes: `low` | `medium` | `high`, driven primarily by engagement,
   coverage, focusDensity, and gaze on high-value parts (infotainment, battery, seats).

`confidence = max(predict_proba)`; full per-class scores returned as a map.

### 4.3 Synthetic training data

`services/ml/synthetic.py` generates `N` labelled sessions per class:
- Sample a Dirichlet attention distribution **concentrated on the archetype's signature parts**, mixed
  with uniform noise (configurable `noise` weight) for realism/overlap.
- Derive engagement/interest/coverage/focus/gaze from the archetype + an interest-tier draw, with noise.
- Deterministic seed (passed in, not `random()` at import) for reproducible builds.
Produces a balanced, slightly-overlapping dataset so the RandomForest learns non-trivial boundaries
(target ≥ ~0.8 val accuracy on held-out synthetic data — asserted in tests).

### 4.4 Recommendation

`/recommend` (pure, given a prediction + catalog summary):
- Map predicted **archetype → best-matching catalog vehicle** via a category map
  (`performance/luxury → hypercar/sports`, `family → SUV`); tie-break by popularity if provided.
- **highlightComponents:** the archetype's signature parts the session **under-explored**
  (attention fraction below a threshold) — i.e., "show them what they missed."
- `rationale`: a short human string ("Focused on wheels & bodywork → performance buyer; suggest …").

### 4.5 Emotion (modular placeholder)

`services/ml/emotion.py` defines an `EmotionDetector` protocol with one method `detect(payload) -> {emotion, confidence}`.
The default `HeuristicEmotionDetector` returns a label from a simple, honest heuristic
(`engaged` if high focusDensity, `curious` if high coverage, else `neutral`) with a confidence — and a
docstring stating it is a placeholder for a real vision model. `/emotion` writes an `EmotionDetection`
row (via the Node side). Swapping in a real detector = one class, no contract change.

## 5. Data model (Prisma)

Add a **`Prediction`** model (migration `phase3_prediction`):

```prisma
model Prediction {
  id                 String   @id @default(cuid())
  sessionId          String   @unique
  archetype          String
  archetypeConfidence Float
  interestTier       String
  interestConfidence Float
  recommendedVehicleId String?
  scores             Json     // { archetype: {...}, interestTier: {...} }
  modelVersion       String
  createdAt          DateTime @default(now())
  session            Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  recommendedVehicle Vehicle? @relation(fields: [recommendedVehicleId], references: [id])
}
```

Add the matching back-relations on `Session` (`prediction Prediction?`) and `Vehicle`
(`recommendedIn Prediction[]`). `EmotionDetection` already exists and is reused as-is. `sessionId`
is `@unique` → at most one prediction per session (upserted on re-end).

## 6. API contracts

### 6.1 ML service (FastAPI, internal — not public)

- `GET /health` → `{ status: "ok" }`
- `GET /model/info` → `{ modelVersion, archetypeClasses, interestClasses, trainedAt, valAccuracy }`
- `POST /predict` → request: `SessionFeaturesPayload` (components[], engagementScore, interestScore,
  totalGazeMs); response: `{ archetype, archetypeConfidence, interestTier, interestConfidence, scores, modelVersion }`
- `POST /recommend` → request: `{ prediction, catalog: [{slug,name,category,score}], attention: {meshName: frac} }`;
  response: `{ recommendedVehicleSlug, highlightComponents: string[], rationale }`
- `POST /emotion` → request: `{ features }`; response: `{ emotion, confidence }`

All schemas validated with **Pydantic**.

### 6.2 Node API (public, `/api/v1`)

- On **session end** (`endSession`): after computing Node analytics, build the features payload from
  `ComponentView` + session scores, call `PredictionService.predict()`, and **upsert** a `Prediction`
  row + `recommend()` result. Also call `/emotion` and store **one placeholder `EmotionDetection`**
  row (`tMs` = session midpoint) to exercise the seam end-to-end — real per-frame emotion is future.
  All of this is wrapped in try/catch — failures are logged and ignored (graceful, never block end).
- `GET /sessions/:id/prediction` → `{ prediction: PredictionDTO | null }` (owner or ANALYST/ADMIN; reuses `assertCanViewSession`).
- `GET /analytics/recommendations` → `{ recommendations: RecommendationDTO[] }` (ANALYST/ADMIN) — aggregate
  of recent predictions → recommended vehicles + counts.

### 6.3 Shared types (`packages/shared`)

`PredictionDTO`, `RecommendationDTO`, `SessionFeaturesPayload`, archetype/interest enums + zod schemas
for the Node↔Python boundary.

## 7. Node integration seam

```
interface PredictionService {
  predict(features: SessionFeaturesPayload): Promise<PredictionResult | null>;
  recommend(input: RecommendInput): Promise<RecommendResult | null>;
}
```
- `PythonPredictionService` — HTTP client (`fetch`, `ML_SERVICE_URL`, 1.5 s timeout) → returns `null` on error.
- `NoopPredictionService` — always `null` (used when `ML_SERVICE_URL` is unset).
- Selected at startup; injected into `session.service` like the existing engine wiring.

## 8. UI

- **Session detail:** a "Predicted preference" card — archetype + confidence, interest tier badge,
  recommended vehicle, highlight components. Hidden gracefully if no prediction.
- **Admin/Analyst:** a "Recommendations" panel — top recommended vehicles across recent sessions.
- Polling reuses `useAnalyticsPolling`. Loading skeletons + empty states (consistent with Phase-2 UI).

## 9. Testing

- **Python (pytest):** feature extraction (exact vector for a known payload), synthetic generator
  balance/determinism, trained-model val accuracy ≥ 0.8, predict/recommend/emotion response shapes,
  endpoint smoke via FastAPI `TestClient`.
- **Node (vitest):** `PythonPredictionService` (mock fetch — success, timeout, error→null),
  `NoopPredictionService`, the session-end hook stores a `Prediction` (Python mocked), new endpoints
  (auth + shape), graceful degradation when ML down.
- **Web (vitest):** prediction card + recommendations panel render from mocked API; empty states.

## 10. Deployment

- `services/ml/Dockerfile` (python:3.12-slim, install reqs, train at build so artifacts ship in the image),
  `requirements.txt` (fastapi, uvicorn, scikit-learn, numpy, pydantic, joblib), `pyproject`/`ruff` optional.
- `docker-compose.yml`: add service `ml` (build `./services/ml`, port `8000`, healthcheck on `/health`).
- API env: `ML_SERVICE_URL=http://localhost:8000` in `.env.example` (compose: `http://ml:8000`).
- `pnpm dev` stays Node-only; RUNBOOK documents starting the ML service via compose (`docker compose up -d ml`).
- New `pnpm` script `ml:train` (local retrain) documented.

## 11. Performance / robustness

- Node→Python calls are **off the hot path** (only on session end) with a short timeout + graceful
  fallback; the `/predict` call never blocks the session-end response on failure.
- Model inference is sub-ms (RandomForest, 20 features); training happens at image build, not runtime.

## 12. Locked decisions

- **A:** real sklearn RandomForest trained on synthetic, retrainable data.
- Emotion = modular placeholder (swap-in seam).
- Predictions compute on session-end (stored) + on-demand `GET`.
- ML service **optional/graceful** — API unaffected if it is down.

## 13. Milestones (for the plan)

1. Shared types + `Prediction` migration.
2. Python service: features + synthetic + training + models.
3. Python service: FastAPI endpoints + pytest.
4. Node: `PredictionService` seam + client + fallback + tests.
5. Node: session-end hook + endpoints + tests.
6. Web: prediction card + recommendations panel + tests.
7. Docker/compose + RUNBOOK + end-to-end verification.

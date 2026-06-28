# Phase 4 — Feedback, Sentiment & Report Export: Design Spec

**Status:** approved approach — 2026-06-28
**Branch:** `rebuild/phase-4-feedback` (off `main` @ `94ec2c7`)

## 1. Goal

Capture the customer's voice — **feedback + rating + sentiment** — and ship **PDF/Excel export** of analytics reports. Completes the analytics → insight → report loop on top of the existing (front-loaded) `Feedback`/`Rating`/`Report` tables, reusing the graceful ML seam from Phase 3.

## 2. Non-goals (out of scope)

- Trained ML sentiment model (Phase 4 uses a lexicon analyzer — VADER — with a clear swap-in path, mirroring how Phase 3's emotion is a placeholder).
- Email/scheduled report delivery; cloud file storage (reports stream on-demand).
- Editing/deleting feedback; moderation workflows.
- Changing any Phase 0–3 contract.

## 3. Architecture

```
Browser ──> Node API ──> Postgres (Feedback, Rating, Report)
              │  feedback.service → sentiment via ml client (graceful)
              │  report.service   → pdfkit / exceljs → streamed file
              ▼
          ML service (FastAPI) — new POST /sentiment (VADER lexicon)
```

- **Sentiment** reuses the Phase-3 graceful seam: the Node ml client gains a `sentiment(text)` method (Python impl + Noop fallback). If the ML service is down, sentiment is `null` and feedback still saves.
- **Reports** are generated in Node (pure-JS `pdfkit` + `exceljs`) from the existing analytics engine output and **streamed** as a download; an audit `Report` row is recorded.

## 4. Feedback & rating capture

### 4.1 API (`/api/v1`)
- `POST /feedback` (auth required): body `{ vehicleId (slug|id), sessionId?, rating?(1–5 int), favoriteFeature?, comment?, suggestion? }`.
  - Resolves the vehicle; creates a `Feedback` row (comment/favoriteFeature/suggestion + `userId` from `req.user`); if `rating` present, also creates a `Rating` row (`score`).
  - Runs sentiment on `comment` (if non-empty) → sets `Feedback.sentiment` (`positive|neutral|negative`, or `null` if no comment / ML down).
  - Returns `{ feedback: FeedbackDTO }`.
- `GET /vehicles/:slug/feedback` (ANALYST/ADMIN): `{ feedback: FeedbackDTO[], summary: FeedbackSummary }`.
- `GET /analytics/feedback-summary` (ANALYST/ADMIN): `{ summary: FeedbackSummary }` aggregated across vehicles.

### 4.2 Shared types (`packages/shared`)
`SentimentLabel = "positive"|"neutral"|"negative"`; `feedbackInputSchema` (zod: rating int 1–5 optional, strings ≤2000 chars); `FeedbackDTO { id, vehicleId, sessionId, rating, favoriteFeature, comment, suggestion, sentiment, createdAt }`; `FeedbackSummary { total, sentiment: Record<SentimentLabel, number>, avgRating: number|null }`.

### 4.3 UI
- A **FeedbackForm** on the session-detail page (`/app/sessions/:id`): star rating (1–5) + favorite-feature select (from the vehicle's parts) + comment + suggestion → `POST /feedback`. On success show the computed sentiment + a thank-you state.
- Admin/Analyst: a **Feedback & sentiment** panel (counts per sentiment + avg rating + recent comments).

## 5. Sentiment analysis (Python ML service)

- New `services/ml/app/sentiment.py`: wrap `vaderSentiment.SentimentIntensityAnalyzer`. `score(text) -> {sentiment, score}` where `score` is the VADER compound; label = `positive` if `compound >= 0.05`, `negative` if `<= -0.05`, else `neutral`. A docstring marks it lexicon-based and swap-in-able for a trained classifier.
- New `POST /sentiment` endpoint (Pydantic `SentimentIn {text}` → `SentimentOut {sentiment, score}`).
- `vaderSentiment` added to `services/ml/requirements.txt`.
- **Node seam:** extend the existing `PredictionService` interface with `sentiment(text: string): Promise<{ sentiment: SentimentLabel; score: number } | null>`; implement in `PythonPredictionService` (POST `/sentiment`, graceful → null) and `NoopPredictionService` (→ null). `feedback.service` calls it.

## 6. Report export (Node)

- `services/ml` is NOT involved. New `apps/api/src/reports/`:
  - `reportData.ts` — pure: build a structured report object (title, KPIs, component rows, timeline summary) from the analytics engine's `computeSession` / vehicle aggregates. Unit-tested.
  - `pdf.ts` — `renderSessionPdf(data): Buffer/stream` via `pdfkit`.
  - `excel.ts` — `renderSessionExcel(data): Buffer` via `exceljs` (a KPIs sheet + a components sheet).
- **Endpoints:** extend the existing report route — `GET /sessions/:id/report?format=json|pdf|xlsx` (default `json`, unchanged); add `GET /vehicles/:slug/report?format=pdf|xlsx|json`. `pdf`/`xlsx` stream with `Content-Type` + `Content-Disposition: attachment; filename=...`. Auth: session report = owner or ANALYST/ADMIN (`assertCanViewSession`); vehicle report = ANALYST/ADMIN.
- On each pdf/xlsx export, insert a `Report` audit row: `{ generatedById: req.user.id, sessionId?, type: PDF|EXCEL, scope: "session:<id>"|"vehicle:<slug>", fileUrl: <the request path> }`. (`fileUrl` records the download path since the file is streamed, not stored.)
- Update the stale `note` in the JSON report ("PDF/Excel export arrives in Phase 5" → present).
- `pdfkit` + `exceljs` added to `apps/api` deps.

### 6.1 UI
- **Export buttons** (PDF / Excel) on the session-detail page and on the admin/analyst vehicle views → trigger the download (anchor to the `?format=` URL, or fetch+blob).

## 7. Dashboards
- Admin + Analyst: a **Feedback & Sentiment** GlassCard (sentiment breakdown bars + avg rating + recent comments) fed by `/analytics/feedback-summary`. Reuse `useAnalyticsPolling` + the `ComponentBars` visual.

## 8. Testing
- **Python (pytest):** `sentiment.score` labels clear positive/negative/neutral inputs correctly; `/sentiment` endpoint shape via `TestClient`.
- **Node (vitest):** `feedback.service` creates Feedback (+ Rating) and sets sentiment from a stubbed ml client (and saves with `null` sentiment when the client returns null — graceful); feedback endpoints (auth + shape); `reportData` builder (pure); `renderSessionExcel`/`renderSessionPdf` return non-empty Buffers with the right magic bytes (`%PDF`, `PK` zip header); report endpoints return the right `Content-Type`/`Content-Disposition` and 403 for non-owners.
- **Web (vitest):** FeedbackForm submits + shows sentiment; sentiment panel renders from a mock summary; export buttons render with correct hrefs.

## 9. Deployment / dependencies
- `apps/api`: add `pdfkit`, `exceljs` (+ `@types/pdfkit`).
- `services/ml`: add `vaderSentiment` to `requirements.txt`; rebuild the `ml` image (Dockerfile unchanged otherwise).
- No new services; no compose changes beyond the ml image rebuild.

## 10. Robustness
- Sentiment is **off the critical path**: feedback POST saves first / computes sentiment within the same request but tolerates a null result (ML down → `sentiment: null`, 201 still returned).
- Report generation is synchronous per request; bounded by a single session/vehicle's data (small). Stream to avoid buffering large payloads where practical.

## 11. Locked decisions
- Sentiment = **VADER lexicon in the Python ML service** via the graceful seam (swap-in path to a trained model).
- Reports = **Node `pdfkit` + `exceljs`** (no Chromium); session + vehicle scope; PDF + Excel; streamed; `Report` audit row.
- Feedback form on the session-detail page; sentiment graceful; customers can export their own session report; ANALYST/ADMIN for vehicle reports + feedback lists.

## 12. Milestones (for the plan)
1. Shared types + zod (`SentimentLabel`, feedback input/DTO/summary, report format).
2. Python sentiment (`sentiment.py` + `/sentiment` + tests + `vaderSentiment` dep).
3. Node ml-seam `sentiment()` (interface + Python impl + Noop + tests).
4. Feedback service + endpoints (create feedback/rating + sentiment; list + summary) + tests.
5. Report builder + pdf/excel renderers + report endpoints (stream + audit row) + tests; fix stale note.
6. Web: FeedbackForm + sentiment panel + export buttons; wire into session-detail + dashboards.
7. Deps/rebuild + RUNBOOK + end-to-end verification.

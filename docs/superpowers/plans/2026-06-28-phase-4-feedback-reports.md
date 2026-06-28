# Phase 4 — Feedback, Sentiment & Report Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Capture customer feedback + rating + VADER sentiment, and export session/vehicle analytics as PDF/Excel — on the existing `Feedback`/`Rating`/`Report` tables, reusing the Phase-3 graceful ML seam.

**Architecture:** Node feedback/report services; sentiment via a new Python `/sentiment` (VADER) reached through the existing graceful `PredictionService` seam; reports rendered in Node with `pdfkit`+`exceljs` and streamed. See `docs/superpowers/specs/2026-06-28-phase-4-feedback-reports-design.md`.

**Tech Stack:** Node 20 / Express / Prisma / vitest · Python 3.12 / FastAPI / vaderSentiment / pytest · React 18 / Vitest · pdfkit, exceljs.

## Global Constraints

- `SentimentLabel = "positive" | "neutral" | "negative"`; VADER thresholds: compound `>= 0.05` positive, `<= -0.05` negative, else neutral.
- Sentiment is **graceful**: ML down / no comment → `sentiment = null`, feedback still saves (201).
- Reports **stream** (`Content-Disposition: attachment`); a `Report` audit row is written per pdf/xlsx export (`fileUrl` = the download path). `ReportType` enum is `PDF | EXCEL`.
- Auth: `POST /feedback` = any authed user; session report = owner or ANALYST/ADMIN (`assertCanViewSession`, exported from `analytics.controller.ts`); vehicle report + feedback lists/summary = ANALYST/ADMIN (`requireRole`).
- TypeScript strict, `.js` import specifiers. Python ruff-clean. No Phase 0–3 contract changes. Commit per task; trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Postgres host **5544**, test DB `smartev_test`. ML tests use the Noop fallback (no container needed).

---

## File Structure
**Create:** `packages/shared/src/{types/feedback.ts, contracts/feedback.ts}`; `services/ml/app/sentiment.py`, `services/ml/tests/test_sentiment.py`; `apps/api/src/repositories/feedback.repo.ts`; `apps/api/src/services/feedback.service.ts`; `apps/api/src/controllers/feedback.controller.ts`; `apps/api/src/reports/{reportData.ts, pdf.ts, excel.ts}`; `apps/web/src/analytics/{FeedbackForm.tsx, SentimentPanel.tsx}`; tests alongside.
**Modify:** `packages/shared/src/index.ts`; `services/ml/{requirements.txt, app/schemas.py, app/main.py}`; `apps/api/src/ml/{PredictionService.ts, pythonPredictionService.ts, noopPredictionService.ts}`; `apps/api/src/controllers/analytics.controller.ts` (export `assertCanViewSession`, report formats, vehicle report); `apps/api/src/routes/{index.ts, analytics.routes.ts}`; `apps/api/src/openapi.ts`; `apps/api/package.json`; `apps/web/src/pages/dashboards/{SessionDetail,AdminDashboard,AnalystDashboard}.tsx`; `docs/RUNBOOK.md`.

---

## Milestone 1 — Shared types + contracts

### Task 1.1: Feedback/sentiment/report shared types
**Files:** Create `packages/shared/src/types/feedback.ts`, `packages/shared/src/contracts/feedback.ts`; modify `index.ts`; test `contracts/feedback.test.ts`.

- [ ] **types/feedback.ts**
```ts
export type SentimentLabel = "positive" | "neutral" | "negative";
export type ReportFormat = "json" | "pdf" | "xlsx";
export interface FeedbackDTO {
  id: string; vehicleId: string; sessionId: string | null;
  rating: number | null; favoriteFeature: string | null;
  comment: string | null; suggestion: string | null;
  sentiment: SentimentLabel | null; createdAt: string;
}
export interface FeedbackSummary {
  total: number;
  sentiment: Record<SentimentLabel, number>;
  avgRating: number | null;
}
```
- [ ] **contracts/feedback.ts**
```ts
import { z } from "zod";
export const feedbackInputSchema = z.object({
  vehicleId: z.string().min(1),
  sessionId: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  favoriteFeature: z.string().max(120).optional(),
  comment: z.string().max(2000).optional(),
  suggestion: z.string().max(2000).optional(),
});
export type FeedbackInput = z.infer<typeof feedbackInputSchema>;
```
- [ ] Export both from `index.ts` (`export * from "./types/feedback.js"; export * from "./contracts/feedback.js";`).
- [ ] **Test** `contracts/feedback.test.ts`: valid payload parses; `rating: 6` rejected; `comment` of 2001 chars rejected.
- [ ] Run `pnpm --filter @sev/shared test` → PASS. **Commit** `feat(shared): feedback + sentiment + report types`.

---

## Milestone 2 — Python sentiment

### Task 2.1: VADER sentiment scorer + endpoint (TDD)
**Files:** modify `services/ml/requirements.txt`, `services/ml/app/schemas.py`, `services/ml/app/main.py`; create `services/ml/app/sentiment.py`, `services/ml/tests/test_sentiment.py`.

- [ ] **Add dep:** append `vaderSentiment==3.3.*` to `services/ml/requirements.txt`; `cd services/ml && . .venv/bin/activate && pip install -r requirements.txt`.
- [ ] **Test first** `tests/test_sentiment.py`:
```python
from app.sentiment import score
def test_positive(): assert score("I absolutely love this car, it's amazing!")["sentiment"] == "positive"
def test_negative(): assert score("This is terrible, I hate the cramped interior.")["sentiment"] == "negative"
def test_neutral(): assert score("It is a car with four wheels.")["sentiment"] == "neutral"
def test_score_in_range():
    s = score("great"); assert -1.0 <= s["score"] <= 1.0 and s["sentiment"] in {"positive","neutral","negative"}
def test_empty(): assert score("")["sentiment"] == "neutral"
```
- [ ] Run → FAIL (no module). 
- [ ] **Implement `app/sentiment.py`**
```python
from functools import lru_cache
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

@lru_cache
def _analyzer() -> SentimentIntensityAnalyzer:
    return SentimentIntensityAnalyzer()

def score(text: str) -> dict:
    """Lexicon (VADER) sentiment — a PLACEHOLDER for a trained classifier. Swap this module
    for a model without changing callers (the /sentiment contract stays {sentiment, score})."""
    compound = _analyzer().polarity_scores(text or "")["compound"]
    label = "positive" if compound >= 0.05 else "negative" if compound <= -0.05 else "neutral"
    return {"sentiment": label, "score": round(compound, 4)}
```
- [ ] **schemas.py** add: `class SentimentIn(BaseModel): text: str = ""` and `class SentimentOut(BaseModel): sentiment: str; score: float`.
- [ ] **main.py** add: `from app.sentiment import score as _sentiment` and `@app.post("/sentiment", response_model=SentimentOut)\ndef sentiment_endpoint(body: SentimentIn): return _sentiment(body.text)`.
- [ ] Add `tests/test_api.py::test_sentiment_endpoint` (TestClient: `POST /sentiment {"text":"love it"}` → 200, `sentiment=="positive"`).
- [ ] Run `pytest -q` → PASS; `ruff check services/ml` clean. **Commit** `feat(ml): VADER sentiment endpoint`.

---

## Milestone 3 — Node ml-seam `sentiment()`

### Task 3.1: Extend PredictionService with sentiment (TDD)
**Files:** modify `apps/api/src/ml/{PredictionService.ts, pythonPredictionService.ts, noopPredictionService.ts}`; test `apps/api/test/sentimentClient.test.ts`.
**Interfaces — Produces:** `PredictionService.sentiment(text: string): Promise<{ sentiment: SentimentLabel; score: number } | null>`.

- [ ] **PredictionService.ts:** add to the interface `sentiment(text: string): Promise<{ sentiment: SentimentLabel; score: number } | null>;` (import `SentimentLabel` from `@sev/shared`).
- [ ] **pythonPredictionService.ts:** implement `sentiment` — POST `${baseUrl}/sentiment` with `{ text }`, `AbortSignal.timeout(1500)`, `!res.ok`→null, try/catch→null (same pattern as `predict`).
- [ ] **noopPredictionService.ts:** `async sentiment() { return null; }`.
- [ ] **Test** (mock fetch): 200 `{sentiment:"positive",score:0.8}` → returned; non-ok → null; throw → null.
- [ ] Run `pnpm --filter @sev/api exec vitest run test/sentimentClient.test.ts` + `typecheck` → PASS. **Commit** `feat(api): sentiment() on the ML seam`.

---

## Milestone 4 — Feedback service + endpoints

### Task 4.1: Feedback repo + service (TDD)
**Files:** create `apps/api/src/repositories/feedback.repo.ts`, `apps/api/src/services/feedback.service.ts`; test `apps/api/test/feedback.service.test.ts`.
**Consumes:** `getPredictionService()`, `vehicleRepo` (resolve slug|id).

- [ ] **feedback.repo.ts**
```ts
import { prisma } from "../db.js";
import type { Prisma } from "@prisma/client";
export const feedbackRepo = {
  create: (data: Prisma.FeedbackUncheckedCreateInput) => prisma.feedback.create({ data }),
  createRating: (data: Prisma.RatingUncheckedCreateInput) => prisma.rating.create({ data }),
  forVehicle: (vehicleId: string) => prisma.feedback.findMany({ where: { vehicleId }, orderBy: { createdAt: "desc" }, take: 100 }),
  allWithRatings: () => prisma.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
  ratingsForVehicle: (vehicleId: string) => prisma.rating.findMany({ where: { vehicleId } }),
};
```
- [ ] **feedback.service.ts** — `createFeedback(input: FeedbackInput, userId: string, svc = getPredictionService())`:
```ts
export async function createFeedback(input: FeedbackInput, userId: string, svc: PredictionService = getPredictionService()) {
  const vehicle = await vehicleRepo.bySlug(input.vehicleId) ?? await vehicleRepo.byId?.(input.vehicleId);
  if (!vehicle) throw new HttpError(404, "Vehicle not found");
  let sentiment: string | null = null;
  if (input.comment && input.comment.trim()) {
    const s = await svc.sentiment(input.comment);
    sentiment = s?.sentiment ?? null;
  }
  const feedback = await feedbackRepo.create({
    userId, vehicleId: vehicle.id, sessionId: input.sessionId ?? null,
    comment: input.comment ?? null, favoriteFeature: input.favoriteFeature ?? null,
    suggestion: input.suggestion ?? null, sentiment,
  });
  if (input.rating != null) await feedbackRepo.createRating({ userId, vehicleId: vehicle.id, score: input.rating });
  return toFeedbackDTO(feedback, input.rating ?? null);
}
```
(Add `vehicleRepo.byId` if missing, or resolve via a single `bySlugOrId`. `toFeedbackDTO` maps the row + rating + `createdAt.toISOString()`.)
- [ ] **Test:** stub `svc.sentiment` → `{sentiment:"positive",score:0.7}`; `createFeedback({vehicleId:"byd-atto-3", rating:5, comment:"love it"}, userId)` → DTO `sentiment==="positive"`, a Rating row exists; with `svc.sentiment`→`null` (graceful) the feedback still saves with `sentiment===null`; no comment → `sentiment` stays null and `svc.sentiment` not called.
- [ ] Run the test (needs seed/test DB) + typecheck → PASS. **Commit** `feat(api): feedback service with graceful sentiment`.

### Task 4.2: Feedback endpoints + summary (TDD)
**Files:** create `apps/api/src/controllers/feedback.controller.ts`; modify `routes/index.ts` (or a new `feedback.routes.ts`), `openapi.ts`; test `apps/api/test/feedback-api.test.ts`.

- [ ] **Controller:** `postFeedback` (parse `feedbackInputSchema`, `createFeedback(input, req.user!.id)`, 201 `{feedback}`); `getVehicleFeedback` (ANALYST/ADMIN: `{feedback: FeedbackDTO[], summary}`); `getFeedbackSummary` (ANALYST/ADMIN: `{summary}`). `summary` = `{ total, sentiment: counts, avgRating }` computed from feedback rows + ratings (pure helper `summarize(feedbacks, ratings)`, unit-test it).
- [ ] **Routes:** `POST /api/v1/feedback` (`requireAuth`); `GET /api/v1/vehicles/:slug/feedback` (`requireRole("ANALYST","ADMIN")`); `GET /api/v1/analytics/feedback-summary` (`requireRole("ANALYST","ADMIN")`). Add to openapi.
- [ ] **Tests:** customer posts feedback → 201 + sentiment present (ML up in dev, but in tests Noop → sentiment null is fine; assert 201 + feedback echoed); unauth POST → 401; `feedback-summary` as admin → 200 `{summary}`, as customer → 403.
- [ ] Run + typecheck → PASS. **Commit** `feat(api): feedback endpoints + sentiment summary`.

---

## Milestone 5 — Report export

### Task 5.1: Report data builder (TDD)
**Files:** create `apps/api/src/reports/reportData.ts`; test `apps/api/test/reportData.test.ts`.
**Produces:** `SessionReportData { title; kpis: Record<string,string|number>; components: {meshName;attentionPct;totalViewMs}[] }`; `buildSessionReportData(analytics: SessionAnalytics, vehicleName: string): SessionReportData`.
- [ ] **Test:** given a `SessionAnalytics` + name → `title` includes the name; `kpis` has Engagement/Interest/"Most viewed"; `components` length == analytics.components length.
- [ ] **Implement** (pure mapping). Run → PASS. **Commit** `feat(api): report data builder`.

### Task 5.2: PDF + Excel renderers (TDD)
**Files:** add `pdfkit`, `exceljs`, `@types/pdfkit` to `apps/api/package.json` (`pnpm --filter @sev/api add pdfkit exceljs` + `-D @types/pdfkit`); create `apps/api/src/reports/pdf.ts`, `apps/api/src/reports/excel.ts`; test `apps/api/test/reportRender.test.ts`.
- [ ] **pdf.ts**
```ts
import PDFDocument from "pdfkit";
import type { SessionReportData } from "./reportData.js";
export function renderPdf(data: SessionReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(20).text(data.title);
    doc.moveDown().fontSize(12);
    for (const [k, v] of Object.entries(data.kpis)) doc.text(`${k}: ${v}`);
    doc.moveDown().fontSize(14).text("Components by attention");
    doc.fontSize(10);
    for (const r of data.components) doc.text(`${r.meshName} — ${r.attentionPct}% (${r.totalViewMs} ms)`);
    doc.end();
  });
}
```
- [ ] **excel.ts**
```ts
import ExcelJS from "exceljs";
import type { SessionReportData } from "./reportData.js";
export async function renderXlsx(data: SessionReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const kpi = wb.addWorksheet("KPIs");
  kpi.addRow(["Metric", "Value"]);
  for (const [k, v] of Object.entries(data.kpis)) kpi.addRow([k, v]);
  const comp = wb.addWorksheet("Components");
  comp.addRow(["Component", "Attention %", "Total View ms"]);
  for (const r of data.components) comp.addRow([r.meshName, r.attentionPct, r.totalViewMs]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
```
- [ ] **Test:** `renderPdf(sample)` → Buffer starting with `%PDF` (`buf.subarray(0,4).toString()==="%PDF"`); `renderXlsx(sample)` → Buffer starting with `PK` (zip: `buf[0]===0x50 && buf[1]===0x4b`); both non-empty.
- [ ] Run + typecheck → PASS. **Commit** `feat(api): pdf + excel report renderers`.

### Task 5.3: Report endpoints + audit row (TDD)
**Files:** modify `apps/api/src/controllers/analytics.controller.ts` (format-aware session report + new vehicle report + `Report` audit), `routes/analytics.routes.ts`, `openapi.ts`; create `apps/api/src/repositories/report.repo.ts` (`create`); test `apps/api/test/report-export.test.ts`.
- [ ] **getSessionReport:** read `format = (req.query.format ?? "json")`. `assertCanViewSession`. `json` → existing JSON (remove the stale "Phase 5" note). `pdf` → `renderPdf(buildSessionReportData(...))`, set `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="session-<id>.pdf"`, write `Report` audit row (`type: "PDF"`, `scope: "session:<id>"`, `fileUrl: req.originalUrl`), `res.send(buf)`. `xlsx` → analogous (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).
- [ ] **getVehicleReport** (`GET /vehicles/:slug/report?format=`, ANALYST/ADMIN): vehicle aggregate → pdf/xlsx (json allowed too); audit `scope: "vehicle:<slug>"`.
- [ ] **Tests:** admin `GET /sessions/:id/report?format=pdf` → 200, `content-type` pdf, body starts `%PDF`; `?format=xlsx` → spreadsheet content-type; non-owner customer → 403; a `Report` row was created; `format=json` (default) still returns JSON.
- [ ] Run + typecheck → PASS. **Commit** `feat(api): pdf/excel report endpoints + audit`.

---

## Milestone 6 — Web UI

### Task 6.1: FeedbackForm (TDD)
**Files:** create `apps/web/src/analytics/FeedbackForm.tsx`, `FeedbackForm.test.tsx`.
- [ ] Props `{ vehicleId: string; sessionId?: string; parts?: {meshName:string;name:string}[] }`. Star rating (1–5), favorite-feature `<select>` (from parts), comment + suggestion textareas, submit → `api.post("/feedback", {...})`. On success show "Thanks — sentiment: {sentiment}" (or just "Thanks"). 
- [ ] **Test:** renders inputs; filling + submit calls `api.post` with the right body (mock `api`); shows the thank-you/sentiment from the mocked response.
- [ ] Run `pnpm --filter @sev/web test` (this file) + typecheck → PASS. **Commit** `feat(web): feedback form`.

### Task 6.2: SentimentPanel + export buttons + wiring (TDD)
**Files:** create `apps/web/src/analytics/SentimentPanel.tsx`, `SentimentPanel.test.tsx`; modify `SessionDetail.tsx` (FeedbackForm + PDF/Excel export links), `AdminDashboard.tsx` + `AnalystDashboard.tsx` (SentimentPanel from `/analytics/feedback-summary`).
- [ ] **SentimentPanel** props `{ summary: FeedbackSummary }` → bars for positive/neutral/negative + avg rating + total; empty state when `total===0`. Test: renders counts + avg; empty state.
- [ ] **Export buttons:** on SessionDetail, two anchors/buttons to `/api/v1/sessions/:id/report?format=pdf` and `?format=xlsx` (download). (Use the apiClient base; a plain `<a href>` to the API URL with credentials, or fetch→blob→download.)
- [ ] Wire FeedbackForm into SessionDetail; SentimentPanel into Admin/Analyst (add a `/analytics/feedback-summary` poll). **Update `AdminDashboard.test.tsx`** mock to return `{summary:{total:0,sentiment:{positive:0,neutral:0,negative:0},avgRating:null}}` for the new endpoint. Components handle `undefined` → empty.
- [ ] Run FULL `pnpm --filter @sev/web test` + typecheck → all PASS. **Commit** `feat(web): sentiment panel + report export + wiring`.

---

## Milestone 7 — Deps/rebuild, docs, e2e

### Task 7.1: RUNBOOK + ml rebuild + deps note
**Files:** modify `docs/RUNBOOK.md` (a "Feedback & Reports (Phase 4)" section: feedback form, sentiment needs the ml container + `ML_SERVICE_URL`, report export URLs); confirm `apps/api` deps (`pdfkit`/`exceljs`) committed; note `docker compose build ml` picks up `vaderSentiment`.
- [ ] `docker compose build ml && docker compose up -d ml` → `curl -X POST localhost:8000/sentiment -d '{"text":"love it"}' -H 'content-type: application/json'` → positive. **Commit** `docs(phase-4): RUNBOOK + sentiment in ml image`.

### Task 7.2: End-to-end verification (controller-run)
- [ ] `pnpm -r typecheck` clean; `pnpm -r test` all green; `cd services/ml && pytest -q` green; `ruff check services/ml` clean.
- [ ] **Live:** with `ML_SERVICE_URL` set + ml container up — `POST /feedback` (comment "I love the infotainment!") → stored with `sentiment:"positive"`; `GET /sessions/:id/report?format=pdf` downloads a valid PDF; `/analytics/feedback-summary` shows the sentiment counts.
- [ ] Final fixups commit if needed.

---

## Self-Review
- **Spec coverage:** feedback capture (M1,M4,M6), sentiment (M2,M3,M4), reports PDF/Excel (M5,M6), dashboards (M6), deploy (M7) — all mapped. ✓
- **Type consistency:** `SentimentLabel`/`FeedbackDTO`/`FeedbackSummary` (shared) used identically across service/controller/web; `SessionReportData` shared between builder + both renderers + endpoints. ✓
- **Graceful + auth constraints** restated in Global Constraints and exercised by tests (Noop→null sentiment; 403 paths). ✓
- **No placeholders:** core code (sentiment, seam, feedback service, renderers, form) is complete; mechanical tasks have signatures + test specs + commands. ✓

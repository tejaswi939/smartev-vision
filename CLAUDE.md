# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SmartEV Vision is a Flask web app that pairs a browser-based 3D EV showroom (Three.js) with
webcam eye-tracking (MediaPipe Face Mesh, client-side) to record where users look on a vehicle,
then computes attention analytics, gaze heatmaps, and ML preference predictions. Final-year
student project; SQLite-backed, no real auth.

## Commands

All scripts use **CWD-relative paths** — always run them from the repo root. The venv targets
Python 3.10; the app needs 3.9+.

```bash
pip install -r requirements.txt        # install deps
python setup_db.py                     # create data/smartev.db with the 5 tables (raw sqlite3)
python generate_sample_data.py         # seed 20 users / 100 sessions + write data/sample_data.json
python ml/train_model.py               # train RandomForest models -> ml/*.pkl (needs sample_data.json or db)
python run.py                          # serve on 0.0.0.0:5000 (FLASK_DEBUG=1 for debug)
```

Tests use the stdlib **`unittest`** (pytest is not a dependency). Run from repo root:

```bash
python -m unittest discover -s tests                       # whole suite
python -m unittest tests.test_ml                           # one module
python -m unittest tests.test_ml.TestFeatureExtraction.test_feature_extraction   # one test
```

## Architecture

**App factory + blueprints.** `run.py` calls `create_app()` (`app/__init__.py`), which loads
`config.Config`, inits `Flask-SQLAlchemy` (`db`) and CORS (open to all origins), runs
`db.create_all()`, and registers four blueprints via `app/routes/__init__.py`. Note the nested
URL prefixes:

| Blueprint | Prefix | File | Purpose |
|-----------|--------|------|---------|
| `main_bp` | `/` | `routes/main.py` | Jinja pages: `/`, `/showroom`, `/calibration`, `/dashboard`, `/admin`, `/sessions/<id>/report` |
| `api_bp` | `/api` | `routes/api.py` | sessions, gaze ingest, analytics, heatmap, predict, users |
| `auth_bp` | `/api/user` | `routes/auth.py` | passwordless register + lookup (lab staff register participants) |
| `dashboard_bp` | `/api/dashboard` | `routes/dashboard.py` | global aggregate `/stats` |

**The session pipeline (the core data flow — spans routes + all four services):**
1. `POST /api/session/start` → create `Session`.
2. `POST /api/gaze` → for each point, `eye_tracking.classify_gaze_point()` maps `(x,y)` to an AOI
   and `calculate_fixation_duration()` estimates dwell; rows land in `gaze_data`.
3. `POST /api/session/end` → sets `duration`, calls `_aggregate_vehicle_views()` to roll `gaze_data`
   up into `vehicle_views`, then stores `engagement_score` from `analytics.compute_session_analytics()`.
4. `GET /api/analytics/<sid>`, `GET /api/heatmap/<sid>`, `GET|POST /api/predict/<sid>` read that data.

**Services** (`app/services/`, pure functions, no blueprint coupling):
- `eye_tracking.py` — `AOI_REGIONS` defines 6 normalized 0–1 AOIs (Body, Headlights, Hood, Interior,
  Wheels, Windshield) + "Background"; first-match-wins classification.
- `analytics.py` — engagement score = 4 equally-weighted (25% each) components: gaze density, AOI
  coverage, fixation quality, focus balance; clamped 0–100. Also builds the per-AOI breakdown and timeline.
- `heatmap.py` — 2D histogram → Gaussian blur (scipy) → matplotlib "hot" PNG (base64) + top-20 hotspots. Uses the `Agg` backend (headless).
- `ml_engine.py` — feature extraction + prediction for the live API.

**Data model** (`app/models.py`, SQLAlchemy): `User` → `Session` → (`GazeData`, `VehicleView`,
`Prediction`). Every model has `to_dict()` for JSON responses.

**Frontend** is server-rendered Jinja2 + vanilla JS (no build step, no bundler). All third-party
libraries load from **CDNs** (so the browser needs internet): Three.js **r128** + OrbitControls,
MediaPipe `camera_utils`/`face_mesh`, Bootstrap 5.3, Plotly 2.27, Font Awesome 6. Eye tracking runs
entirely client-side in `static/js/eye_tracker.js` (MediaPipe Face Mesh, 478 landmarks w/ iris
refinement) and batches gaze points to `/api/gaze`. All HTTP goes through the `apiCall()` wrapper in
`static/js/utils.js`. "Login" is `localStorage` only (`loggedInUserId`) — there are no passwords or server sessions.

## Gotchas & conventions (verify against code, not the README)

- **Two parallel ML implementations that have diverged — do not assume they agree:**
  - `app/services/ml_engine.py` (live `/api/predict`) uses **TitleCase, alphabetically-sorted**
    AOIs (`CANONICAL_AOIS`) and expects `ml/model.pkl` to be a **bare estimator** (`model.predict(...)`).
  - `ml/predictor.py` + `ml/train_model.py` (standalone/training) use **lowercase, unsorted**
    `COMPONENTS = [hood, body, wheels, windshield, headlights, interior]` and treat `ml/model.pkl`
    as a **dict** `{'model_classifier', 'category_classifier'}`.
  - `train_model.py` writes the dict form, so the live `ml_engine` will raise (then return an
    `"error"`/`"unknown"` result) rather than use it — its heuristic fallback only triggers when the
    file is **missing**. The 20-feature vectors also differ in column order between the two. Reconcile
    casing + feature order + pickle format if you touch either side.
- **Two schema definitions kept in sync by hand:** `setup_db.py` (raw `sqlite3`) and `app/models.py`
  (SQLAlchemy) both define the same 5 tables in the same `data/smartev.db`. Change one → change the other.
- **AOI bounding boxes are duplicated** in `eye_tracking.AOI_REGIONS` (TitleCase) and
  `generate_sample_data.AREA_BOUNDS` (lowercase) with *different* coordinates; they are not shared.
- **Live `area_label` casing:** the runtime classifier stores **TitleCase** labels, but seeded sample
  data and `ml/predictor.py` use **lowercase** — a frequent source of mismatch.
- **Tests don't exercise Flask:** despite the name, `tests/test_api.py` runs raw SQL against a temp
  sqlite db, and `tests/test_ml.py` tests `ml/predictor.py` — not `routes/` or `app/services/`. Those
  live paths are effectively uncovered.
- **README is partly stale and contains unresolved git merge-conflict markers**
  (`<<<<<<<`/`=======`/`>>>>>>>`). It references files/endpoints that don't exist (`app.py`,
  `/api/login`, `models/database.py`) and wrong libs/versions (Chart.js, Three r150+, 468 landmarks).
  Trust the code.
- **Config:** `SECRET_KEY`, `DATABASE_URL`, and `FLASK_DEBUG` are env-overridable in `config.py`; the
  default `SECRET_KEY` is an insecure placeholder and CORS is wide open — fine for local dev, not prod.

<h1 align="center">⚡ SmartEV Vision</h1>

<p align="center">
  <strong>VR &amp; Eye-Tracking Based Customer Reaction Analysis for EV Product Design</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.9+-blue?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/Flask-3.1-green?style=for-the-badge&logo=flask&logoColor=white" alt="Flask"/>
  <img src="https://img.shields.io/badge/Three.js-r128-black?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js"/>
  <img src="https://img.shields.io/badge/MediaPipe-Face%20Mesh-orange?style=for-the-badge&logo=google&logoColor=white" alt="MediaPipe"/>
  <img src="https://img.shields.io/badge/scikit--learn-RandomForest-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white" alt="scikit-learn"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License"/>
</p>

---

## 📖 About the Project

**SmartEV Vision** is a web-based platform that combines an interactive 3D EV showroom with
real-time eye-tracking analytics to understand customer preferences and design reactions. Users
explore electric vehicle models in a browser-based 3D environment while their gaze patterns are
captured and analysed using computer vision — providing actionable insights for EV product
designers and marketers.

The platform uses **Three.js** to render the virtual showroom, **MediaPipe Face Mesh** for
non-intrusive webcam-based eye tracking (entirely in the browser), and a **Flask** backend to
process gaze data, generate attention heatmaps, and run machine-learning predictions on customer
interest. By eliminating the need for expensive VR headsets or dedicated eye-tracking hardware,
SmartEV Vision makes customer research more accessible for the automotive industry.

This project was developed as a **final-year B.E. mini project** by a team of four students,
demonstrating the practical integration of web-based 3D rendering, real-time computer vision, data
analytics, and machine learning into a unified customer-research tool.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🚗 **Interactive 3D Showroom** | Explore EV models with 360° rotation, zoom, and pan using Three.js |
| 👁️ **Real-Time Eye Tracking** | Webcam-based iris tracking using MediaPipe Face Mesh (478 landmarks, iris refinement) |
| 🎯 **Gaze Calibration System** | 9-point calibration for accurate gaze-to-screen coordinate mapping |
| 🔥 **Attention Heatmaps** | Heatmap visualisation showing where users look most on the vehicle |
| 📊 **Analytics Dashboard** | Session analytics with gaze metrics, dwell times, and engagement scoring |
| 🤖 **ML Predictions** | Random Forest classifiers predicting preferred model and preference category |
| 🎨 **Color Customization** | Change vehicle colours interactively in the showroom |
| 👤 **Participant Management** | Registration and session-history tracking |
| 📱 **Responsive Design** | Works across desktop browsers with webcam support |

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) | Server-rendered Jinja2 pages + vanilla JS (no build step) |
| **3D Rendering** | Three.js r128 + OrbitControls | WebGL-based 3D virtual showroom |
| **Eye Tracking** | MediaPipe Face Mesh | Client-side iris detection (478 facial landmarks) |
| **Heatmap** | matplotlib (server) + Canvas overlay | Gaussian-smoothed gaze heatmap returned as a base64 PNG |
| **Backend** | Flask 3.1 (Python 3.9+) | REST API + page rendering via the application-factory pattern |
| **ORM / Database** | Flask-SQLAlchemy + SQLite 3 | Relational storage (`data/smartev.db`) |
| **ML Engine** | scikit-learn (Random Forest) | Preferred-model & preference-category prediction |
| **Data Processing** | NumPy, SciPy | Gaze aggregation and Gaussian smoothing |
| **Charts** | Plotly.js | Dashboard visualisations |
| **UI** | Bootstrap 5.3, Font Awesome 6 | Layout and icons (loaded via CDN) |
| **Identity** | Passwordless registration | No passwords; the active participant is tracked client-side in `localStorage` |

> **Note:** Third-party browser libraries (Three.js, MediaPipe, Bootstrap, Plotly, Font Awesome)
> load from public CDNs, so the front-end requires an internet connection.

---

## 📁 Project Structure

```
smartev-vision/
├── run.py                      # Entry point — builds the app via the factory and serves on :5000
├── config.py                   # Config (SECRET_KEY, DATABASE_URL, FLASK_DEBUG, ML_MODEL_PATH)
├── setup_db.py                 # Create data/smartev.db and its 5 tables (raw sqlite3)
├── generate_sample_data.py     # Seed mock users/sessions/gaze + write data/sample_data.json
├── requirements.txt
│
├── app/                        # Application package
│   ├── __init__.py             #   create_app(): loads config, inits db + CORS, registers blueprints, create_all()
│   ├── models.py               #   SQLAlchemy models: User, Session, GazeData, VehicleView, Prediction
│   ├── routes/                 #   Blueprints (controllers)
│   │   ├── main.py             #     pages: / /showroom /calibration /dashboard /admin /sessions/<id>/report
│   │   ├── auth.py             #     /api/user — passwordless register + lookup
│   │   ├── api.py              #     /api — sessions, gaze, analytics, heatmap, predict, users
│   │   └── dashboard.py        #     /api/dashboard — global aggregate stats
│   ├── services/               #   Business logic (pure functions, framework-light)
│   │   ├── eye_tracking.py     #     AOI classification + fixation duration
│   │   ├── analytics.py        #     engagement score, attention breakdown, timeline
│   │   ├── heatmap.py          #     matplotlib heatmap (base64 PNG) + hotspot detection
│   │   └── ml_engine.py        #     feature extraction + prediction for the live API
│   ├── templates/              #   Jinja2: base, index, showroom, calibration, dashboard, admin, session_report
│   └── static/                 #   css/ and js/ (showroom, eye_tracker, heatmap, dashboard, ev_models, utils)
│
├── ml/                         # Standalone ML pipeline
│   ├── train_model.py          #   train RandomForest classifiers and serialise to *.pkl
│   ├── predictor.py            #   PreferencePredictor — load models and predict from session data
│   └── *.pkl                   #   serialised models (model, model_preference, category_preference)
│
├── data/                       # SQLite database + generated sample_data.json
├── tests/                      # unittest suite (test_api, test_analytics, test_heatmap, test_ml)
└── docs/                       # user_manual, deployment_guide, future_enhancements, diagrams/
```

---

## 🚀 Installation

### Prerequisites

- **Python** 3.9 or higher
- **pip**
- A modern web browser (Chrome 90+, Firefox 88+, Edge 90+)
- A **webcam** (for eye-tracking functionality)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/smartev-vision.git
cd smartev-vision

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Initialise the database
python setup_db.py

# 5. (Optional) Seed sample data so the dashboard has something to show
python generate_sample_data.py

# 6. (Optional) Train the ML models on the sample data
python ml/train_model.py

# 7. Run the application
python run.py
```

Then open **http://localhost:5000** in your browser. The server binds to `0.0.0.0:5000` so devices
on the same LAN can connect. Set `FLASK_DEBUG=1` to enable debug mode.

> Run the scripts from the **repository root** — `setup_db.py`, `generate_sample_data.py`, and the
> `ml/` scripts use paths relative to the current working directory.

---

## 📝 Usage Guide

1. **Register** — On the **Calibration** page, enter participant details to create a user.
2. **Calibrate** — Complete the 9-point eye-tracking calibration (look at each dot and click it to
   map your gaze to screen coordinates).
3. **Explore the Showroom** — Interact with the 3D EV model:
   - 🖱️ **Left drag** — rotate · **Scroll** — zoom · **Right drag** — pan
   - 🎨 Use the UI buttons to change the vehicle colour or view.
4. **View Dashboard** — See analytics across viewing sessions.
5. **View Heatmap** — Visualise where attention was focused on the vehicle.
6. **View Predictions** — See ML predictions of preferred model and preference category.

---

## 🔌 API Reference

### Pages (HTML)

| Route | Description |
|-------|-------------|
| `GET /` | Landing page |
| `GET /showroom` | 3D showroom with eye tracking |
| `GET, POST /calibration` | Calibration screen; a `POST` registers the participant |
| `GET /dashboard` | Analytics dashboard |
| `GET /admin` | Admin panel |
| `GET /sessions/<id>/report` | Per-session report |

### Users — prefix `/api/user`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/register` | POST | Register a participant (`name`, `email`, optional `age`, `gender`) |
| `/api/user/<id>` | GET | Look up a user by ID |

### Sessions, Tracking & Analytics — prefix `/api`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/session/start` *(or `/api/sessions`)* | POST | Start a viewing session |
| `/api/session/end` *(or `/api/sessions/<id>/end`)* | POST | End a session (computes duration, aggregates views, scores engagement) |
| `/api/sessions` | GET | List all sessions with user info and prediction |
| `/api/sessions/<id>` | DELETE | Delete a session and its dependent data |
| `/api/gaze` | POST | Batch-insert gaze points (each is AOI-classified on ingest) |
| `/api/analytics/<id>` | GET | Session analytics summary |
| `/api/heatmap/<id>` *(or `/api/sessions/<id>/heatmap`)* | GET | Gaze heatmap (base64 PNG) + hotspots |
| `/api/predict/<id>` | GET, POST | Run or retrieve the ML prediction for a session |
| `/api/users` | GET | List all participants with session counts |
| `/api/users/<id>` | DELETE | Delete a user and all their sessions/data |

### Dashboard — prefix `/api/dashboard`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/stats` | GET | Global aggregate statistics across all users and sessions |

---

## 🧪 Tests

The suite uses Python's standard-library `unittest`. Run from the repository root:

```bash
python -m unittest discover -s tests                 # whole suite
python -m unittest tests.test_ml                     # a single module
python -m unittest tests.test_ml.TestFeatureExtraction.test_feature_extraction   # a single test
```

---

## 👥 Team Members

| # | Name | Role | Responsibilities |
|---|------|------|-----------------|
| 1 | *Team Member 1* | Project Lead & Backend Developer | Flask API, database design, system architecture |
| 2 | *Team Member 2* | Frontend & 3D Developer | Three.js showroom, UI/UX, responsive layout |
| 3 | *Team Member 3* | Computer Vision Engineer | MediaPipe integration, eye tracking, calibration |
| 4 | *Team Member 4* | ML & Analytics Developer | scikit-learn models, analytics engine, dashboard |

> **Project Guide:** *Prof. [Guide Name]* · **Institution:** *[College Name]* · **Academic Year:** 2025–2026

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for the full text.

---

## 🙏 Acknowledgments

- [Three.js](https://threejs.org/) — JavaScript 3D library for WebGL rendering
- [MediaPipe](https://mediapipe.dev/) — Google's framework for face/iris detection
- [Flask](https://flask.palletsprojects.com/) — lightweight Python web framework
- [scikit-learn](https://scikit-learn.org/) — machine-learning library for Python
- [Plotly.js](https://plotly.com/javascript/) — charting library for the dashboard
- [SQLite](https://www.sqlite.org/) — self-contained SQL database engine
- Our project guide and institution for their support and guidance

<p align="center">
  Made with ❤️ by the SmartEV Vision Team
</p>

<![CDATA[<p align="center">
  <img src="docs/assets/logo.png" alt="SmartEV Vision Logo" width="200"/>
</p>

<h1 align="center">SmartEV Vision</h1>

<p align="center">
  <strong>VR & Eye-Tracking Based Customer Reaction Analysis for EV Product Design</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.9+-blue?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/Flask-2.3+-green?style=for-the-badge&logo=flask&logoColor=white" alt="Flask"/>
  <img src="https://img.shields.io/badge/Three.js-r150+-black?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js"/>
  <img src="https://img.shields.io/badge/MediaPipe-0.10+-orange?style=for-the-badge&logo=google&logoColor=white" alt="MediaPipe"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License"/>
  <img src="https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge" alt="Status"/>
</p>

---

## 📖 About the Project

**SmartEV Vision** is a web-based virtual reality platform that combines an interactive 3D EV showroom with real-time eye-tracking analytics to understand customer preferences and design reactions. The system allows users to explore electric vehicle models in a browser-based 3D environment while their gaze patterns are captured and analyzed using computer vision — providing actionable insights for EV product designers and marketers.

The platform leverages **Three.js** for rendering an immersive virtual showroom, **MediaPipe Face Mesh** for non-intrusive webcam-based eye tracking, and a **Flask** backend to process gaze data, generate attention heatmaps, and run machine learning predictions on customer interest. By eliminating the need for expensive VR headsets or dedicated eye-tracking hardware, SmartEV Vision democratizes customer research for the automotive industry.

This project was developed as a **final-year B.E. mini project** by a team of four students, demonstrating the practical integration of web-based 3D rendering, real-time computer vision, data analytics, and machine learning into a unified customer research tool.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🚗 **Interactive 3D Showroom** | Explore EV models with 360° rotation, zoom, and pan using Three.js |
| 👁️ **Real-Time Eye Tracking** | Webcam-based iris tracking using MediaPipe Face Mesh (468 landmarks) |
| 🎯 **Gaze Calibration System** | 9-point calibration for accurate gaze-to-screen coordinate mapping |
| 🔥 **Attention Heatmaps** | Visual heatmap overlays showing where users look most on the vehicle |
| 📊 **Analytics Dashboard** | Real-time session analytics with gaze metrics, dwell times, and patterns |
| 🤖 **ML Predictions** | Random Forest classifier predicting purchase interest and preferred features |
| 🎨 **Color Customization** | Change vehicle colors interactively and track color preference patterns |
| 👤 **User Management** | Registration, authentication, and session history tracking |
| 📱 **Responsive Design** | Works across desktop browsers with webcam support |
| 📈 **Data Export** | Export analytics data for external analysis tools |

---

## 📸 Screenshots

<details>
<summary>Click to expand screenshots</summary>

| Screen | Description |
|--------|-------------|
| ![Home Page](docs/assets/screenshots/home.png) | Landing page with project overview and login |
| ![Showroom](docs/assets/screenshots/showroom.png) | 3D virtual showroom with EV model and orbit controls |
| ![Eye Tracking](docs/assets/screenshots/eye_tracking.png) | Real-time eye tracking overlay with gaze indicators |
| ![Calibration](docs/assets/screenshots/calibration.png) | 9-point eye tracking calibration screen |
| ![Heatmap](docs/assets/screenshots/heatmap.png) | Attention heatmap visualization over vehicle model |
| ![Dashboard](docs/assets/screenshots/dashboard.png) | Analytics dashboard with charts and metrics |
| ![Predictions](docs/assets/screenshots/predictions.png) | ML prediction results with confidence scores |

</details>

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) | Core web technologies |
| **3D Rendering** | Three.js (r150+) | WebGL-based 3D virtual showroom |
| **Eye Tracking** | MediaPipe Face Mesh | Real-time iris detection (468 facial landmarks) |
| **Heatmap** | Canvas API / Custom renderer | Gaze attention visualization |
| **Backend** | Flask 2.3+ (Python) | REST API server and business logic |
| **Database** | SQLite 3 | Lightweight relational data storage |
| **ML Engine** | scikit-learn (Random Forest) | Purchase interest prediction |
| **Data Processing** | NumPy, Pandas | Gaze data aggregation and analytics |
| **Visualization** | Chart.js | Dashboard charts and graphs |
| **Authentication** | Flask sessions + Werkzeug | User management and security |

---

## 📁 Project Structure

```
SmartEV-Vision/
├── app.py                      # Flask application entry point
├── config.py                   # Configuration settings
├── requirements.txt            # Python dependencies
├── README.md                   # Project documentation
│
├── static/
│   ├── css/
│   │   ├── style.css           # Global styles
│   │   ├── showroom.css        # Showroom page styles
│   │   └── dashboard.css       # Dashboard styles
│   ├── js/
│   │   ├── showroom.js         # Three.js 3D showroom logic
│   │   ├── eye_tracking.js     # MediaPipe eye tracking
│   │   ├── calibration.js      # Gaze calibration system
│   │   ├── heatmap.js          # Heatmap generation
│   │   ├── dashboard.js        # Dashboard charts (Chart.js)
│   │   └── utils.js            # Shared utilities
│   ├── models/
│   │   └── ev_model.glb        # 3D EV model (placeholder)
│   └── assets/
│       ├── logo.png            # Project logo
│       └── screenshots/        # Application screenshots
│
├── templates/
│   ├── base.html               # Base template with nav
│   ├── index.html              # Landing page
│   ├── register.html           # Registration page
│   ├── login.html              # Login page
│   ├── showroom.html           # 3D showroom with eye tracking
│   ├── calibration.html        # Eye tracking calibration
│   ├── dashboard.html          # Analytics dashboard
│   ├── heatmap.html            # Heatmap visualization
│   ├── predictions.html        # ML predictions page
│   └── admin.html              # Admin panel
│
├── services/
│   ├── __init__.py
│   ├── eye_tracking_service.py # Gaze data processing
│   ├── analytics_service.py    # Session analytics engine
│   ├── heatmap_service.py      # Heatmap data generation
│   └── ml_service.py           # ML training & prediction
│
├── models/
│   ├── __init__.py
│   ├── database.py             # SQLite connection & schema
│   ├── user.py                 # User model
│   └── session.py              # Session & gaze models
│
├── docs/
│   ├── diagrams/
│   │   └── architecture.md     # System architecture diagrams
│   ├── project_report.md       # Complete project report
│   ├── presentation_content.md # PPT slide content
│   ├── viva_qa.md              # Viva questions & answers
│   ├── user_manual.md          # User guide
│   ├── deployment_guide.md     # Deployment instructions
│   └── future_enhancements.md  # Future scope
│
├── tests/
│   ├── test_app.py             # Flask route tests
│   ├── test_analytics.py       # Analytics service tests
│   ├── test_ml.py              # ML service tests
│   └── test_database.py        # Database operation tests
│
└── instance/
    └── smartev.db              # SQLite database (auto-created)
```

---

## 🚀 Installation

### Prerequisites

- **Python** 3.9 or higher
- **pip** (Python package manager)
- **Modern web browser** (Chrome 90+, Firefox 88+, Edge 90+)
- **Webcam** (for eye tracking functionality)
- **Git** (optional, for cloning)

### Step-by-Step Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-team/smartev-vision.git
   cd smartev-vision
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv

   # Windows
   venv\Scripts\activate

   # macOS / Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Initialize the database**
   ```bash
   python -c "from models.database import init_db; init_db()"
   ```

5. **Run the application**
   ```bash
   python app.py
   ```

6. **Open your browser**
   ```
   http://localhost:5000
   ```

### Quick Start (One-Liner)

```bash
git clone https://github.com/your-team/smartev-vision.git && cd smartev-vision && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && python app.py
```

---

## 📝 Usage Guide

1. **Register / Login** — Create an account or log in with existing credentials
2. **Calibrate** — Complete the 9-point eye tracking calibration (look at each dot as it appears)
3. **Explore Showroom** — Interact with the 3D EV model using mouse controls:
   - 🖱️ **Left drag** — Rotate the model
   - 🖱️ **Scroll** — Zoom in/out
   - 🖱️ **Right drag** — Pan the view
   - 🎨 **Color buttons** — Change vehicle color
4. **View Dashboard** — See real-time analytics about your viewing session
5. **View Heatmap** — Visualize where your attention was focused on the vehicle
6. **View Predictions** — See ML predictions about your preferences and purchase interest

---

## 🔌 API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/register` | POST | Register a new user |
| `/api/login` | POST | Authenticate user |
| `/api/logout` | GET | End user session |

### Session Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/session/start` | POST | Start a new tracking session |
| `/api/session/end` | POST | End current session |
| `/api/session/<id>` | GET | Get session details |

### Eye Tracking

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gaze` | POST | Submit gaze data point |
| `/api/gaze/batch` | POST | Submit batch gaze data |
| `/api/calibration` | POST | Submit calibration data |

### Analytics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/<session_id>` | GET | Get session analytics |
| `/api/heatmap/<session_id>` | GET | Get heatmap data |
| `/api/predictions/<session_id>` | GET | Get ML predictions |

### Admin

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/users` | GET | List all users |
| `/api/admin/sessions` | GET | List all sessions |
| `/api/admin/export` | GET | Export data (CSV) |
| `/api/admin/train` | POST | Retrain ML model |

---

## 👥 Team Members

| # | Name | Role | Responsibilities |
|---|------|------|-----------------|
| 1 | *Team Member 1* | Project Lead & Backend Developer | Flask API, database design, system architecture |
| 2 | *Team Member 2* | Frontend & 3D Developer | Three.js showroom, UI/UX design, responsive layout |
| 3 | *Team Member 3* | Computer Vision Engineer | MediaPipe integration, eye tracking, calibration |
| 4 | *Team Member 4* | ML & Analytics Developer | scikit-learn models, analytics engine, dashboard |

> **Project Guide:** *Prof. [Guide Name]*
> **Institution:** *[College Name]*
> **Academic Year:** 2025–2026

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 SmartEV Vision Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

- **[Three.js](https://threejs.org/)** — JavaScript 3D library for WebGL rendering
- **[MediaPipe](https://mediapipe.dev/)** — Google's cross-platform ML framework for face/iris detection
- **[Flask](https://flask.palletsprojects.com/)** — Lightweight Python web framework
- **[scikit-learn](https://scikit-learn.org/)** — Machine learning library for Python
- **[Chart.js](https://www.chartjs.org/)** — Simple yet flexible JavaScript charting library
- **[SQLite](https://www.sqlite.org/)** — Self-contained, serverless SQL database engine
- Our project guide and institution for their support and guidance
- Open-source contributors whose libraries made this project possible

---

<p align="center">
  Made with ❤️ by the SmartEV Vision Team
</p>
]]>

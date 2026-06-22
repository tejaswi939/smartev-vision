# smartev-vision
VR &amp; Eye-Tracking Based Customer Reaction Analysis for EV Product Design
MIT License

SmartEV Vision is a web-based platform that combines an interactive 3D EV showroom with real-time eye-tracking analytics to understand customer preferences and design reactions. The system allows users to explore electric vehicle models in a browser-based 3D environment while their gaze patterns are captured and analyzed using computer vision — providing actionable insights for EV product designers and marketers.

The platform leverages Three.js for rendering an immersive virtual showroom, MediaPipe Face Mesh for non-intrusive webcam-based eye tracking, and a Flask backend to process gaze data, generate attention heatmaps, and run machine learning predictions on customer interest. By eliminating the need for expensive VR headsets or dedicated eye-tracking hardware, SmartEV Vision democratizes customer research for the automotive industry.

This project was developed as a final-year B.E. mini project by a team of four students, demonstrating the practical integration of web-based 3D rendering, real-time computer vision, data analytics, and machine learning into a unified customer research tool.

✨ Features

Feature

Description

🚗 Interactive 3D Showroom

Explore EV models with 360° rotation, zoom, and pan using Three.js

👁️ Real-Time Eye Tracking

Webcam-based iris tracking using MediaPipe Face Mesh (468 landmarks)

🎯 Gaze Calibration System

9-point calibration for accurate gaze-to-screen coordinate mapping

🔥 Attention Heatmaps

Visual heatmap overlays showing where users look most on the vehicle

📊 Analytics Dashboard

Real-time session analytics with gaze metrics, dwell times, and patterns

🤖 ML Predictions

Random Forest classifier predicting purchase interest and preferred features

🎨 Color Customization

Change vehicle colors interactively and track color preference patterns

👤 User Management

Registration, authentication, and session history tracking

📱 Responsive Design

Works across desktop browsers with webcam support

📈 Data Export

Export analytics data for external analysis tools

🛠️ Technology Stack

Layer

Technology

Purpose

Frontend

HTML5, CSS3, JavaScript (ES6+)

Core web technologies

3D Rendering

Three.js (r150+)

WebGL-based 3D virtual showroom

Eye Tracking

MediaPipe Face Mesh

Real-time iris detection (468 facial landmarks)

Heatmap

Canvas API / Custom renderer

Gaze attention visualization

Backend

Flask 2.3+ (Python)

REST API server and business logic

Database

SQLite 3

Lightweight relational data storage

ML Engine

scikit-learn (Random Forest)

Purchase interest prediction

Data Processing

NumPy, Pandas

Gaze data aggregation and analytics

Visualization

Chart.js

Dashboard charts and graphs

Authentication

Flask sessions + Werkzeug

User management and security

📁 Project Structure

EV project/
├── run.py                      # Application entry point (runs the Flask dev server)
├── config.py                   # Configuration settings
├── requirements.txt            # Python dependencies
├── setup_db.py                 # Script to initialize the database
├── generate_sample_data.py     # Script to populate db with mock data
├── README.md                   # Project documentation
│
├── app/                        # Main application package
│   ├── __init__.py             # Flask app factory
│   ├── models.py               # SQLAlchemy database models
│   │
│   ├── routes/                 # URL Route definitions (Controllers)
│   │   ├── main.py             # UI Routes (Index, Showroom)
│   │   ├── auth.py             # Login/Register routes
│   │   ├── api.py              # REST API endpoints for tracking data
│   │   └── dashboard.py        # Analytics and admin routes
│   │
│   ├── services/               # Core business logic
│   │   ├── eye_tracking.py     # Gaze coordinate processing
│   │   ├── analytics.py        # Data aggregation
│   │   ├── heatmap.py          # Heatmap generation logic
│   │   └── ml_engine.py        # Interface with ML models
│   │
│   ├── templates/              # HTML Templates (Jinja2)
│   │   ├── base.html           
│   │   ├── index.html          
│   │   ├── showroom.html       
│   │   ├── calibration.html    
│   │   ├── dashboard.html      
│   │   └── session_report.html 
│   │
│   └── static/                 # Static Assets
│       ├── css/                # Stylesheets
│       ├── js/                 # Client-side JavaScript (Three.js, MediaPipe)
│       │   ├── showroom.js     
│       │   ├── eye_tracker.js  
│       │   ├── heatmap.js      
│       │   └── dashboard.js    
│       └── assets/             # Images and 3D models (.glb/.gltf)
│
├── ml/                         # Machine Learning pipeline
│   ├── train_model.py          # Script to train the Random Forest models
│   ├── predictor.py            # Prediction utilities
│   └── *.pkl                   # Serialized trained models
│
├── data/                       # Database and raw data
│   └── smartev.db              # SQLite database file
│
├── tests/                      # Unit and integration tests
│   ├── test_api.py             
│   ├── test_analytics.py       
│   ├── test_heatmap.py         
│   └── test_ml.py              
│
└── docs/                       # Additional documentation


🚀 Installation

Prerequisites

Python 3.9 or higher

pip (Python package manager)

Modern web browser (Chrome 90+, Firefox 88+, Edge 90+)

Webcam (for eye tracking functionality)

Git (optional, for cloning)

Step-by-Step Setup

Clone the repository (If you haven't already)

git clone [https://github.com/YOUR_USERNAME/smartev-vision.git](https://github.com/YOUR_USERNAME/smartev-vision.git)
cd smartev-vision


Create a virtual environment

python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate


Install dependencies

pip install -r requirements.txt


Initialize the database

python setup_db.py


(Optional) Generate sample data to test the dashboard immediately:

python generate_sample_data.py


Train the ML Models (Optional)
If you want to re-train the predictive models based on new sample data:

python ml/train_model.py


Run the application

python run.py


Open your browser

http://localhost:5000


📝 Usage Guide

Register / Login — Create an account or log in with existing credentials

Calibrate — Navigate to the Showroom. Before viewing the car, you will be prompted to complete a 9-point eye tracking calibration (look at each dot and click it to map your screen coordinates).

Explore Showroom — Interact with the 3D EV model using mouse controls:

🖱️ Left drag — Rotate the model

🖱️ Scroll — Zoom in/out

🖱️ Right drag — Pan the view

🎨 UI Buttons — Change vehicle color or switch interior/exterior views.

View Dashboard — Navigate to the Dashboard to see real-time analytics about viewing sessions.

View Heatmap — Visualize where attention was focused on the vehicle models.

View Predictions — See ML predictions about user preferences and purchase interest.


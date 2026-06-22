<![CDATA[# SmartEV Vision — User Manual

> A step-by-step guide for using the SmartEV Vision platform.

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Installation](#2-installation)
3. [Starting the Application](#3-starting-the-application)
4. [User Registration](#4-user-registration)
5. [Login](#5-login)
6. [Eye-Tracking Calibration](#6-eye-tracking-calibration)
7. [Using the Virtual Showroom](#7-using-the-virtual-showroom)
8. [Viewing the Analytics Dashboard](#8-viewing-the-analytics-dashboard)
9. [Understanding Heatmaps](#9-understanding-heatmaps)
10. [Understanding ML Predictions](#10-understanding-ml-predictions)
11. [Session History](#11-session-history)
12. [Admin Panel Usage](#12-admin-panel-usage)
13. [Troubleshooting Common Issues](#13-troubleshooting-common-issues)
14. [FAQ](#14-faq)

---

## 1. System Requirements

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Processor** | Intel i3 / AMD Ryzen 3 | Intel i5 / AMD Ryzen 5 or better |
| **RAM** | 4 GB | 8 GB or more |
| **Graphics** | Integrated GPU with WebGL support | Dedicated GPU (NVIDIA/AMD) |
| **Webcam** | 720p (30 fps) | 1080p (30+ fps) |
| **Display** | 1366 × 768 | 1920 × 1080 or higher |
| **Internet** | Required for initial CDN loading | Broadband recommended |

### Software Requirements

| Software | Requirement | Notes |
|----------|------------|-------|
| **Operating System** | Windows 10+, macOS 11+, Ubuntu 20.04+ | Any modern OS |
| **Web Browser** | Chrome 90+, Firefox 88+, Edge 90+ | Chrome recommended for best performance |
| **Python** | 3.9 or higher | For running the backend server |
| **Webcam Drivers** | Latest manufacturer drivers | Built-in webcams usually work automatically |

### Browser Feature Requirements

The following browser features must be enabled (they are by default in modern browsers):

- ✅ **WebGL 2.0** — For Three.js 3D rendering
- ✅ **getUserMedia API** — For webcam access (eye tracking)
- ✅ **JavaScript** — Must be enabled
- ✅ **Canvas API** — For heatmap rendering
- ✅ **Cookies** — For session management

> **Important:** The application requires webcam access. When prompted by the browser, click **"Allow"** to grant camera permissions.

---

## 2. Installation

### Step 1: Download the Project

```bash
# Option A: Clone with Git
git clone https://github.com/your-team/smartev-vision.git

# Option B: Download ZIP
# Download from the repository and extract to a folder
```

### Step 2: Set Up Python Environment

```bash
# Navigate to project folder
cd smartev-vision

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Initialize the Database

```bash
python -c "from models.database import init_db; init_db()"
```

You should see: `Database initialized successfully.`

---

## 3. Starting the Application

### Start the Server

```bash
python app.py
```

You should see output similar to:

```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
 * Restarting with stat
```

### Open the Application

1. Open your web browser (Chrome recommended)
2. Navigate to: **http://localhost:5000**
3. You should see the SmartEV Vision landing page

### Stopping the Server

Press `Ctrl + C` in the terminal to stop the server.

---

## 4. User Registration

1. Click the **"Register"** button on the landing page (or navigate to `/register`)
2. Fill in the registration form:

   | Field | Requirements |
   |-------|-------------|
   | **Username** | 3–20 characters, alphanumeric |
   | **Email** | Valid email format (e.g., user@example.com) |
   | **Password** | Minimum 8 characters |
   | **Confirm Password** | Must match password |

3. Click **"Create Account"**
4. On success, you will be redirected to the login page

> **Note:** Each username and email must be unique. If you see an error, try a different username or email.

---

## 5. Login

1. Navigate to the login page (`/login`)
2. Enter your **username** and **password**
3. Click **"Login"**
4. On success, you will be redirected to the showroom

### Staying Logged In

Your session remains active until you:
- Click **"Logout"**
- Close the browser (sessions expire after inactivity)
- The server is restarted

---

## 6. Eye-Tracking Calibration

Calibration maps your eye movements to screen coordinates. This is a **critical step** for accurate tracking.

### Calibration Process

1. After login, you will be directed to the **Calibration** page
2. **Grant webcam access** when prompted by the browser
3. Ensure your face is visible in the small preview window
4. A series of **9 dots** will appear on the screen, one at a time
5. For each dot:
   - **Look directly at the dot** (do not move your head)
   - **Hold your gaze** for 2–3 seconds until the dot turns green
   - The dot will automatically advance to the next position
6. After all 9 dots are complete, calibration is finished
7. You will see a **calibration accuracy score** (aim for 80%+)

### Calibration Dot Positions

```
 ●─────────●─────────●
 │                   │
 │                   │
 ●─────────●─────────●
 │                   │
 │                   │
 ●─────────●─────────●
```

The dots appear in a 3×3 grid covering the full screen area.

### Tips for Accurate Calibration

| Tip | Why It Matters |
|-----|---------------|
| 🔆 **Good Lighting** | Even, front-facing lighting helps the camera see your eyes clearly. Avoid backlighting (window behind you). |
| 📐 **Face the Screen** | Keep your face centered and facing the screen directly. Avoid extreme angles. |
| 📏 **Proper Distance** | Sit 50–70 cm (20–28 inches) from the screen. Too close or too far reduces accuracy. |
| 🚫 **Minimize Movement** | Keep your head still during calibration. Only move your eyes. |
| 👓 **Glasses/Contacts** | Both work, but avoid reflective coatings that create glare. Remove sunglasses. |
| 🖥️ **Screen Brightness** | Set screen brightness to a comfortable level. Very bright screens can cause squinting. |
| ⏱️ **Take Your Time** | Don't rush the calibration dots. Steady gaze produces better calibration. |

### Re-Calibration

If tracking feels inaccurate during the showroom session, you can re-calibrate:
- Click the **"Re-calibrate"** button in the top toolbar
- Or navigate to **Settings → Eye Tracking → Recalibrate**

---

## 7. Using the Virtual Showroom

The virtual showroom is the core experience where you explore the EV model while your gaze is tracked.

### 7.1 Navigation Controls

| Control | Action | How To |
|---------|--------|--------|
| 🔄 **Rotate** | Spin the car model | Left-click and drag |
| 🔍 **Zoom** | Move closer or farther | Scroll wheel up/down |
| ↔️ **Pan** | Shift the view left/right/up/down | Right-click and drag |
| 🏠 **Reset View** | Return to default view | Click "Reset" button or press `R` |
| ⏸️ **Pause Tracking** | Temporarily stop eye tracking | Click "Pause" button or press `Space` |

### 7.2 Vehicle Views

The showroom provides preset camera angles for consistent viewing:

| View | Description | Keyboard Shortcut |
|------|-------------|-------------------|
| **Front** | Head-on front view | Press `1` |
| **Rear** | Back of the vehicle | Press `2` |
| **Left Side** | Driver's side profile | Press `3` |
| **Right Side** | Passenger side profile | Press `4` |
| **Top** | Bird's eye view | Press `5` |
| **Interior** | Inside the cabin | Press `6` |
| **3/4 View** | Classic showroom angle | Press `7` |

### 7.3 Color Customization

Change the vehicle's color to track color preferences:

1. Look for the **Color Palette** panel on the right side of the screen
2. Click on a color swatch to apply it to the vehicle
3. Available colors include:
   - 🔴 Red
   - 🔵 Blue
   - ⚫ Black
   - ⚪ White
   - 🟢 Green
   - 🟡 Yellow / Gold
   - 🟤 Silver / Grey
4. The system records which colors you select and how long you view each one

### 7.4 Model Interaction

- **Click on vehicle parts** to highlight them and see part names (e.g., "Front Bumper," "Headlight," "Wheel")
- **Hover** over components to see basic information tooltips
- The system tracks which parts receive the most attention (gaze time)

### 7.5 Eye Tracking Indicator

During the showroom session:

- A small **gaze dot** (green circle) shows where the system detects you are looking
- A **webcam preview** (small window, bottom-left) shows your face with iris landmarks
- The **tracking status** indicator shows:
  - 🟢 **Active** — Eye tracking is working normally
  - 🟡 **Low Confidence** — Detection quality is reduced (adjust lighting/position)
  - 🔴 **Lost** — Cannot detect your eyes (check webcam, face position)

### 7.6 Ending a Session

When you're done exploring:

1. Click the **"End Session"** button (top-right corner)
2. Or press `Esc` to bring up the session menu
3. Confirm by clicking **"End & View Results"**
4. The system will process your data and redirect you to the dashboard

> **Recommended session duration:** 3–10 minutes for meaningful data. Very short sessions (<1 minute) may not generate enough data for accurate predictions.

---

## 8. Viewing the Analytics Dashboard

The dashboard presents a visual summary of your showroom session.

### 8.1 Session Overview

| Metric | Description |
|--------|-------------|
| **Total Duration** | How long your showroom session lasted |
| **Total Gaze Points** | Number of gaze data points recorded |
| **Average Confidence** | Mean accuracy of eye tracking detection |
| **Fixation Count** | Number of distinct fixation events |
| **Saccade Count** | Number of rapid eye movements between fixations |

### 8.2 Charts and Graphs

The dashboard includes several interactive charts:

1. **Gaze Distribution Pie Chart** — Shows what percentage of time you spent looking at each vehicle part (front, rear, side, interior, wheels)

2. **Dwell Time Bar Chart** — Bar graph of time spent on each vehicle part in seconds

3. **Gaze Timeline** — Line chart showing gaze position (x, y) over time, revealing your exploration pattern

4. **Color Preference Chart** — If you changed colors, shows time spent viewing each color

5. **View Angle Distribution** — Donut chart showing time spent at each camera angle

### 8.3 Interacting with Charts

- **Hover** over chart elements to see exact values
- **Click** on legend items to show/hide data series
- **Zoom** (scroll) on timeline charts to inspect specific time ranges
- **Download** charts as PNG images using the download button (📥)

---

## 9. Understanding Heatmaps

Heatmaps show **where you looked most** on the vehicle model as a color overlay.

### 9.1 Reading the Heatmap

| Color | Meaning | Attention Level |
|-------|---------|----------------|
| 🔴 **Red / Hot** | Longest gaze duration | Very high attention |
| 🟠 **Orange** | Extended gaze | High attention |
| 🟡 **Yellow** | Moderate gaze | Medium attention |
| 🟢 **Green** | Brief gaze | Low attention |
| 🔵 **Blue / Cool** | Minimal or no gaze | Very low attention |
| ⬜ **No color** | Not looked at | No attention |

### 9.2 Heatmap Controls

| Control | Description |
|---------|-------------|
| **Opacity Slider** | Adjust heatmap transparency (0–100%) |
| **Radius Slider** | Change the size of each gaze point's influence area |
| **Color Scale** | Toggle between rainbow and grayscale color maps |
| **Toggle Overlay** | Show/hide the heatmap overlay |
| **View Selector** | Switch between heatmaps for different vehicle views |

### 9.3 Interpreting Results

- **Concentrated hot spots** suggest strong interest in specific features
- **Evenly distributed warmth** suggests broad, exploratory viewing
- **Cold zones** may indicate features that users don't notice or find uninteresting
- **Comparison:** Compare heatmaps across different sessions to see if attention patterns change

---

## 10. Understanding ML Predictions

The ML (Machine Learning) predictions page shows the system's analysis of your likely preferences based on your gaze patterns.

### 10.1 Prediction Results

| Prediction | Description | Range |
|------------|-------------|-------|
| **Purchase Probability** | Likelihood of purchase interest | 0% – 100% |
| **Interest Level** | Categorical interest rating | High / Medium / Low |
| **Preferred Feature** | Feature you showed most interest in | Design / Color / Interior / Tech |
| **Preferred View** | Vehicle angle you were most drawn to | Front / Rear / Side / Interior |
| **Confidence Score** | How confident the model is in its predictions | 0% – 100% |

### 10.2 What the Predictions Mean

- **High Purchase Probability (>70%):** Your gaze patterns resemble those of users who expressed strong purchase intent in previous sessions. You showed sustained attention to multiple vehicle features with positive engagement patterns.

- **Medium Purchase Probability (40–70%):** Your engagement was moderate — you showed interest in some features but may have had mixed reactions. This is common for users still evaluating options.

- **Low Purchase Probability (<40%):** Your viewing patterns suggest casual browsing rather than strong purchase intent. Short fixation times and rapid scanning are typical indicators.

### 10.3 Feature Importance

The predictions page also shows a **Feature Importance** chart that reveals which aspects of your behavior most influenced the prediction:

- **Gaze duration on front view** — How long you looked at the front of the car
- **Fixation count** — More fixations often indicate deeper interest
- **Color change frequency** — Trying many colors suggests active exploration
- **Interior view time** — Looking at the interior often correlates with serious purchase intent
- **Zoom frequency** — Zooming in to inspect details shows careful evaluation

### 10.4 Important Disclaimer

> **Note:** ML predictions are probabilistic estimates based on aggregate behavioral patterns. They should be interpreted as one input among many in customer research — not as definitive conclusions about any individual's purchase intent. The model's accuracy is approximately 78% on the training dataset.

---

## 11. Session History

Access your past sessions and their results:

1. Click your **username** in the top navigation bar
2. Select **"Session History"** from the dropdown
3. You'll see a table of all your past sessions:

| Column | Description |
|--------|-------------|
| **Date** | When the session occurred |
| **Duration** | How long the session lasted |
| **Gaze Points** | Number of data points recorded |
| **Interest Level** | ML-predicted interest level |
| **Actions** | Links to view dashboard, heatmap, and predictions |

4. Click on any session to view its full analytics

---

## 12. Admin Panel Usage

The admin panel is available to users with admin privileges.

### Accessing the Admin Panel

1. Log in with an admin account
2. Click **"Admin"** in the navigation bar (only visible for admin users)
3. Or navigate to `/admin`

### Admin Features

#### 12.1 User Management

| Action | Description |
|--------|-------------|
| **View Users** | List all registered users with registration date and login history |
| **Edit User** | Modify user details (username, email, admin status) |
| **Delete User** | Remove a user and all their session data |
| **Create Admin** | Promote a user to admin role |

#### 12.2 Session Management

| Action | Description |
|--------|-------------|
| **View All Sessions** | Browse sessions across all users |
| **Session Details** | View any user's session analytics |
| **Delete Session** | Remove a session and its associated data |

#### 12.3 ML Model Management

| Action | Description |
|--------|-------------|
| **Train Model** | Retrain the ML model using all available session data |
| **Model Status** | View current model version, accuracy, and training date |
| **Feature Importances** | View which features the model considers most important |

#### 12.4 Data Export

| Format | Description |
|--------|-------------|
| **CSV Export** | Download all session data as CSV files |
| **JSON Export** | Download raw data in JSON format |
| **Filter Export** | Export data filtered by date range, user, or interest level |

### Creating the First Admin Account

```bash
# Run the admin creation script
python -c "
from models.database import get_db
from werkzeug.security import generate_password_hash
db = get_db()
db.execute(
    'INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)',
    ('admin', 'admin@smartev.com', generate_password_hash('admin123'), True)
)
db.commit()
print('Admin account created: admin / admin123')
"
```

> **Important:** Change the default admin password immediately after first login.

---

## 13. Troubleshooting Common Issues

### 🔴 Webcam Not Working

| Possible Cause | Solution |
|----------------|----------|
| Browser permission denied | Click the camera icon in the address bar → Allow |
| Another app using the webcam | Close Zoom, Teams, Skype, etc. |
| Webcam not detected | Check Device Manager (Windows) or System Preferences (macOS) |
| Not using HTTPS | Use `http://localhost:5000` (localhost is exempt from HTTPS requirement) |
| Outdated browser | Update to the latest version of Chrome/Firefox/Edge |

### 🔴 3D Models Not Loading

| Possible Cause | Solution |
|----------------|----------|
| WebGL not supported | Check at https://get.webgl.org/ — update graphics drivers |
| Browser hardware acceleration disabled | Chrome → Settings → System → Enable "Use hardware acceleration" |
| Model file missing | Ensure `static/models/` directory contains the model files |
| CORS error (console) | Ensure the Flask server is serving static files correctly |

### 🔴 Eye Tracking Inaccurate

| Possible Cause | Solution |
|----------------|----------|
| Poor lighting | Add front-facing light; avoid backlighting |
| Face too far from camera | Move to 50–70 cm from the screen |
| Glasses glare | Adjust screen angle; remove reflective coating glasses if possible |
| Head movement | Keep head still; move only your eyes |
| Calibration was rushed | Re-calibrate slowly, holding gaze for the full duration on each dot |

### 🔴 Application Won't Start

| Possible Cause | Solution |
|----------------|----------|
| Virtual environment not activated | Run `.\venv\Scripts\Activate.ps1` (Windows) or `source venv/bin/activate` |
| Missing dependencies | Run `pip install -r requirements.txt` |
| Port 5000 in use | Use a different port: `python app.py --port 8080` |
| Python version too old | Upgrade to Python 3.9+ |

### 🔴 Dashboard Shows No Data

| Possible Cause | Solution |
|----------------|----------|
| Session was too short | Run a session for at least 1–2 minutes |
| Session not ended properly | Click "End Session" button; don't just close the tab |
| Database error | Check terminal for error messages |

### 🔴 ML Predictions Not Available

| Possible Cause | Solution |
|----------------|----------|
| Not enough training data | Need at least 10 completed sessions to train the model |
| Model not trained | Admin: go to Admin Panel → Train Model |
| Session data insufficient | Ensure the session had enough gaze data (100+ data points) |

### 🟡 Performance Issues (Low FPS)

| Possible Cause | Solution |
|----------------|----------|
| Integrated GPU | Close other GPU-intensive applications |
| Too many browser tabs | Close unnecessary tabs |
| High-resolution model | The system auto-adjusts; try refreshing the page |
| Outdated graphics drivers | Update GPU drivers from the manufacturer's website |

---

## 14. FAQ

**Q: Do I need a VR headset?**
> No! SmartEV Vision works entirely in your web browser with a standard webcam. No special hardware is required.

**Q: Is my webcam video recorded?**
> No. The webcam feed is processed locally in your browser using MediaPipe. Only extracted gaze coordinates (x, y numbers) are sent to the server. No video or images are stored.

**Q: How accurate is the eye tracking?**
> With good calibration and lighting, the system achieves approximately 2°–5° angular accuracy, which translates to roughly 2–5 cm precision on a standard monitor at typical viewing distance. This is sufficient for identifying which vehicle parts receive attention.

**Q: Can I use this on a laptop?**
> Yes! Laptops with built-in webcams work well. Ensure your laptop screen brightness is adequate and you have decent front lighting.

**Q: How long should a session be?**
> We recommend 3–10 minutes for meaningful results. Sessions shorter than 1 minute may not generate enough data for accurate ML predictions.

**Q: Can multiple users use the system at the same time?**
> Currently, the system supports one active user at a time on a single installation. For multiple simultaneous users, separate server instances would be needed.

**Q: How do I interpret a low purchase probability?**
> A low score doesn't mean the user dislikes the vehicle — it means their gaze patterns differ from users who self-reported high purchase intent. Many factors beyond visual attention influence purchase decisions.

**Q: What data is stored?**
> The system stores: username, email, hashed password, gaze coordinates (x, y), timestamps, vehicle view data, and ML predictions. No personal images, video, or biometric data is stored.

---

*For additional support, please contact the SmartEV Vision development team or refer to the [Deployment Guide](deployment_guide.md) for technical setup assistance.*
]]>

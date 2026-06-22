<![CDATA[# SmartEV Vision — Deployment Guide

> Complete guide for deploying SmartEV Vision in development and production environments.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
   - [Windows](#21-windows)
   - [macOS](#22-macos)
   - [Linux (Ubuntu/Debian)](#23-linux-ubuntudebian)
3. [Virtual Environment Setup](#3-virtual-environment-setup)
4. [Database Initialization](#4-database-initialization)
5. [Running the Application](#5-running-the-application)
6. [Environment Variables](#6-environment-variables)
7. [Production Deployment with Waitress (Windows)](#7-production-deployment-with-waitress-windows)
8. [Production Deployment with Gunicorn (Linux/macOS)](#8-production-deployment-with-gunicorn-linuxmacos)
9. [Docker Deployment (Optional)](#9-docker-deployment-optional)
10. [Reverse Proxy with Nginx](#10-reverse-proxy-with-nginx)
11. [HTTPS Configuration](#11-https-configuration)
12. [Common Deployment Issues](#12-common-deployment-issues)

---

## 1. Prerequisites

| Requirement | Minimum Version | Check Command |
|------------|----------------|---------------|
| Python | 3.9+ | `python --version` |
| pip | 21.0+ | `pip --version` |
| Git | 2.30+ | `git --version` |
| Web Browser | Chrome 90+ / Firefox 88+ / Edge 90+ | — |
| Webcam | 720p+ resolution | — |
| RAM | 4 GB minimum (8 GB recommended) | — |
| Disk Space | 500 MB for application + dependencies | — |

---

## 2. Local Development Setup

### 2.1 Windows

```powershell
# 1. Install Python (if not installed)
# Download from https://www.python.org/downloads/
# ✅ Check "Add Python to PATH" during installation

# 2. Verify installation
python --version
pip --version

# 3. Clone the repository
git clone https://github.com/your-team/smartev-vision.git
cd smartev-vision

# 4. Create virtual environment
python -m venv venv

# 5. Activate virtual environment
.\venv\Scripts\Activate.ps1

# If you get an execution policy error, run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 6. Upgrade pip
python -m pip install --upgrade pip

# 7. Install dependencies
pip install -r requirements.txt

# 8. Initialize database
python -c "from models.database import init_db; init_db()"

# 9. Run the application
python app.py
```

### 2.2 macOS

```bash
# 1. Install Python via Homebrew
brew install python@3.11

# 2. Verify installation
python3 --version
pip3 --version

# 3. Clone the repository
git clone https://github.com/your-team/smartev-vision.git
cd smartev-vision

# 4. Create virtual environment
python3 -m venv venv

# 5. Activate virtual environment
source venv/bin/activate

# 6. Upgrade pip
pip install --upgrade pip

# 7. Install dependencies
pip install -r requirements.txt

# 8. Initialize database
python -c "from models.database import init_db; init_db()"

# 9. Run the application
python app.py
```

### 2.3 Linux (Ubuntu/Debian)

```bash
# 1. Install Python and pip
sudo apt update
sudo apt install python3 python3-pip python3-venv git -y

# 2. Verify installation
python3 --version
pip3 --version

# 3. Clone the repository
git clone https://github.com/your-team/smartev-vision.git
cd smartev-vision

# 4. Create virtual environment
python3 -m venv venv

# 5. Activate virtual environment
source venv/bin/activate

# 6. Upgrade pip
pip install --upgrade pip

# 7. Install dependencies
pip install -r requirements.txt

# 8. Initialize database
python -c "from models.database import init_db; init_db()"

# 9. Run the application
python app.py
```

---

## 3. Virtual Environment Setup

### Why Use a Virtual Environment?

Virtual environments isolate project dependencies from the system Python installation, preventing version conflicts between projects.

### Creating and Managing

```bash
# Create
python -m venv venv

# Activate (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Activate (Windows CMD)
.\venv\Scripts\activate.bat

# Activate (macOS/Linux)
source venv/bin/activate

# Verify active environment
which python   # Should show path inside venv/

# Deactivate
deactivate

# Remove virtual environment (if needed)
# Windows: rmdir /s /q venv
# macOS/Linux: rm -rf venv
```

### Dependencies (requirements.txt)

```txt
Flask==2.3.3
Werkzeug==2.3.7
numpy==1.24.3
pandas==2.0.3
scikit-learn==1.3.0
joblib==1.3.2
```

### Installing Dependencies

```bash
# Install all dependencies
pip install -r requirements.txt

# Verify installed packages
pip list

# Freeze current environment (update requirements.txt)
pip freeze > requirements.txt
```

---

## 4. Database Initialization

SmartEV Vision uses **SQLite** — a serverless, file-based database that requires no separate installation.

### Automatic Initialization

The database is initialized automatically when you run:

```bash
python -c "from models.database import init_db; init_db()"
```

This creates the SQLite database file at `instance/smartev.db` with the following tables:

### Database Schema

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    is_admin BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_seconds INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    calibration_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Gaze data table
CREATE TABLE IF NOT EXISTS gaze_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    gaze_x REAL NOT NULL,
    gaze_y REAL NOT NULL,
    pupil_diameter REAL,
    confidence REAL,
    fixation_type VARCHAR(20),
    timestamp_ms INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Vehicle views table
CREATE TABLE IF NOT EXISTS vehicle_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    vehicle_part VARCHAR(50),
    vehicle_color VARCHAR(30),
    rotation_x REAL,
    rotation_y REAL,
    zoom_level REAL,
    dwell_time_ms INTEGER,
    timestamp_ms INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER UNIQUE NOT NULL,
    purchase_probability REAL,
    interest_level VARCHAR(20),
    preferred_feature VARCHAR(50),
    preferred_view VARCHAR(30),
    confidence_score REAL,
    feature_importances TEXT,
    model_version VARCHAR(20),
    predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

### Database Location

| Environment | Default Path |
|------------|-------------|
| Development | `./instance/smartev.db` |
| Production | Set via `DATABASE_URI` environment variable |
| Docker | `/app/data/smartev.db` (mounted volume) |

### Database Management Commands

```bash
# View database tables (requires sqlite3)
sqlite3 instance/smartev.db ".tables"

# View table schema
sqlite3 instance/smartev.db ".schema users"

# Export data as CSV
sqlite3 -header -csv instance/smartev.db "SELECT * FROM users;" > users.csv

# Backup database
cp instance/smartev.db instance/smartev_backup_$(date +%Y%m%d).db

# Reset database (delete and recreate)
rm instance/smartev.db
python -c "from models.database import init_db; init_db()"
```

---

## 5. Running the Application

### Development Mode

```bash
# Activate virtual environment first
python app.py
```

The application starts on `http://localhost:5000` with debug mode enabled.

### Configuration Options

```bash
# Custom port
python app.py --port 8080

# Custom host (allow external access)
python app.py --host 0.0.0.0

# Disable debug mode
python app.py --no-debug
```

### Verifying the Application

After starting, verify these endpoints:

| URL | Expected Response |
|-----|------------------|
| `http://localhost:5000/` | Landing page HTML |
| `http://localhost:5000/api/health` | `{"status": "ok"}` |
| `http://localhost:5000/showroom` | 3D showroom page |

---

## 6. Environment Variables

Create a `.env` file in the project root for configuration:

```env
# Flask Configuration
FLASK_APP=app.py
FLASK_ENV=development
FLASK_DEBUG=1
SECRET_KEY=your-secret-key-change-in-production

# Server Configuration
HOST=127.0.0.1
PORT=5000

# Database Configuration
DATABASE_URI=sqlite:///instance/smartev.db

# ML Model Configuration
ML_MODEL_PATH=services/models/rf_model.pkl
ML_RETRAIN_THRESHOLD=100

# Eye Tracking Configuration
GAZE_BATCH_SIZE=50
GAZE_UPLOAD_INTERVAL_MS=100
CALIBRATION_POINTS=9

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
```

### Loading Environment Variables

```python
# In app.py or config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    DATABASE_URI = os.getenv('DATABASE_URI', 'sqlite:///instance/smartev.db')
    DEBUG = os.getenv('FLASK_DEBUG', '0') == '1'
```

---

## 7. Production Deployment with Waitress (Windows)

**Waitress** is a production-quality WSGI server that runs on Windows (unlike Gunicorn).

### Installation

```bash
pip install waitress
```

### Running with Waitress

```bash
# Basic usage
waitress-serve --port=5000 app:app

# With configuration
waitress-serve --host=0.0.0.0 --port=5000 --threads=4 app:app

# With logging
waitress-serve --host=0.0.0.0 --port=5000 --threads=4 --channel-timeout=120 app:app
```

### Running as a Windows Service

```powershell
# Install NSSM (Non-Sucking Service Manager)
# Download from https://nssm.cc/

# Install as Windows service
nssm install SmartEVVision "C:\path\to\venv\Scripts\waitress-serve.exe" "--host=0.0.0.0 --port=5000 app:app"

# Start the service
nssm start SmartEVVision

# Check status
nssm status SmartEVVision

# Stop the service
nssm stop SmartEVVision
```

---

## 8. Production Deployment with Gunicorn (Linux/macOS)

**Gunicorn** is the standard Python WSGI HTTP server for Unix systems.

### Installation

```bash
pip install gunicorn
```

### Running with Gunicorn

```bash
# Basic usage
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# With configuration file
gunicorn -c gunicorn.conf.py app:app
```

### Gunicorn Configuration File (gunicorn.conf.py)

```python
# gunicorn.conf.py
import multiprocessing

# Server socket
bind = "0.0.0.0:5000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 2

# Logging
accesslog = "logs/access.log"
errorlog = "logs/error.log"
loglevel = "info"

# Process naming
proc_name = "smartev-vision"

# Security
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190
```

### Systemd Service (Linux)

```ini
# /etc/systemd/system/smartev-vision.service
[Unit]
Description=SmartEV Vision Web Application
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/smartev-vision
Environment="PATH=/opt/smartev-vision/venv/bin"
ExecStart=/opt/smartev-vision/venv/bin/gunicorn -c gunicorn.conf.py app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable smartev-vision
sudo systemctl start smartev-vision
sudo systemctl status smartev-vision
```

---

## 9. Docker Deployment (Optional)

### Dockerfile

```dockerfile
# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_ENV=production

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data /app/logs

# Initialize database
RUN python -c "from models.database import init_db; init_db()"

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Run with Gunicorn
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--timeout", "120", "app:app"]
```

### docker-compose.yml

```yaml
version: "3.8"

services:
  smartev-vision:
    build: .
    container_name: smartev-vision
    ports:
      - "5000:5000"
    volumes:
      - ./data:/app/data          # Persist SQLite database
      - ./logs:/app/logs          # Persist logs
    environment:
      - FLASK_ENV=production
      - SECRET_KEY=${SECRET_KEY:-change-me-in-production}
      - DATABASE_URI=sqlite:///data/smartev.db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Docker Commands

```bash
# Build the image
docker build -t smartev-vision .

# Run the container
docker run -d -p 5000:5000 --name smartev smartev-vision

# View logs
docker logs -f smartev

# Stop the container
docker stop smartev

# Using docker-compose
docker-compose up -d
docker-compose logs -f
docker-compose down
```

---

## 10. Reverse Proxy with Nginx

For production deployments, place Nginx in front of the application server.

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/smartev-vision
server {
    listen 80;
    server_name smartev.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name smartev.yourdomain.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/smartev.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/smartev.yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Static files
    location /static/ {
        alias /opt/smartev-vision/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Application
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (for future multi-user feature)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeout for eye tracking data uploads
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # Gaze data endpoint - higher body size limit
    location /api/gaze/batch {
        proxy_pass http://127.0.0.1:5000;
        client_max_body_size 5M;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/smartev-vision /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 11. HTTPS Configuration

### Let's Encrypt (Free SSL)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d smartev.yourdomain.com

# Auto-renewal (crontab)
sudo crontab -e
# Add: 0 0 1 * * certbot renew --quiet
```

### Self-Signed Certificate (Development)

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Use in Flask (development only)
# app.run(ssl_context=('cert.pem', 'key.pem'))
```

> **Note:** HTTPS is **required** for webcam access (`navigator.mediaDevices.getUserMedia()`) on most browsers when not on localhost. Always deploy with HTTPS in production.

---

## 12. Common Deployment Issues

### Issue 1: "ModuleNotFoundError: No module named 'flask'"

**Cause:** Virtual environment not activated or dependencies not installed.

```bash
# Solution
source venv/bin/activate   # or .\venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
```

### Issue 2: "Address already in use" (Port 5000)

**Cause:** Another process is using port 5000 (common on macOS where AirPlay uses 5000).

```bash
# Find the process
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :5000
kill -9 <PID>

# Or use a different port
python app.py --port 8080
```

### Issue 3: SQLite "database is locked"

**Cause:** Multiple processes trying to write to SQLite simultaneously.

```bash
# Solution 1: Enable WAL mode
sqlite3 instance/smartev.db "PRAGMA journal_mode=WAL;"

# Solution 2: For production with concurrent users, migrate to PostgreSQL
pip install psycopg2-binary
# Update DATABASE_URI=postgresql://user:pass@localhost/smartev
```

### Issue 4: Webcam not accessible (HTTPS required)

**Cause:** Browsers require HTTPS (or localhost) for `getUserMedia()`.

```bash
# Solution for development: use localhost (not IP address)
# Open http://localhost:5000 (NOT http://192.168.1.x:5000)

# Solution for production: enable HTTPS (see Section 11)
```

### Issue 5: Three.js models not loading (CORS)

**Cause:** 3D model files served without proper CORS headers.

```python
# Solution: Add CORS headers in Flask
from flask_cors import CORS
CORS(app)

# Or serve static files through Nginx with proper headers
```

### Issue 6: MediaPipe not loading in browser

**Cause:** Content Security Policy (CSP) blocking CDN scripts.

```python
# Solution: Update CSP headers to allow MediaPipe CDN
@app.after_request
def add_csp_header(response):
    response.headers['Content-Security-Policy'] = (
        "script-src 'self' https://cdn.jsdelivr.net https://unpkg.com;"
    )
    return response
```

### Issue 7: Docker container exits immediately

**Cause:** Database initialization fails inside container.

```bash
# Solution: Check logs
docker logs smartev-vision

# Ensure data directory exists and is writable
docker exec -it smartev-vision ls -la /app/data/
```

### Issue 8: High memory usage in production

**Cause:** ML model loaded into memory for each worker process.

```python
# Solution: Load model once and share across requests
# In ml_service.py
import joblib

_model = None

def get_model():
    global _model
    if _model is None:
        _model = joblib.load('services/models/rf_model.pkl')
    return _model
```

### Issue 9: Slow gaze data uploads

**Cause:** Individual HTTP requests for each gaze point.

```javascript
// Solution: Use batch uploads (already implemented)
// Collect gaze points in buffer, send every 100ms
const gazeBuffer = [];
setInterval(() => {
    if (gazeBuffer.length > 0) {
        fetch('/api/gaze/batch', {
            method: 'POST',
            body: JSON.stringify(gazeBuffer)
        });
        gazeBuffer.length = 0;
    }
}, 100);
```

### Issue 10: Permission denied on Linux

```bash
# Ensure proper file ownership
sudo chown -R www-data:www-data /opt/smartev-vision
sudo chmod -R 755 /opt/smartev-vision
sudo chmod -R 775 /opt/smartev-vision/instance  # Database directory needs write access
sudo chmod -R 775 /opt/smartev-vision/logs
```

---

## Deployment Checklist

- [ ] Python 3.9+ installed
- [ ] Virtual environment created and activated
- [ ] All dependencies installed (`pip install -r requirements.txt`)
- [ ] Database initialized
- [ ] Environment variables configured (`.env` file)
- [ ] `SECRET_KEY` changed from default
- [ ] `FLASK_DEBUG` set to `0` for production
- [ ] WSGI server installed (Waitress/Gunicorn)
- [ ] HTTPS configured (required for webcam access)
- [ ] Static files served efficiently (Nginx or CDN)
- [ ] Logs directory exists and is writable
- [ ] Database backups scheduled
- [ ] Health check endpoint responding
- [ ] Firewall configured (allow port 80/443)
- [ ] Application tested with multiple browsers

---

*For questions or deployment support, contact the SmartEV Vision development team.*
]]>

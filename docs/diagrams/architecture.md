<![CDATA[# SmartEV Vision — System Architecture Diagrams

> All diagrams are rendered using **Mermaid** syntax. View them in any Mermaid-compatible markdown renderer (GitHub, VS Code with Mermaid extension, etc.)

---

## Table of Contents

1. [High-Level Architecture Diagram](#1-high-level-architecture-diagram)
2. [Data Flow Diagram — Level 0](#2-data-flow-diagram--level-0)
3. [Data Flow Diagram — Level 1](#3-data-flow-diagram--level-1)
4. [Use Case Diagram](#4-use-case-diagram)
5. [Component Diagram](#5-component-diagram)
6. [Entity-Relationship Diagram](#6-entity-relationship-diagram)
7. [Sequence Diagram](#7-sequence-diagram)

---

## 1. High-Level Architecture Diagram

This diagram shows the overall system architecture — from the browser-based frontend through the Flask API to the backend services and database.

```mermaid
graph TB
    subgraph "Client Browser"
        A["Three.js<br/>3D Showroom Engine"]
        B["MediaPipe Face Mesh<br/>Eye Tracking Module"]
        C["Chart.js<br/>Dashboard Renderer"]
        D["Canvas API<br/>Heatmap Renderer"]
    end

    subgraph "Flask Backend API"
        E["Route Controller<br/>/api/*"]
        F["Authentication<br/>Middleware"]
        G["Session<br/>Manager"]
    end

    subgraph "Service Layer"
        H["Eye Tracking<br/>Service"]
        I["Analytics<br/>Service"]
        J["Heatmap<br/>Service"]
        K["ML Engine<br/>Service"]
    end

    subgraph "Data Layer"
        L[("SQLite<br/>Database")]
        M["ML Model<br/>(.pkl file)"]
    end

    A -- "User Interactions<br/>(rotation, zoom, click)" --> E
    B -- "Gaze Coordinates<br/>(x, y, timestamp)" --> E
    E --> F
    F --> G

    G --> H
    G --> I
    G --> J
    G --> K

    H --> L
    I --> L
    J --> L
    K --> L
    K --> M

    I -- "Analytics JSON" --> C
    J -- "Heatmap Data" --> D
    K -- "Predictions" --> C

    style A fill:#4FC3F7,stroke:#0277BD,color:#000
    style B fill:#FF8A65,stroke:#D84315,color:#000
    style C fill:#81C784,stroke:#2E7D32,color:#000
    style D fill:#FFD54F,stroke:#F9A825,color:#000
    style E fill:#CE93D8,stroke:#6A1B9A,color:#000
    style L fill:#90A4AE,stroke:#37474F,color:#000
    style M fill:#A1887F,stroke:#4E342E,color:#000
```

---

## 2. Data Flow Diagram — Level 0

The context-level DFD shows the system as a single process with its external entities and data flows.

```mermaid
graph LR
    U(("👤 User"))
    S["SmartEV Vision<br/>System"]
    R(("📊 Analytics<br/>Report"))

    U -- "Registration Data<br/>Gaze Data<br/>User Interactions" --> S
    S -- "3D Showroom View<br/>Analytics Dashboard<br/>Heatmaps<br/>ML Predictions" --> U
    S -- "Session Reports<br/>Exported CSV Data" --> R

    style S fill:#E1BEE7,stroke:#6A1B9A,color:#000
    style U fill:#BBDEFB,stroke:#1565C0,color:#000
    style R fill:#C8E6C9,stroke:#2E7D32,color:#000
```

---

## 3. Data Flow Diagram — Level 1

The Level 1 DFD decomposes the system into its major sub-processes and internal data stores.

```mermaid
graph TB
    U(("👤 User"))
    A(("👨‍💼 Admin"))

    P1["1.0<br/>User Authentication"]
    P2["2.0<br/>Virtual Showroom"]
    P3["3.0<br/>Eye Tracker"]
    P4["4.0<br/>Gaze Processor"]
    P5["5.0<br/>Analytics Engine"]
    P6["6.0<br/>Heatmap Generator"]
    P7["7.0<br/>ML Engine"]
    P8["8.0<br/>Dashboard"]

    D1[("D1: Users")]
    D2[("D2: Sessions")]
    D3[("D3: Gaze Data")]
    D4[("D4: Vehicle Views")]
    D5[("D5: Predictions")]

    U -- "Credentials" --> P1
    P1 -- "User Record" --> D1
    P1 -- "Auth Token" --> U

    U -- "Navigation Input" --> P2
    P2 -- "View Changes" --> D4
    P2 -- "3D Scene" --> U

    U -- "Webcam Feed" --> P3
    P3 -- "Iris Coordinates" --> P4
    P4 -- "Gaze Points" --> D3
    P4 -- "Session Data" --> D2

    D3 -- "Gaze Records" --> P5
    D4 -- "View Records" --> P5
    P5 -- "Aggregated Metrics" --> P8
    P8 -- "Charts & Stats" --> U

    D3 -- "Gaze Points" --> P6
    P6 -- "Heatmap Image" --> P8

    D3 -- "Feature Vector" --> P7
    D4 -- "View Features" --> P7
    P7 -- "Predictions" --> D5
    D5 -- "Results" --> P8

    A -- "Admin Commands" --> P7
    P7 -- "Model Status" --> A
    A -- "Export Request" --> P5
    P5 -- "CSV Export" --> A

    style P1 fill:#FFCDD2,stroke:#C62828,color:#000
    style P2 fill:#B3E5FC,stroke:#0277BD,color:#000
    style P3 fill:#FFE0B2,stroke:#E65100,color:#000
    style P4 fill:#FFCCBC,stroke:#BF360C,color:#000
    style P5 fill:#C8E6C9,stroke:#2E7D32,color:#000
    style P6 fill:#FFF9C4,stroke:#F57F17,color:#000
    style P7 fill:#D1C4E9,stroke:#4527A0,color:#000
    style P8 fill:#B2DFDB,stroke:#00695C,color:#000
```

---

## 4. Use Case Diagram

Shows the interactions between actors (User, Admin) and system use cases.

```mermaid
graph TB
    subgraph "SmartEV Vision System"
        UC1["Register Account"]
        UC2["Login / Logout"]
        UC3["Enter Virtual Showroom"]
        UC4["Calibrate Eye Tracker"]
        UC5["Explore EV Models"]
        UC6["Change Vehicle Color"]
        UC7["View Analytics Dashboard"]
        UC8["View Attention Heatmap"]
        UC9["View ML Predictions"]
        UC10["View Session History"]
        UC11["Manage Users"]
        UC12["Train ML Model"]
        UC13["Export Data"]
        UC14["View System Statistics"]
    end

    User(("👤 User"))
    Admin(("👨‍💼 Admin"))

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9
    User --> UC10

    Admin --> UC2
    Admin --> UC11
    Admin --> UC12
    Admin --> UC13
    Admin --> UC14

    UC3 -. "<<includes>>" .-> UC4
    UC5 -. "<<includes>>" .-> UC6
    UC7 -. "<<extends>>" .-> UC8
    UC7 -. "<<extends>>" .-> UC9

    style User fill:#BBDEFB,stroke:#1565C0,color:#000
    style Admin fill:#FFCDD2,stroke:#C62828,color:#000

    style UC1 fill:#E8F5E9,stroke:#388E3C,color:#000
    style UC2 fill:#E8F5E9,stroke:#388E3C,color:#000
    style UC3 fill:#E3F2FD,stroke:#1976D2,color:#000
    style UC4 fill:#E3F2FD,stroke:#1976D2,color:#000
    style UC5 fill:#E3F2FD,stroke:#1976D2,color:#000
    style UC6 fill:#E3F2FD,stroke:#1976D2,color:#000
    style UC7 fill:#FFF3E0,stroke:#E65100,color:#000
    style UC8 fill:#FFF3E0,stroke:#E65100,color:#000
    style UC9 fill:#FFF3E0,stroke:#E65100,color:#000
    style UC10 fill:#FFF3E0,stroke:#E65100,color:#000
    style UC11 fill:#FCE4EC,stroke:#C62828,color:#000
    style UC12 fill:#FCE4EC,stroke:#C62828,color:#000
    style UC13 fill:#FCE4EC,stroke:#C62828,color:#000
    style UC14 fill:#FCE4EC,stroke:#C62828,color:#000
```

---

## 5. Component Diagram

Shows all software modules/components and their inter-dependencies.

```mermaid
graph TB
    subgraph "Presentation Layer"
        C1["index.html<br/>Landing Page"]
        C2["showroom.html<br/>+ showroom.js"]
        C3["calibration.html<br/>+ calibration.js"]
        C4["dashboard.html<br/>+ dashboard.js"]
        C5["heatmap.html<br/>+ heatmap.js"]
        C6["predictions.html"]
        C7["admin.html"]
    end

    subgraph "3D Engine"
        C8["Three.js Core"]
        C9["OrbitControls"]
        C10["GLTFLoader"]
        C11["Scene Manager"]
    end

    subgraph "Eye Tracking Engine"
        C12["MediaPipe Face Mesh"]
        C13["Iris Detector"]
        C14["Gaze Estimator"]
        C15["Calibration Module"]
    end

    subgraph "Flask Application Layer"
        C16["app.py<br/>Route Controller"]
        C17["Auth Module"]
        C18["Session Controller"]
    end

    subgraph "Service Layer"
        C19["EyeTrackingService"]
        C20["AnalyticsService"]
        C21["HeatmapService"]
        C22["MLService"]
    end

    subgraph "Data Access Layer"
        C23["database.py<br/>DB Manager"]
        C24["User Model"]
        C25["Session Model"]
    end

    subgraph "External Libraries"
        C26["scikit-learn"]
        C27["NumPy"]
        C28["Pandas"]
        C29["Chart.js"]
    end

    C2 --> C8
    C8 --> C9
    C8 --> C10
    C8 --> C11

    C2 --> C12
    C12 --> C13
    C13 --> C14
    C14 --> C15

    C2 --> C16
    C3 --> C16
    C4 --> C16
    C5 --> C16
    C7 --> C16

    C16 --> C17
    C16 --> C18
    C16 --> C19
    C16 --> C20
    C16 --> C21
    C16 --> C22

    C19 --> C23
    C20 --> C23
    C21 --> C23
    C22 --> C23
    C22 --> C26

    C23 --> C24
    C23 --> C25

    C20 --> C27
    C20 --> C28
    C4 --> C29

    style C8 fill:#4FC3F7,stroke:#0277BD,color:#000
    style C12 fill:#FF8A65,stroke:#D84315,color:#000
    style C16 fill:#CE93D8,stroke:#6A1B9A,color:#000
    style C22 fill:#81C784,stroke:#2E7D32,color:#000
    style C23 fill:#90A4AE,stroke:#37474F,color:#000
```

---

## 6. Entity-Relationship Diagram

Shows the five database tables and their relationships.

```mermaid
erDiagram
    USERS {
        int id PK "Primary Key, Auto-increment"
        varchar username UK "Unique, Not Null"
        varchar email UK "Unique, Not Null"
        varchar password_hash "Not Null (Werkzeug hashed)"
        boolean is_admin "Default: false"
        datetime created_at "Default: CURRENT_TIMESTAMP"
        datetime last_login "Nullable"
    }

    SESSIONS {
        int id PK "Primary Key, Auto-increment"
        int user_id FK "Foreign Key -> users.id"
        datetime start_time "Not Null"
        datetime end_time "Nullable"
        int duration_seconds "Computed on end"
        varchar status "active / completed / abandoned"
        text calibration_data "JSON: calibration points"
        datetime created_at "Default: CURRENT_TIMESTAMP"
    }

    GAZE_DATA {
        int id PK "Primary Key, Auto-increment"
        int session_id FK "Foreign Key -> sessions.id"
        float gaze_x "Screen X coordinate (0-1 normalized)"
        float gaze_y "Screen Y coordinate (0-1 normalized)"
        float pupil_diameter "Pupil size in pixels"
        float confidence "Detection confidence (0-1)"
        varchar fixation_type "fixation / saccade / blink"
        int timestamp_ms "Milliseconds since session start"
        datetime created_at "Default: CURRENT_TIMESTAMP"
    }

    VEHICLE_VIEWS {
        int id PK "Primary Key, Auto-increment"
        int session_id FK "Foreign Key -> sessions.id"
        varchar vehicle_part "front / rear / side / interior / wheel"
        varchar vehicle_color "Current color selection"
        float rotation_x "Camera rotation X"
        float rotation_y "Camera rotation Y"
        float zoom_level "Camera zoom distance"
        int dwell_time_ms "Time spent on this view"
        int timestamp_ms "Milliseconds since session start"
    }

    PREDICTIONS {
        int id PK "Primary Key, Auto-increment"
        int session_id FK "Foreign Key -> sessions.id, Unique"
        float purchase_probability "0.0 to 1.0"
        varchar interest_level "high / medium / low"
        varchar preferred_feature "design / color / interior / tech"
        varchar preferred_view "front / rear / side / interior"
        float confidence_score "Model confidence (0-1)"
        text feature_importances "JSON: feature importance values"
        varchar model_version "e.g., rf_v1.2"
        datetime predicted_at "Default: CURRENT_TIMESTAMP"
    }

    USERS ||--o{ SESSIONS : "has many"
    SESSIONS ||--o{ GAZE_DATA : "contains"
    SESSIONS ||--o{ VEHICLE_VIEWS : "records"
    SESSIONS ||--o| PREDICTIONS : "generates"
```

---

## 7. Sequence Diagram

Shows the typical end-to-end user flow from registration through to viewing results.

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant ThreeJS as Three.js Engine
    participant MediaPipe as MediaPipe Face Mesh
    participant Flask as Flask API
    participant Services as Service Layer
    participant DB as SQLite DB
    participant ML as ML Engine

    Note over User, ML: Phase 1 — Registration & Authentication
    User->>Browser: Navigate to /register
    Browser->>Flask: POST /api/register {username, email, password}
    Flask->>DB: INSERT INTO users
    DB-->>Flask: User created (id)
    Flask-->>Browser: 201 Created + redirect
    Browser-->>User: Show login page

    User->>Browser: Enter credentials
    Browser->>Flask: POST /api/login {username, password}
    Flask->>DB: SELECT user WHERE username = ?
    DB-->>Flask: User record
    Flask->>Flask: Verify password hash
    Flask-->>Browser: 200 OK + session cookie
    Browser-->>User: Redirect to showroom

    Note over User, ML: Phase 2 — Eye Tracking Calibration
    User->>Browser: Start calibration
    Browser->>Flask: POST /api/session/start
    Flask->>DB: INSERT INTO sessions
    DB-->>Flask: Session ID
    Flask-->>Browser: {session_id}

    loop 9 Calibration Points
        Browser->>User: Display calibration dot
        User->>Browser: Look at dot
        Browser->>MediaPipe: Process webcam frame
        MediaPipe-->>Browser: Iris landmarks (468 points)
        Browser->>Browser: Map iris position to screen coords
        Browser->>Flask: POST /api/calibration {point, iris_data}
    end
    Flask->>Services: Compute calibration matrix
    Services-->>Flask: Calibration coefficients
    Flask->>DB: UPDATE session SET calibration_data
    Flask-->>Browser: Calibration complete

    Note over User, ML: Phase 3 — Virtual Showroom Exploration
    Browser->>ThreeJS: Initialize 3D scene
    ThreeJS->>ThreeJS: Load EV model, lights, environment

    loop Every Frame (60fps)
        User->>Browser: Mouse interaction (rotate/zoom/pan)
        Browser->>ThreeJS: Update camera position
        ThreeJS-->>Browser: Rendered frame

        Browser->>MediaPipe: Process webcam frame
        MediaPipe-->>Browser: Iris coordinates
        Browser->>Browser: Apply calibration → screen gaze point
    end

    loop Every 100ms (Batch Upload)
        Browser->>Flask: POST /api/gaze/batch [{x, y, timestamp, confidence}...]
        Flask->>Services: Process gaze batch
        Services->>DB: INSERT INTO gaze_data (batch)

        Browser->>Flask: POST /api/gaze {vehicle_part, color, rotation, zoom}
        Flask->>Services: Record vehicle view
        Services->>DB: INSERT INTO vehicle_views
    end

    Note over User, ML: Phase 4 — Session End & Analysis
    User->>Browser: Click "End Session"
    Browser->>Flask: POST /api/session/end {session_id}
    Flask->>DB: UPDATE session SET end_time, duration

    Flask->>Services: Run analytics pipeline
    Services->>DB: SELECT gaze_data WHERE session_id = ?
    DB-->>Services: All gaze records
    Services->>Services: Compute dwell times, fixation clusters, attention zones
    Services-->>Flask: Analytics results

    Flask->>Services: Generate heatmap
    Services->>DB: SELECT gaze points
    Services->>Services: Apply Gaussian smoothing, create heatmap grid
    Services-->>Flask: Heatmap data (2D intensity array)

    Flask->>ML: Generate predictions
    ML->>DB: SELECT features for session
    ML->>ML: Extract feature vector (18 features)
    ML->>ML: Random Forest predict + predict_proba
    ML->>DB: INSERT INTO predictions
    ML-->>Flask: Prediction results

    Flask-->>Browser: Redirect to dashboard

    Note over User, ML: Phase 5 — Results Visualization
    User->>Browser: View dashboard
    Browser->>Flask: GET /api/analytics/{session_id}
    Flask->>DB: Query analytics
    DB-->>Flask: Analytics data
    Flask-->>Browser: JSON response
    Browser->>Browser: Render Chart.js graphs

    User->>Browser: View heatmap
    Browser->>Flask: GET /api/heatmap/{session_id}
    Flask-->>Browser: Heatmap intensity data
    Browser->>Browser: Render Canvas heatmap overlay

    User->>Browser: View predictions
    Browser->>Flask: GET /api/predictions/{session_id}
    Flask-->>Browser: {purchase_prob, interest, preferred_feature}
    Browser-->>User: Display prediction cards with confidence
```

---

## Diagram Legend

| Symbol | Meaning |
|--------|---------|
| Rectangle | Process / Module / Component |
| Cylinder | Data Store (Database) |
| Circle | External Entity (Actor) |
| Solid arrow | Data flow / Function call |
| Dashed arrow | Return / Response |
| Diamond (ER) | Relationship |

---

*All diagrams created with [Mermaid](https://mermaid.js.org/) — rendered natively in GitHub, VS Code, and most modern Markdown viewers.*
]]>

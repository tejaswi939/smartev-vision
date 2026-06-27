"""
=============================================================================
SmartEV Vision — SQLAlchemy Database Models
=============================================================================
Defines the five core tables that support user management, VR session
tracking, eye-gaze data storage, per-component view analytics, and
ML-based preference predictions.

Tables
------
User            — registered participants / testers
Session         — individual VR viewing sessions
GazeData        — raw eye-tracking samples (timestamped x/y coordinates)
VehicleView     — aggregated component-level view statistics
Prediction      — ML engine output (preferred EV model & confidence)
=============================================================================
"""

from datetime import datetime, timezone
from app import db


class User(db.Model):
    """
    A participant who views EV models in the VR showroom.

    Columns
    -------
    id         : int        — primary key, auto-incremented
    name       : str        — full name (required)
    email      : str        — unique email address (required)
    age        : int        — participant age (optional)
    gender     : str        — self-reported gender (optional)
    created_at : datetime   — UTC timestamp of registration
    """

    __tablename__ = "users"

    id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name: str = db.Column(db.String(120), nullable=False)
    email: str = db.Column(db.String(120), unique=True, nullable=False)
    age: int = db.Column(db.Integer, nullable=True)
    gender: str = db.Column(db.String(20), nullable=True)
    created_at: datetime = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    sessions = db.relationship("Session", backref="user", lazy=True)

    def to_dict(self) -> dict:
        """Serialise the user record to a JSON-safe dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "age": self.age,
            "gender": self.gender,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Session(db.Model):
    """
    A single VR viewing session where a user examines an EV model.

    Columns
    -------
    id               : int       — primary key
    user_id          : int       — FK → users.id
    ev_model         : str       — name/code of the EV model viewed
    start_time       : datetime  — UTC session start
    end_time         : datetime  — UTC session end (NULL while active)
    duration         : float     — computed session length in seconds
    engagement_score : float     — 0–100 composite engagement metric
    """

    __tablename__ = "sessions"

    id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id: int = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    ev_model: str = db.Column(db.String(100), nullable=False)
    start_time: datetime = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )
    end_time: datetime = db.Column(db.DateTime, nullable=True)
    duration: float = db.Column(db.Float, nullable=True)
    engagement_score: float = db.Column(db.Float, nullable=True)

    # Relationships
    gaze_data = db.relationship("GazeData", backref="session", lazy=True)
    vehicle_views = db.relationship("VehicleView", backref="session", lazy=True)
    predictions = db.relationship("Prediction", backref="session", lazy=True)

    def to_dict(self) -> dict:
        """Serialise the session record to a JSON-safe dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "ev_model": self.ev_model,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration": self.duration,
            "engagement_score": self.engagement_score,
        }


class GazeData(db.Model):
    """
    A single eye-tracking sample captured during a session.

    Columns
    -------
    id                : int    — primary key
    session_id        : int    — FK → sessions.id
    timestamp         : float  — relative timestamp (seconds since session start)
    x                 : float  — horizontal gaze coordinate (normalised 0-1 or px)
    y                 : float  — vertical gaze coordinate (normalised 0-1 or px)
    area_label        : str    — AOI label assigned by the eye_tracking service
    fixation_duration : float  — duration of the fixation this sample belongs to (ms)
    """

    __tablename__ = "gaze_data"

    id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    session_id: int = db.Column(db.Integer, db.ForeignKey("sessions.id"), nullable=False)
    timestamp: float = db.Column(db.Float, nullable=False)
    x: float = db.Column(db.Float, nullable=False)
    y: float = db.Column(db.Float, nullable=False)
    area_label: str = db.Column(db.String(50), nullable=True)
    fixation_duration: float = db.Column(db.Float, nullable=True)

    def to_dict(self) -> dict:
        """Serialise the gaze sample to a JSON-safe dictionary."""
        return {
            "id": self.id,
            "session_id": self.session_id,
            "timestamp": self.timestamp,
            "x": self.x,
            "y": self.y,
            "area_label": self.area_label,
            "fixation_duration": self.fixation_duration,
        }


class VehicleView(db.Model):
    """
    Aggregated viewing statistics for a specific vehicle component within
    a session (e.g. how long the user looked at the 'Wheels').

    Columns
    -------
    id             : int    — primary key
    session_id     : int    — FK → sessions.id
    component      : str    — AOI / component name
    view_count     : int    — number of distinct fixations on this component
    total_duration : float  — total viewing time in seconds
    revisits       : int    — number of times the user returned to this AOI
    """

    __tablename__ = "vehicle_views"

    id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    session_id: int = db.Column(db.Integer, db.ForeignKey("sessions.id"), nullable=False)
    component: str = db.Column(db.String(50), nullable=False)
    view_count: int = db.Column(db.Integer, default=0)
    total_duration: float = db.Column(db.Float, default=0.0)
    revisits: int = db.Column(db.Integer, default=0)

    def to_dict(self) -> dict:
        """Serialise the vehicle-view record to a JSON-safe dictionary."""
        return {
            "id": self.id,
            "session_id": self.session_id,
            "component": self.component,
            "view_count": self.view_count,
            "total_duration": self.total_duration,
            "revisits": self.revisits,
        }


class Prediction(db.Model):
    """
    Output of the ML prediction engine for a session.

    Columns
    -------
    id                    : int    — primary key
    session_id            : int    — FK → sessions.id
    preferred_model       : str    — predicted favourite EV model
    preference_category   : str    — e.g. "Design", "Performance", "Interior"
    confidence            : float  — prediction confidence (0-1)
    created_at            : datetime — UTC timestamp of prediction
    """

    __tablename__ = "predictions"

    id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    session_id: int = db.Column(db.Integer, db.ForeignKey("sessions.id"), nullable=False)
    preferred_model: str = db.Column(db.String(100), nullable=True)
    preference_category: str = db.Column(db.String(100), nullable=True)
    confidence: float = db.Column(db.Float, nullable=True)
    created_at: datetime = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self) -> dict:
        """Serialise the prediction record to a JSON-safe dictionary."""
        return {
            "id": self.id,
            "session_id": self.session_id,
            "preferred_model": self.preferred_model,
            "preference_category": self.preference_category,
            "confidence": self.confidence,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

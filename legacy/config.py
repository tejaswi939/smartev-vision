"""
=============================================================================
SmartEV Vision — Application Configuration
=============================================================================
Centralised configuration for the Flask application.
Supports SQLite as the default database, with a secret key for session
management and debug/testing flags.
=============================================================================
"""

import os

# ---------------------------------------------------------------------------
# Base directory — resolves to the project root regardless of the working
# directory from which the app is launched.
# ---------------------------------------------------------------------------
BASE_DIR: str = os.path.abspath(os.path.dirname(__file__))


class Config:
    """
    Default (production-safe) configuration.

    Attributes
    ----------
    SECRET_KEY : str
        Used by Flask for session signing and CSRF protection.
        In production this MUST be overridden via an environment variable.
    SQLALCHEMY_DATABASE_URI : str
        SQLite connection string.  The database file is stored inside the
        project root as ``smartev_vision.db``.
    SQLALCHEMY_TRACK_MODIFICATIONS : bool
        Disabled to save memory — we don't need the Flask-SQLAlchemy event
        system.
    DEBUG : bool
        Defaults to False; override via the ``FLASK_DEBUG`` env-var.
    ML_MODEL_PATH : str
        Filesystem path to the trained Random-Forest model (pickle).
    """

    SECRET_KEY: str = os.environ.get("SECRET_KEY", "smartev-vision-secret-key-change-in-production")

    SQLALCHEMY_DATABASE_URI: str = os.environ.get(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(BASE_DIR, 'data', 'smartev.db')}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False

    DEBUG: bool = os.environ.get("FLASK_DEBUG", "False").lower() in ("true", "1", "yes")

    # Path to the serialised ML model used by the prediction service
    ML_MODEL_PATH: str = os.path.join(BASE_DIR, "ml", "model.pkl")

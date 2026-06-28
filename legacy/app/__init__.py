"""
=============================================================================
SmartEV Vision — Application Factory & Extension Initialisation
=============================================================================
Uses the *application factory* pattern recommended by Flask so that the app
can be created with different configurations (testing, production, etc.).

Responsibilities:
    1. Instantiate Flask and load ``Config``.
    2. Initialise Flask-SQLAlchemy (``db``).
    3. Enable CORS for cross-origin API calls from the VR front-end.
    4. Register all Blueprints (page routes, API, auth, dashboard).
    5. Create database tables on first run.
=============================================================================
"""

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# ---------------------------------------------------------------------------
# Shared SQLAlchemy instance — imported by models and route modules.
# ---------------------------------------------------------------------------
db = SQLAlchemy()


def create_app() -> Flask:
    """
    Application factory.

    Returns
    -------
    Flask
        A fully-configured Flask application instance ready to serve.
    """

    # --- 1. Create the Flask instance ------------------------------------ #
    app = Flask(
        __name__,
        template_folder="templates",   # HTML templates live inside app/templates
        static_folder="static",        # Static assets live inside app/static
    )

    # --- 2. Load configuration ------------------------------------------- #
    from config import Config
    app.config.from_object(Config)

    # --- 3. Initialise extensions ---------------------------------------- #
    db.init_app(app)
    CORS(app)  # Allow all origins by default for development

    # --- 4. Register Blueprints ------------------------------------------ #
    from app.routes import register_blueprints
    register_blueprints(app)

    # --- 5. Create database tables (if they don't exist) ----------------- #
    with app.app_context():
        # Import models so SQLAlchemy is aware of all table definitions
        from app import models  # noqa: F401
        db.create_all()

    app.logger.info("SmartEV Vision backend initialised successfully.")
    return app

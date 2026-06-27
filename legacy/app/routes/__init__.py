"""
=============================================================================
SmartEV Vision — Blueprint Registration
=============================================================================
Central registry for all Flask Blueprints.  Called by the application
factory in ``app/__init__.py``.
=============================================================================
"""

from flask import Flask


def register_blueprints(app: Flask) -> None:
    """
    Import and register every Blueprint with the Flask application.

    Parameters
    ----------
    app : Flask
        The application instance returned by the factory.
    """

    # --- Page / template routes ------------------------------------------ #
    from app.routes.main import main_bp
    app.register_blueprint(main_bp)

    # --- RESTful API routes ---------------------------------------------- #
    from app.routes.api import api_bp
    app.register_blueprint(api_bp, url_prefix="/api")

    # --- Authentication / user management routes ------------------------- #
    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/api/user")

    # --- Dashboard report routes ----------------------------------------- #
    from app.routes.dashboard import dashboard_bp
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")

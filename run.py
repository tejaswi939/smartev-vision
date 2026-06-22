"""
=============================================================================
SmartEV Vision — Application Entry Point
=============================================================================
Creates and launches the Flask application using the factory defined in
``app/__init__.py``.  Run with:

    python run.py

The server binds to 0.0.0.0:5000 by default so it is reachable from VR
headsets on the same local network.
=============================================================================
"""

from app import create_app

# ---------------------------------------------------------------------------
# Create the application instance via the factory
# ---------------------------------------------------------------------------
app = create_app()

if __name__ == "__main__":
    # Host on all interfaces so VR devices on the LAN can connect.
    # Debug mode is controlled by Config.DEBUG (see config.py).
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=app.config.get("DEBUG", False),
    )

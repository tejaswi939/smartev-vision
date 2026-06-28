"""
=============================================================================
SmartEV Vision — Page (Template) Routes
=============================================================================
Serves the HTML pages rendered by Jinja2.  The actual ``*.html`` template
files are created by the front-end agent; this module simply binds URLs to
``render_template`` calls.

Routes
------
/              — Landing / home page
/showroom      — VR showroom view
/calibration   — Eye-tracker calibration screen
/dashboard     — Analytics dashboard
=============================================================================
"""

from flask import Blueprint, render_template, request
from app import db
from app.models import User, Session

# ---------------------------------------------------------------------------
# Blueprint definition
# ---------------------------------------------------------------------------
main_bp = Blueprint(
    "main",
    __name__,
    template_folder="../templates",
    static_folder="../static",
)


# ---------------------------------------------------------------------------
# Page routes
# ---------------------------------------------------------------------------


@main_bp.route("/")
def index():
    """Render the landing / home page."""
    try:
        return render_template("index.html")
    except Exception as e:
        return f"<h1>SmartEV Vision</h1><p>Template not found. Backend is running.</p><p>{e}</p>", 200


@main_bp.route("/showroom")
def showroom():
    """Render the VR showroom page where EV models are displayed."""
    try:
        return render_template("showroom.html")
    except Exception as e:
        return f"<h1>Showroom</h1><p>Template not found.</p><p>{e}</p>", 200


@main_bp.route("/calibration", methods=["GET", "POST"])
def calibration():
    """Render the eye-tracking calibration page and register user if POST."""
    try:
        user_id = "anonymous"
        if request.method == "POST":
            name = request.form.get("name", "").strip()
            email = request.form.get("email", "").strip()
            age_str = request.form.get("age")
            gender = request.form.get("gender")

            if name and email:
                user = User.query.filter_by(email=email).first()
                if not user:
                    user = User(
                        name=name,
                        email=email,
                        age=int(age_str) if age_str else None,
                        gender=gender,
                    )
                    db.session.add(user)
                    db.session.commit()
                user_id = user.id

        return render_template("calibration.html", user_id=user_id)
    except Exception as e:
        return f"<h1>Calibration</h1><p>Template not found.</p><p>{e}</p>", 200


@main_bp.route("/sessions/<int:session_id>/report")
def session_report(session_id: int):
    """Render the session report page."""
    try:
        session = db.session.get(Session, session_id)
        if not session:
            return f"<h1>Session {session_id} not found</h1>", 404

        user = db.session.get(User, session.user_id)
        user_name = user.name if user else "Unknown User"

        # Format duration
        duration_sec = int(session.duration or 0)
        minutes = duration_sec // 60
        seconds = duration_sec % 60
        duration_str = f"{minutes}m {seconds}s" if minutes > 0 else f"{seconds}s"

        # Format date
        date_str = session.start_time.strftime("%b %d, %Y") if session.start_time else "Unknown Date"

        session_data = {
            "id": session.id,
            "user_name": user_name,
            "model_name": session.ev_model,
            "duration": duration_str,
            "date": date_str,
        }

        return render_template("session_report.html", session_data=session_data)
    except Exception as e:
        return f"<h1>Session Report</h1><p>Error rendering report.</p><p>{e}</p>", 200


@main_bp.route("/admin")
def admin():
    """Render the admin panel page."""
    try:
        return render_template("admin.html")
    except Exception as e:
        return f"<h1>Admin</h1><p>Template not found.</p><p>{e}</p>", 200


@main_bp.route("/dashboard")
def dashboard():
    """Render the analytics dashboard page."""
    try:
        return render_template("dashboard.html")
    except Exception as e:
        return f"<h1>Dashboard</h1><p>Template not found.</p><p>{e}</p>", 200

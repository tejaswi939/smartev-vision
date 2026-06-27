"""
=============================================================================
SmartEV Vision — Dashboard Report Routes
=============================================================================
Provides aggregate / global statistics consumed by the analytics dashboard.

Endpoints
---------
GET  /api/dashboard/stats   — Global statistics across all sessions & users
=============================================================================
"""

from flask import Blueprint, jsonify, current_app
from sqlalchemy import func
from app import db
from app.models import Session, User, GazeData, VehicleView, Prediction


# ---------------------------------------------------------------------------
# Blueprint definition
# ---------------------------------------------------------------------------
dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/stats", methods=["GET"])
def global_stats():
    """
    Return high-level statistics for the dashboard overview.

    Response JSON
    --------------
    {
        "total_users":             int,
        "total_sessions":          int,
        "active_sessions":         int,   — sessions with no end_time
        "completed_sessions":      int,
        "average_session_duration": float, — seconds
        "average_engagement_score": float, — 0-100
        "total_gaze_points":       int,
        "total_predictions":       int,
        "most_viewed_ev_model":    str | null,
        "top_components": [               — top-5 most-viewed components
            {"component": str, "total_views": int, "total_duration": float},
            ...
        ]
    }

    Returns
    -------
    200  — stats JSON
    500  — unexpected error
    """
    try:
        # --- Scalar counts ----------------------------------------------- #
        total_users: int = db.session.query(func.count(User.id)).scalar() or 0
        total_sessions: int = db.session.query(func.count(Session.id)).scalar() or 0

        active_sessions: int = (
            db.session.query(func.count(Session.id))
            .filter(Session.end_time.is_(None))
            .scalar()
        ) or 0

        completed_sessions: int = total_sessions - active_sessions

        # --- Averages ---------------------------------------------------- #
        avg_duration = (
            db.session.query(func.avg(Session.duration))
            .filter(Session.duration.isnot(None))
            .scalar()
        )

        avg_engagement = (
            db.session.query(func.avg(Session.engagement_score))
            .filter(Session.engagement_score.isnot(None))
            .scalar()
        )

        total_gaze: int = db.session.query(func.count(GazeData.id)).scalar() or 0
        total_predictions: int = db.session.query(func.count(Prediction.id)).scalar() or 0

        # --- Most-viewed EV model (by session count) --------------------- #
        most_viewed_model_row = (
            db.session.query(Session.ev_model, func.count(Session.id).label("cnt"))
            .group_by(Session.ev_model)
            .order_by(func.count(Session.id).desc())
            .first()
        )
        most_viewed_ev_model: str | None = (
            most_viewed_model_row[0] if most_viewed_model_row else None
        )

        # --- Top-5 components by aggregate view count -------------------- #
        top_components_query = (
            db.session.query(
                VehicleView.component,
                func.sum(VehicleView.view_count).label("total_views"),
                func.sum(VehicleView.total_duration).label("total_duration"),
            )
            .group_by(VehicleView.component)
            .order_by(func.sum(VehicleView.view_count).desc())
            .limit(5)
            .all()
        )

        top_components = [
            {
                "component": row[0],
                "total_views": int(row[1] or 0),
                "total_duration": round(float(row[2] or 0.0), 2),
            }
            for row in top_components_query
        ]

        # --- Model Popularity (by session count) ------------------------- #
        model_popularity_query = (
            db.session.query(Session.ev_model, func.count(Session.id))
            .filter(Session.ev_model.isnot(None))
            .group_by(Session.ev_model)
            .all()
        )
        model_popularity = {
            "labels": [row[0] for row in model_popularity_query],
            "values": [row[1] for row in model_popularity_query]
        }

        # --- Sessions Over Time (daily session counts) ------------------- #
        sessions_over_time_query = (
            db.session.query(
                func.date(Session.start_time).label("day"),
                func.count(Session.id)
            )
            .group_by(func.date(Session.start_time))
            .order_by("day")
            .all()
        )
        sessions_over_time = {
            "dates": [row[0] for row in sessions_over_time_query],
            "counts": [row[1] for row in sessions_over_time_query]
        }

        # --- Assemble response ------------------------------------------- #
        stats = {
            "total_users": total_users,
            "total_sessions": total_sessions,
            "active_sessions": active_sessions,
            "completed_sessions": completed_sessions,
            "average_session_duration": round(float(avg_duration or 0.0), 2),
            "average_engagement_score": round(float(avg_engagement or 0.0), 2),
            "total_gaze_points": total_gaze,
            "total_predictions": total_predictions,
            "most_viewed_ev_model": most_viewed_ev_model,
            "top_components": top_components,
            "model_popularity": model_popularity,
            "sessions_over_time": sessions_over_time,
        }

        return jsonify(stats), 200

    except Exception as e:
        current_app.logger.error("Error computing dashboard stats: %s", str(e))
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

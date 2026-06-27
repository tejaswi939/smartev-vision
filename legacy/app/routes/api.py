"""
=============================================================================
SmartEV Vision — REST API Routes
=============================================================================
Core API endpoints consumed by the VR front-end and analytics dashboard.

Endpoints
---------
POST  /api/session/start       — Start a new viewing session
POST  /api/session/end         — End an active session
GET   /api/sessions            — List all sessions with user info
POST  /api/gaze                — Batch-insert gaze data points
GET   /api/analytics/<sid>     — Session analytics summary
GET   /api/heatmap/<sid>       — Gaze heatmap (base64 PNG + hotspots)
POST  /api/predict/<sid>       — Run ML prediction for a session
=============================================================================
"""

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models import Session, GazeData, VehicleView, User, Prediction
from app.services.eye_tracking import classify_gaze_point, calculate_fixation_duration
from app.services.analytics import compute_session_analytics
from app.services.heatmap import generate_heatmap
from app.services.ml_engine import predict_preference

# ---------------------------------------------------------------------------
# Blueprint definition
# ---------------------------------------------------------------------------
api_bp = Blueprint("api", __name__)


# ========================== SESSION ENDPOINTS ============================= #


@api_bp.route("/session/start", methods=["POST"])
@api_bp.route("/sessions", methods=["POST"])
def start_session():
    """
    Start a new VR viewing session.

    Request JSON
    -------------
    {
        "user_id":  int,       — FK to users table (required)
        "ev_model": str        — name of the EV model being viewed (optional)
    }

    Returns
    -------
    201  — session created with ``session_id``
    400  — missing required fields
    500  — unexpected server error
    """
    try:
        data = request.get_json(silent=True) or {}
        user_id = data.get("user_id")
        ev_model = data.get("ev_model", "Model A")

        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        # Handle 'anonymous' string or non-integer user IDs
        if not isinstance(user_id, int):
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                # Fallback to anonymous user
                anon_user = User.query.filter_by(email="anonymous@example.com").first()
                if not anon_user:
                    anon_user = User(name="Anonymous User", email="anonymous@example.com", age=25, gender="other")
                    db.session.add(anon_user)
                    db.session.commit()
                user_id = anon_user.id

        # Verify user exists
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({"error": f"User with id {user_id} not found"}), 404

        new_session = Session(
            user_id=user_id,
            ev_model=ev_model,
            start_time=datetime.now(timezone.utc),
        )
        db.session.add(new_session)
        db.session.commit()

        current_app.logger.info(
            "Session %d started for user %d on model '%s'",
            new_session.id, user_id, ev_model,
        )

        return jsonify({
            "message": "Session started",
            "session_id": new_session.id,
            "start_time": new_session.start_time.isoformat(),
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error("Error starting session: %s", str(e))
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@api_bp.route("/session/end", methods=["POST"])
@api_bp.route("/sessions/<int:session_id>/end", methods=["POST"])
def end_session(session_id: int = None):
    """
    End an active viewing session.

    Request JSON
    -------------
    {
        "session_id": int      — the session to close (optional if in URL)
    }

    Side-effects
    -------------
    • Sets ``end_time`` and computes ``duration``.
    • Aggregates gaze data into ``vehicle_views``.
    • Computes and stores ``engagement_score``.

    Returns
    -------
    200  — session ended successfully
    400  — missing session_id
    404  — session not found
    500  — unexpected error
    """
    try:
        if session_id is None:
            data = request.get_json(silent=True)
            if not data or "session_id" not in data:
                return jsonify({"error": "session_id is required"}), 400
            session_id = data["session_id"]
        session = db.session.get(Session, session_id)

        if not session:
            return jsonify({"error": f"Session {session_id} not found"}), 404

        if session.end_time is not None:
            return jsonify({"error": "Session already ended"}), 400

        # --- Mark session as ended --------------------------------------- #
        session.end_time = datetime.now(timezone.utc)
        session.duration = (session.end_time - session.start_time).total_seconds()

        # --- Aggregate gaze data into vehicle_views ---------------------- #
        gaze_points = GazeData.query.filter_by(session_id=session_id).all()
        _aggregate_vehicle_views(session_id, gaze_points)

        # --- Compute engagement score ------------------------------------ #
        analytics = compute_session_analytics(session_id)
        session.engagement_score = analytics.get("engagement_score", 0.0)

        db.session.commit()

        current_app.logger.info(
            "Session %d ended. Duration: %.1fs, Engagement: %.1f",
            session_id, session.duration, session.engagement_score,
        )

        return jsonify({
            "message": "Session ended",
            "session": session.to_dict(),
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error("Error ending session %s: %s", data.get("session_id"), str(e))
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@api_bp.route("/sessions", methods=["GET"])
def list_sessions():
    """
    List every session with its associated user info.

    Returns
    -------
    200  — JSON array of session objects enriched with user data
    500  — unexpected error
    """
    try:
        sessions = Session.query.order_by(Session.start_time.desc()).all()
        result = []
        for s in sessions:
            session_dict = s.to_dict()
            user = db.session.get(User, s.user_id)
            session_dict["user"] = user.to_dict() if user else None
            
            # Retrieve prediction
            pred = Prediction.query.filter_by(session_id=s.id).first()
            session_dict["prediction"] = pred.preferred_model if pred else "Pending"
            
            result.append(session_dict)

        return jsonify({"sessions": result, "total": len(result)}), 200

    except Exception as e:
        current_app.logger.error("Error listing sessions: %s", str(e))
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


# ============================ GAZE ENDPOINT =============================== #


@api_bp.route("/gaze", methods=["POST"])
def ingest_gaze_data():
    """
    Batch-insert gaze data points for an active session.

    Request JSON
    -------------
    {
        "session_id":  int,
        "gaze_points": [
            {"timestamp": float, "x": float, "y": float},
            ...
        ]
    }

    Each point is classified into an AOI and assigned a fixation duration
    before being persisted.

    Returns
    -------
    201  — points inserted
    400  — malformed request
    404  — session not found
    500  — unexpected error
    """
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        session_id = data.get("session_id")
        gaze_points = data.get("gaze_points")

        if not session_id or not gaze_points:
            return jsonify({"error": "session_id and gaze_points are required"}), 400

        if not isinstance(gaze_points, list) or len(gaze_points) == 0:
            return jsonify({"error": "gaze_points must be a non-empty array"}), 400

        # Verify session exists and is active
        session = db.session.get(Session, session_id)
        if not session:
            return jsonify({"error": f"Session {session_id} not found"}), 404

        # --- Process and persist each gaze point ------------------------- #
        inserted = 0
        for point in gaze_points:
            timestamp = point.get("timestamp")
            x = point.get("x")
            y = point.get("y")

            if timestamp is None or x is None or y is None:
                continue  # skip malformed points silently

            # Classify into an Area of Interest
            area_label: str = classify_gaze_point(float(x), float(y))

            # Calculate fixation duration (simplified — uses inter-sample delta)
            fixation_dur: float = calculate_fixation_duration(
                gaze_points, point, threshold_px=50.0
            )

            gaze_record = GazeData(
                session_id=session_id,
                timestamp=float(timestamp),
                x=float(x),
                y=float(y),
                area_label=area_label,
                fixation_duration=fixation_dur,
            )
            db.session.add(gaze_record)
            inserted += 1

        db.session.commit()

        current_app.logger.info(
            "Inserted %d gaze points for session %d", inserted, session_id
        )

        return jsonify({
            "message": f"{inserted} gaze points recorded",
            "session_id": session_id,
            "points_received": len(gaze_points),
            "points_inserted": inserted,
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error("Error ingesting gaze data: %s", str(e))
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


# ========================= ANALYTICS ENDPOINT ============================= #


@api_bp.route("/analytics/<int:session_id>", methods=["GET"])
def get_analytics(session_id: int):
    """
    Compute and return analytics for a session.

    Returns engagement score, per-AOI attention breakdown, most-viewed
    component, and session summary statistics.

    Returns
    -------
    200  — analytics JSON object
    404  — session not found
    500  — unexpected error
    """
    try:
        session = db.session.get(Session, session_id)
        if not session:
            return jsonify({"error": f"Session {session_id} not found"}), 404

        analytics = compute_session_analytics(session_id)
        return jsonify(analytics), 200

    except Exception as e:
        current_app.logger.error("Error computing analytics for session %d: %s", session_id, str(e))
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


# ========================== HEATMAP ENDPOINT ============================== #


@api_bp.route("/heatmap/<int:session_id>", methods=["GET"])
@api_bp.route("/sessions/<int:session_id>/heatmap", methods=["GET"])
def get_heatmap(session_id: int):
    """
    Generate a gaze heatmap for a session.

    Returns a base64-encoded PNG image and a list of detected hotspots.

    Returns
    -------
    200  — ``{ heatmap_image: str, hotspots: [...] }``
    404  — session not found or no gaze data
    500  — unexpected error
    """
    try:
        session = db.session.get(Session, session_id)
        if not session:
            return jsonify({"error": f"Session {session_id} not found"}), 404

        gaze_points = GazeData.query.filter_by(session_id=session_id).all()
        if not gaze_points:
            return jsonify({"error": "No gaze data available for this session"}), 404

        # Extract (x, y) coordinate lists
        xs = [gp.x for gp in gaze_points]
        ys = [gp.y for gp in gaze_points]

        heatmap_result = generate_heatmap(xs, ys)
        return jsonify(heatmap_result), 200

    except Exception as e:
        current_app.logger.error("Error generating heatmap for session %d: %s", session_id, str(e))
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


# ======================== PREDICTION ENDPOINT ============================= #


@api_bp.route("/predict/<int:session_id>", methods=["GET", "POST"])
def run_prediction(session_id: int):
    """
    Run or retrieve the ML prediction engine result on a session's gaze data.

    Returns the predicted preferred EV model, preference category, and
    confidence score. The result is also persisted in the ``predictions``
    table.

    Returns
    -------
    200  — prediction result JSON
    404  — session not found
    500  — unexpected error
    """
    try:
        session = db.session.get(Session, session_id)
        if not session:
            return jsonify({"error": f"Session {session_id} not found"}), 404

        if request.method == "GET":
            pred = Prediction.query.filter_by(session_id=session_id).first()
            if pred:
                return jsonify({
                    "session_id": pred.session_id,
                    "preferred_model": pred.preferred_model,
                    "preference_category": pred.preference_category,
                    "confidence": pred.confidence,
                    "message": "Prediction loaded from database."
                }), 200

        prediction_result = predict_preference(session_id)
        return jsonify(prediction_result), 200

    except Exception as e:
        current_app.logger.error("Error predicting for session %d: %s", session_id, str(e))
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


# ======================= HELPER FUNCTIONS ================================= #


def _aggregate_vehicle_views(session_id: int, gaze_points: list) -> None:
    """
    Aggregate raw gaze points into per-component statistics and persist
    them as ``VehicleView`` rows.

    For each AOI found in the gaze data this function computes:
    • ``view_count``     — number of gaze points that landed on the AOI
    • ``total_duration`` — sum of fixation durations (seconds)
    • ``revisits``       — transitions into this AOI from a different one

    Parameters
    ----------
    session_id : int
        The session these gaze points belong to.
    gaze_points : list[GazeData]
        All gaze records for the session.
    """

    if not gaze_points:
        return

    # Delete any previously computed views (idempotent re-runs)
    VehicleView.query.filter_by(session_id=session_id).delete()

    # Build per-component accumulators
    component_stats: dict[str, dict] = {}
    prev_label: str | None = None

    for gp in gaze_points:
        label = gp.area_label or "Background"

        if label not in component_stats:
            component_stats[label] = {
                "view_count": 0,
                "total_duration": 0.0,
                "revisits": 0,
            }

        component_stats[label]["view_count"] += 1
        component_stats[label]["total_duration"] += (gp.fixation_duration or 0.0) / 1000.0  # ms → s

        # A revisit occurs when the user returns to this AOI after looking
        # at a different one.
        if prev_label is not None and prev_label != label:
            component_stats[label]["revisits"] += 1

        prev_label = label

    # Persist
    for component, stats in component_stats.items():
        vv = VehicleView(
            session_id=session_id,
            component=component,
            view_count=stats["view_count"],
            total_duration=round(stats["total_duration"], 3),
            revisits=stats["revisits"],
        )
        db.session.add(vv)


# ===================== LIVE ADMIN ENDPOINTS ========================== #


@api_bp.route("/users", methods=["GET"])
def list_users():
    """
    List all registered participants with session counts.
    """
    try:
        users = User.query.order_by(User.id.desc()).all()
        result = []
        for u in users:
            user_dict = u.to_dict()
            user_dict["session_count"] = Session.query.filter_by(user_id=u.id).count()
            result.append(user_dict)
        return jsonify({"users": result, "total": len(result)}), 200
    except Exception as e:
        current_app.logger.error("Error listing users: %s", str(e))
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@api_bp.route("/sessions/<int:session_id>", methods=["DELETE"])
def delete_session(session_id: int):
    """
    Delete a session and cascade delete its associated data.
    """
    try:
        session = db.session.get(Session, session_id)
        if not session:
            return jsonify({"error": f"Session {session_id} not found"}), 404

        # Delete dependent entries
        GazeData.query.filter_by(session_id=session_id).delete()
        VehicleView.query.filter_by(session_id=session_id).delete()
        Prediction.query.filter_by(session_id=session_id).delete()
        db.session.delete(session)
        db.session.commit()

        return jsonify({"message": f"Session {session_id} deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error("Error deleting session %d: %s", session_id, str(e))
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@api_bp.route("/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id: int):
    """
    Delete a user and cascade delete all their sessions and associated data.
    """
    try:
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({"error": f"User {user_id} not found"}), 404

        sessions = Session.query.filter_by(user_id=user_id).all()
        for s in sessions:
            GazeData.query.filter_by(session_id=s.id).delete()
            VehicleView.query.filter_by(session_id=s.id).delete()
            Prediction.query.filter_by(session_id=s.id).delete()
            db.session.delete(s)

        db.session.delete(user)
        db.session.commit()

        return jsonify({"message": f"User {user_id} deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error("Error deleting user %d: %s", user_id, str(e))
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


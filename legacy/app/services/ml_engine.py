"""
=============================================================================
SmartEV Vision — ML Prediction Engine
=============================================================================
Extracts features from session gaze data, loads a pre-trained Random-Forest
model (``ml/model.pkl``), and predicts the user's preferred EV model and
preference category.

Feature Vector (20 features)
-----------------------------
For each of the 6 AOIs (Body, Headlights, Hood, Interior, Wheels, Windshield):
    • avg_gaze_duration_<aoi>    — mean fixation duration (ms)
    • focus_percentage_<aoi>     — % of total gaze time on this AOI
    • revisit_count_<aoi>        — number of revisits

Plus 2 session-level features:
    • total_duration             — session length (seconds)
    • engagement_score           — composite engagement (0-100)

Total = 6×3 + 2 = 20 features

Graceful degradation
--------------------
If ``ml/model.pkl`` does not exist the service returns an "insufficient data"
message instead of crashing.
=============================================================================
"""

from __future__ import annotations

import os
import pickle
from typing import Any

import numpy as np
from flask import current_app

from app import db
from app.models import Session, GazeData, VehicleView, Prediction
from app.services.eye_tracking import get_aoi_labels
from app.services.analytics import compute_session_analytics


# ---------------------------------------------------------------------------
# Canonical AOI order used for the feature vector
# ---------------------------------------------------------------------------
CANONICAL_AOIS: list[str] = sorted([
    "Body", "Headlights", "Hood", "Interior", "Wheels", "Windshield"
])

# Total expected feature count
EXPECTED_FEATURE_COUNT: int = len(CANONICAL_AOIS) * 3 + 2  # 20


def predict_preference(session_id: int) -> dict[str, Any]:
    """
    Run the ML prediction pipeline for a session.

    Steps
    -----
    1. Extract the 20-dimensional feature vector from gaze data.
    2. Load the serialised Random-Forest model from disk.
    3. Predict preferred EV model + preference category.
    4. Persist the prediction in the ``predictions`` table.

    Parameters
    ----------
    session_id : int
        The session to predict for.

    Returns
    -------
    dict
        {
            "session_id":            int,
            "preferred_model":       str,
            "preference_category":   str,
            "confidence":            float,
            "features":              dict,   — named feature values
            "message":               str,
        }
    """
    try:
        # --- Validate session -------------------------------------------- #
        session = db.session.get(Session, session_id)
        if not session:
            return {"error": f"Session {session_id} not found"}

        # --- Extract features -------------------------------------------- #
        features, feature_names = extract_features(session_id)
        if features is None:
            return {
                "session_id": session_id,
                "preferred_model": "unknown",
                "preference_category": "insufficient data",
                "confidence": 0.0,
                "message": "Not enough gaze data to extract features.",
            }

        # --- Load model -------------------------------------------------- #
        model = _load_model()
        if model is None:
            # No trained model available — fall back to heuristic
            result = _heuristic_prediction(session_id, features, feature_names)
            _persist_prediction(session_id, result)
            return result

        # --- Predict ----------------------------------------------------- #
        feature_array = np.array(features).reshape(1, -1)

        # Preferred model prediction
        predicted_label = model.predict(feature_array)[0]

        # Confidence (probability of the top class)
        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(feature_array)[0]
            confidence = float(np.max(probabilities))
        else:
            confidence = 0.85  # default if model doesn't support probabilities

        # Determine preference category from dominant AOI
        preference_category = _infer_preference_category(features, feature_names)

        result = {
            "session_id": session_id,
            "preferred_model": str(predicted_label),
            "preference_category": preference_category,
            "confidence": round(confidence, 4),
            "features": dict(zip(feature_names, [round(f, 4) for f in features])),
            "message": "Prediction generated successfully.",
        }

        _persist_prediction(session_id, result)
        return result

    except Exception as e:
        current_app.logger.error("Prediction error for session %d: %s", session_id, str(e))
        return {
            "session_id": session_id,
            "preferred_model": "unknown",
            "preference_category": "error",
            "confidence": 0.0,
            "message": f"Prediction failed: {str(e)}",
        }


# =========================================================================== #
#  Feature extraction                                                          #
# =========================================================================== #


def extract_features(session_id: int) -> tuple[list[float] | None, list[str]]:
    """
    Build the 20-feature vector from a session's gaze and analytics data.

    Feature order
    -------------
    [avg_dur_Body, avg_dur_Headlights, ..., avg_dur_Windshield,   (6)
     focus_pct_Body, focus_pct_Headlights, ..., focus_pct_Windshield,  (6)
     revisits_Body, revisits_Headlights, ..., revisits_Windshield,  (6)
     total_duration, engagement_score]                               (2)

    Parameters
    ----------
    session_id : int

    Returns
    -------
    (features, feature_names)
        ``features`` is ``None`` if insufficient data exists.
    """
    # --- Gaze data ------------------------------------------------------- #
    gaze_points: list[GazeData] = (
        GazeData.query.filter_by(session_id=session_id).all()
    )

    if not gaze_points:
        feature_names = _build_feature_names()
        return None, feature_names

    # --- Per-AOI accumulators -------------------------------------------- #
    aoi_durations: dict[str, list[float]] = {aoi: [] for aoi in CANONICAL_AOIS}
    aoi_counts: dict[str, int] = {aoi: 0 for aoi in CANONICAL_AOIS}

    for gp in gaze_points:
        label = gp.area_label or "Background"
        if label in aoi_durations:
            aoi_durations[label].append(gp.fixation_duration or 0.0)
            aoi_counts[label] += 1

    # --- Vehicle views (for revisits) ------------------------------------ #
    vehicle_views: list[VehicleView] = (
        VehicleView.query.filter_by(session_id=session_id).all()
    )
    aoi_revisits: dict[str, int] = {aoi: 0 for aoi in CANONICAL_AOIS}
    for vv in vehicle_views:
        if vv.component in aoi_revisits:
            aoi_revisits[vv.component] = vv.revisits or 0

    # --- Session-level --------------------------------------------------- #
    session = db.session.get(Session, session_id)
    total_duration: float = session.duration if session and session.duration else 0.0
    engagement_score: float = session.engagement_score if session and session.engagement_score else 0.0

    # If engagement not yet computed, compute now
    if engagement_score == 0.0:
        analytics = compute_session_analytics(session_id)
        engagement_score = analytics.get("engagement_score", 0.0)

    # --- Assemble feature vector ----------------------------------------- #
    total_fixation_ms = sum(
        sum(durs) for durs in aoi_durations.values()
    )

    features: list[float] = []

    # Block 1: avg gaze duration per AOI (ms)
    for aoi in CANONICAL_AOIS:
        durs = aoi_durations[aoi]
        avg_dur = (sum(durs) / len(durs)) if durs else 0.0
        features.append(avg_dur)

    # Block 2: focus percentage per AOI
    for aoi in CANONICAL_AOIS:
        aoi_total_ms = sum(aoi_durations[aoi])
        pct = (aoi_total_ms / total_fixation_ms * 100.0) if total_fixation_ms > 0 else 0.0
        features.append(pct)

    # Block 3: revisit count per AOI
    for aoi in CANONICAL_AOIS:
        features.append(float(aoi_revisits[aoi]))

    # Block 4: session-level features
    features.append(total_duration)
    features.append(engagement_score)

    feature_names = _build_feature_names()

    return features, feature_names


# =========================================================================== #
#  Private helpers                                                             #
# =========================================================================== #


def _build_feature_names() -> list[str]:
    """Return the ordered list of 20 feature names."""
    names: list[str] = []
    for aoi in CANONICAL_AOIS:
        names.append(f"avg_gaze_duration_{aoi}")
    for aoi in CANONICAL_AOIS:
        names.append(f"focus_percentage_{aoi}")
    for aoi in CANONICAL_AOIS:
        names.append(f"revisit_count_{aoi}")
    names.append("total_duration")
    names.append("engagement_score")
    return names


def _load_model():
    """
    Load the trained Random-Forest model from ``ml/model.pkl``.

    Returns
    -------
    model or None
        The deserialised scikit-learn model, or ``None`` if the file does
        not exist or cannot be loaded.
    """
    try:
        model_path = current_app.config.get("ML_MODEL_PATH", "ml/model.pkl")
        if not os.path.isfile(model_path):
            current_app.logger.warning(
                "ML model file not found at '%s'. Using heuristic fallback.",
                model_path,
            )
            return None

        with open(model_path, "rb") as f:
            model = pickle.load(f)

        current_app.logger.info("ML model loaded from '%s'.", model_path)
        return model

    except Exception as e:
        current_app.logger.error("Failed to load ML model: %s", str(e))
        return None


def _infer_preference_category(
    features: list[float],
    feature_names: list[str],
) -> str:
    """
    Infer the user's preference category from the dominant AOI.

    Mapping
    -------
    Body        → "Exterior Design"
    Headlights  → "Lighting & Safety"
    Hood        → "Performance"
    Interior    → "Interior & Comfort"
    Wheels      → "Sporty / Handling"
    Windshield  → "Visibility & Tech"

    Uses the ``focus_percentage_*`` features (indices 6-11).
    """
    category_map: dict[str, str] = {
        "Body":       "Exterior Design",
        "Headlights": "Lighting & Safety",
        "Hood":       "Performance",
        "Interior":   "Interior & Comfort",
        "Wheels":     "Sporty / Handling",
        "Windshield": "Visibility & Tech",
    }

    # Focus-percentage features are at indices [6..11] (Block 2)
    focus_start = len(CANONICAL_AOIS)  # 6
    focus_end = focus_start + len(CANONICAL_AOIS)  # 12

    focus_values = features[focus_start:focus_end]
    max_idx = int(np.argmax(focus_values))
    dominant_aoi = CANONICAL_AOIS[max_idx]

    return category_map.get(dominant_aoi, "General Interest")


def _heuristic_prediction(
    session_id: int,
    features: list[float],
    feature_names: list[str],
) -> dict[str, Any]:
    """
    Heuristic fallback when no trained model is available.

    Uses the session's ``ev_model`` as the "preferred" model and infers
    the category from the dominant AOI.

    Parameters
    ----------
    session_id : int
    features : list[float]
    feature_names : list[str]

    Returns
    -------
    dict   — same schema as the ML prediction result
    """
    session = db.session.get(Session, session_id)
    preferred_model = session.ev_model if session else "unknown"
    preference_category = _infer_preference_category(features, feature_names)

    return {
        "session_id": session_id,
        "preferred_model": preferred_model,
        "preference_category": preference_category,
        "confidence": 0.65,  # lower confidence for heuristic
        "features": dict(zip(feature_names, [round(f, 4) for f in features])),
        "message": (
            "Prediction generated using heuristic fallback "
            "(trained model not available)."
        ),
    }


def _persist_prediction(session_id: int, result: dict[str, Any]) -> None:
    """
    Save the prediction result to the ``predictions`` table.

    Parameters
    ----------
    session_id : int
    result : dict
        Must contain ``preferred_model``, ``preference_category``,
        ``confidence``.
    """
    try:
        prediction = Prediction(
            session_id=session_id,
            preferred_model=result.get("preferred_model", "unknown"),
            preference_category=result.get("preference_category", "unknown"),
            confidence=result.get("confidence", 0.0),
        )
        db.session.add(prediction)
        db.session.commit()

        current_app.logger.info(
            "Prediction persisted for session %d: model=%s, category=%s, confidence=%.2f",
            session_id,
            prediction.preferred_model,
            prediction.preference_category,
            prediction.confidence,
        )
    except Exception as e:
        db.session.rollback()
        current_app.logger.error("Failed to persist prediction: %s", str(e))

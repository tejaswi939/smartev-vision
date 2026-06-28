"""
=============================================================================
SmartEV Vision — Analytics Service
=============================================================================
Computes session-level analytics from stored gaze and vehicle-view data.

Key metrics
-----------
• Attention duration per AOI (seconds)
• Attention percentage per AOI
• Engagement score (0–100 composite)
• Most-viewed component
• Session summary (total gaze points, unique AOIs, duration)
=============================================================================
"""

from __future__ import annotations
from typing import Any

from app import db
from app.models import Session, GazeData, VehicleView
from app.services.eye_tracking import get_aoi_labels


def compute_session_analytics(session_id: int) -> dict[str, Any]:
    """
    Compute a comprehensive analytics report for a single session.

    Parameters
    ----------
    session_id : int
        The session to analyse.

    Returns
    -------
    dict
        {
            "session_id":           int,
            "total_gaze_points":    int,
            "session_duration":     float | None,
            "engagement_score":     float,
            "most_viewed_component": str | None,
            "attention_by_aoi":     { <aoi>: { duration, percentage, view_count, revisits } },
            "summary": {
                "unique_aois_viewed":  int,
                "avg_fixation_duration": float,
                "total_fixation_time":  float,
            }
        }
    """
    try:
        session = db.session.get(Session, session_id)
        if not session:
            return {"error": f"Session {session_id} not found"}

        # ----- Fetch raw gaze data & aggregated views -------------------- #
        gaze_points: list[GazeData] = (
            GazeData.query
            .filter_by(session_id=session_id)
            .order_by(GazeData.timestamp)
            .all()
        )
        vehicle_views: list[VehicleView] = (
            VehicleView.query.filter_by(session_id=session_id).all()
        )

        total_points = len(gaze_points)

        # ----- Per-AOI attention breakdown ------------------------------- #
        attention_by_aoi = _compute_attention_breakdown(gaze_points, vehicle_views)

        # ----- Most-viewed component ------------------------------------- #
        most_viewed = _most_viewed_component(attention_by_aoi)

        # ----- Summary statistics ---------------------------------------- #
        fixation_durations = [
            gp.fixation_duration for gp in gaze_points
            if gp.fixation_duration is not None and gp.fixation_duration > 0
        ]
        total_fixation_ms = sum(fixation_durations)
        avg_fixation_ms = (total_fixation_ms / len(fixation_durations)) if fixation_durations else 0.0

        unique_aois = len([
            aoi for aoi, info in attention_by_aoi.items()
            if info["duration"] > 0
        ])

        # ----- Engagement score ------------------------------------------ #
        engagement = _calculate_engagement_score(
            total_points=total_points,
            session_duration=session.duration,
            unique_aois=unique_aois,
            avg_fixation_ms=avg_fixation_ms,
            attention_by_aoi=attention_by_aoi,
        )

        # ----- Timeline (gaze over time) --------------------------------- #
        timeline = []
        if gaze_points:
            interval = 5.0
            max_time = max(gp.timestamp for gp in gaze_points)
            num_intervals = int(max_time / interval) + 1
            intervals_data = [[] for _ in range(num_intervals)]
            for gp in gaze_points:
                idx = int(gp.timestamp / interval)
                if idx < num_intervals:
                    intervals_data[idx].append(gp)
            
            for i, pts in enumerate(intervals_data):
                if pts:
                    density = min(len(pts) / interval / 60.0, 1.0)
                    aois_in_interval = len(set(gp.area_label for gp in pts if gp.area_label and gp.area_label != "Background"))
                    coverage = min(aois_in_interval / 6.0, 1.0)
                    fix_durs = [gp.fixation_duration for gp in pts if gp.fixation_duration]
                    avg_fix = sum(fix_durs) / len(fix_durs) if fix_durs else 0.0
                    fix_quality = min(avg_fix / 500.0, 1.0)
                    interval_score = (density * 33.3 + coverage * 33.3 + fix_quality * 33.4) * 100.0
                    interval_score = min(max(interval_score, 10.0), 100.0)
                else:
                    interval_score = 0.0
                timeline.append({
                    "time": i * interval,
                    "engagement": round(interval_score, 2)
                })

        return {
            "session_id": session_id,
            "total_gaze_points": total_points,
            "session_duration": session.duration,
            "engagement_score": round(engagement, 2),
            "most_viewed_component": most_viewed,
            "attention_by_aoi": attention_by_aoi,
            "summary": {
                "unique_aois_viewed": unique_aois,
                "avg_fixation_duration_ms": round(avg_fixation_ms, 2),
                "total_fixation_time_ms": round(total_fixation_ms, 2),
            },
            "timeline": timeline,
        }

    except Exception as e:
        return {"error": f"Analytics computation failed: {str(e)}"}


# =========================================================================== #
#  Private helpers                                                             #
# =========================================================================== #


def _compute_attention_breakdown(
    gaze_points: list[GazeData],
    vehicle_views: list[VehicleView],
) -> dict[str, dict]:
    """
    Build a per-AOI attention dictionary.

    Uses ``vehicle_views`` if available (already aggregated), otherwise
    falls back to raw gaze data.

    Returns
    -------
    dict[str, dict]
        Keyed by AOI label.  Each value contains:
        ``duration`` (s), ``percentage``, ``view_count``, ``revisits``.
    """
    aoi_labels = get_aoi_labels() + ["Background"]
    attention: dict[str, dict] = {}

    # --- Prefer pre-aggregated vehicle_views ----------------------------- #
    if vehicle_views:
        total_duration = sum(vv.total_duration or 0.0 for vv in vehicle_views)

        for vv in vehicle_views:
            pct = (
                (vv.total_duration / total_duration * 100.0)
                if total_duration > 0 else 0.0
            )
            attention[vv.component] = {
                "duration": round(vv.total_duration, 3),
                "percentage": round(pct, 2),
                "view_count": vv.view_count,
                "revisits": vv.revisits,
            }
    else:
        # --- Fallback: compute from raw gaze points ---------------------- #
        aoi_accum: dict[str, dict] = {}
        for gp in gaze_points:
            label = gp.area_label or "Background"
            if label not in aoi_accum:
                aoi_accum[label] = {"duration_ms": 0.0, "count": 0}
            aoi_accum[label]["duration_ms"] += (gp.fixation_duration or 0.0)
            aoi_accum[label]["count"] += 1

        total_ms = sum(v["duration_ms"] for v in aoi_accum.values())

        for label, vals in aoi_accum.items():
            dur_s = vals["duration_ms"] / 1000.0
            pct = (vals["duration_ms"] / total_ms * 100.0) if total_ms > 0 else 0.0
            attention[label] = {
                "duration": round(dur_s, 3),
                "percentage": round(pct, 2),
                "view_count": vals["count"],
                "revisits": 0,  # can't compute revisits from unordered aggregate
            }

    # Ensure all standard AOIs appear (even if 0)
    for lbl in aoi_labels:
        if lbl not in attention:
            attention[lbl] = {
                "duration": 0.0,
                "percentage": 0.0,
                "view_count": 0,
                "revisits": 0,
            }

    return attention


def _most_viewed_component(attention_by_aoi: dict[str, dict]) -> str | None:
    """Return the AOI with the longest total attention duration (excluding Background)."""
    best_label: str | None = None
    best_dur: float = 0.0

    for label, info in attention_by_aoi.items():
        if label == "Background":
            continue
        if info["duration"] > best_dur:
            best_dur = info["duration"]
            best_label = label

    return best_label


def _calculate_engagement_score(
    total_points: int,
    session_duration: float | None,
    unique_aois: int,
    avg_fixation_ms: float,
    attention_by_aoi: dict[str, dict],
) -> float:
    """
    Compute a composite engagement score (0–100).

    Components (weighted):
    1. **Gaze density**      (25%) — points per second of session time.
    2. **AOI coverage**      (25%) — fraction of defined AOIs actually viewed.
    3. **Fixation quality**  (25%) — normalised average fixation duration.
    4. **Focus balance**     (25%) — evenness of attention across AOIs
                                     (low entropy → very focused → higher score).

    Parameters
    ----------
    total_points : int
    session_duration : float | None   — seconds
    unique_aois : int
    avg_fixation_ms : float
    attention_by_aoi : dict[str, dict]

    Returns
    -------
    float   — score in [0, 100]
    """
    if total_points == 0:
        return 0.0

    # 1. Gaze density — cap at 60 Hz (≈ common eye-tracker rate)
    duration = session_duration if session_duration and session_duration > 0 else 1.0
    density = min(total_points / duration / 60.0, 1.0)  # normalised 0-1

    # 2. AOI coverage — 6 meaningful AOIs (excluding Background)
    total_aoi_count = max(len(get_aoi_labels()), 1)
    coverage = min(unique_aois / total_aoi_count, 1.0)

    # 3. Fixation quality — normalised against 500ms benchmark
    fixation_quality = min(avg_fixation_ms / 500.0, 1.0)

    # 4. Focus balance — lower std-dev of percentages → more balanced
    percentages = [
        info["percentage"]
        for label, info in attention_by_aoi.items()
        if label != "Background"
    ]
    if percentages:
        mean_pct = sum(percentages) / len(percentages)
        variance = sum((p - mean_pct) ** 2 for p in percentages) / len(percentages)
        std_dev = variance ** 0.5
        # Normalise: 0 std-dev → 1.0, ≥50 std-dev → 0.0
        balance = max(1.0 - std_dev / 50.0, 0.0)
    else:
        balance = 0.0

    # Weighted composite
    score = (
        density * 25.0
        + coverage * 25.0
        + fixation_quality * 25.0
        + balance * 25.0
    )

    return min(max(score, 0.0), 100.0)

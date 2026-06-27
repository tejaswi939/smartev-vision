"""
=============================================================================
SmartEV Vision — Eye-Tracking Service
=============================================================================
Processes raw (x, y) gaze coordinates and maps them to Areas of Interest
(AOIs) on the EV model.  Also computes per-sample fixation duration using
a velocity-threshold approach.

AOI Layout (normalised 0-1 coordinate system)
----------------------------------------------
The default AOI map assumes a front-facing view of a vehicle centred in
the viewport.  Coordinates are normalised so (0, 0) = top-left and
(1, 1) = bottom-right.

    ┌──────────────────────────────────────┐
    │           Windshield (0.30-0.70, 0.05-0.25)           │
    │  Headlight-L          Hood          Headlight-R       │
    │  (0.05-0.20,   (0.20-0.80,  (0.80-0.95,              │
    │   0.20-0.40)    0.10-0.35)   0.20-0.40)              │
    │                                                       │
    │              Body (0.15-0.85, 0.30-0.70)              │
    │                                                       │
    │  Wheels-L               Interior            Wheels-R  │
    │ (0.05-0.25,   (0.35-0.65, 0.35-0.65)  (0.75-0.95,   │
    │  0.70-0.95)                              0.70-0.95)   │
    └──────────────────────────────────────┘

Regions are checked in priority order; the first match wins.
=============================================================================
"""

from __future__ import annotations

import math
from typing import Optional

# ---------------------------------------------------------------------------
# AOI definitions  — each entry is (label, x_min, x_max, y_min, y_max)
# Coordinates are normalised [0, 1].  Checked top-to-bottom; first match wins.
# ---------------------------------------------------------------------------
AOI_REGIONS: list[tuple[str, float, float, float, float]] = [
    # Label         x_min  x_max  y_min  y_max
    ("Windshield",   0.30,  0.70,  0.05,  0.25),
    ("Hood",         0.20,  0.80,  0.10,  0.35),
    ("Headlights",   0.05,  0.20,  0.20,  0.40),   # left headlight
    ("Headlights",   0.80,  0.95,  0.20,  0.40),   # right headlight
    ("Interior",     0.35,  0.65,  0.35,  0.65),
    ("Body",         0.15,  0.85,  0.30,  0.70),
    ("Wheels",       0.05,  0.25,  0.70,  0.95),   # left wheel
    ("Wheels",       0.75,  0.95,  0.70,  0.95),   # right wheel
]


def classify_gaze_point(x: float, y: float) -> str:
    """
    Map a single (x, y) gaze coordinate to an AOI label.

    Parameters
    ----------
    x : float
        Horizontal gaze position (0 = left, 1 = right).
    y : float
        Vertical gaze position (0 = top, 1 = bottom).

    Returns
    -------
    str
        The label of the matched AOI, or ``"Background"`` if no region
        contains the point.
    """
    try:
        for label, x_min, x_max, y_min, y_max in AOI_REGIONS:
            if x_min <= x <= x_max and y_min <= y <= y_max:
                return label
    except (TypeError, ValueError):
        # Defensive — if x/y aren't numeric we fall through to Background
        pass

    return "Background"


def calculate_fixation_duration(
    gaze_points: list[dict],
    current_point: dict,
    threshold_px: float = 50.0,
) -> float:
    """
    Estimate the fixation duration for the *current_point* using a simple
    velocity-threshold method.

    A fixation is defined as a contiguous sequence of gaze samples where
    the spatial displacement between consecutive samples is less than
    ``threshold_px`` (in the same coordinate units as x/y).

    Algorithm
    ---------
    1. Find the index of ``current_point`` in ``gaze_points``.
    2. Walk backwards and forwards while consecutive samples remain within
       the spatial threshold.
    3. The fixation duration = last_timestamp − first_timestamp of the
       contiguous cluster (in milliseconds).

    Parameters
    ----------
    gaze_points : list[dict]
        Full list of gaze samples (must contain ``timestamp``, ``x``, ``y``).
    current_point : dict
        The sample whose fixation duration we want to compute.
    threshold_px : float
        Maximum Euclidean distance (in coordinate units) between consecutive
        samples for them to be considered part of the same fixation.

    Returns
    -------
    float
        Fixation duration in **milliseconds**.  Returns 0.0 if computation
        is not possible.
    """
    try:
        if not gaze_points or len(gaze_points) < 2:
            return 0.0

        # Locate the current point's index
        current_idx: Optional[int] = None
        for idx, gp in enumerate(gaze_points):
            if (
                gp.get("timestamp") == current_point.get("timestamp")
                and gp.get("x") == current_point.get("x")
                and gp.get("y") == current_point.get("y")
            ):
                current_idx = idx
                break

        if current_idx is None:
            return 0.0

        cx = float(current_point["x"])
        cy = float(current_point["y"])

        # --- Walk backwards ---------------------------------------------- #
        start_idx = current_idx
        for i in range(current_idx - 1, -1, -1):
            px = float(gaze_points[i]["x"])
            py = float(gaze_points[i]["y"])
            dist = math.hypot(cx - px, cy - py)
            if dist > threshold_px:
                break
            start_idx = i
            cx, cy = px, py  # chain-compare from previous point

        # --- Walk forwards ----------------------------------------------- #
        cx = float(current_point["x"])
        cy = float(current_point["y"])
        end_idx = current_idx
        for i in range(current_idx + 1, len(gaze_points)):
            nx = float(gaze_points[i]["x"])
            ny = float(gaze_points[i]["y"])
            dist = math.hypot(cx - nx, cy - ny)
            if dist > threshold_px:
                break
            end_idx = i
            cx, cy = nx, ny

        # Fixation duration (convert to ms — assumes timestamps in seconds)
        t_start = float(gaze_points[start_idx]["timestamp"])
        t_end = float(gaze_points[end_idx]["timestamp"])
        duration_ms = abs(t_end - t_start) * 1000.0

        return round(duration_ms, 2)

    except Exception:
        return 0.0


def get_aoi_labels() -> list[str]:
    """
    Return the list of unique AOI labels (excluding Background).

    Useful for feature extraction where a fixed-order vector is required.

    Returns
    -------
    list[str]
        Sorted, deduplicated list of AOI names.
    """
    labels = sorted(set(label for label, *_ in AOI_REGIONS))
    return labels

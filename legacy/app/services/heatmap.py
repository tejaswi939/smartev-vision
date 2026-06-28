"""
=============================================================================
SmartEV Vision — Heatmap Generation Service
=============================================================================
Generates a 2D gaze heatmap from (x, y) coordinate lists using a Gaussian
kernel, renders it as a matplotlib figure, and returns the image as a
base64-encoded PNG along with detected hotspot locations.
=============================================================================
"""

from __future__ import annotations

import base64
import io
from typing import Any

import numpy as np
from scipy.ndimage import gaussian_filter
import matplotlib
matplotlib.use("Agg")  # non-interactive backend — no GUI required
import matplotlib.pyplot as plt  # noqa: E402


# ---------------------------------------------------------------------------
# Configuration defaults
# ---------------------------------------------------------------------------
HEATMAP_RESOLUTION: int = 200          # grid cells per axis
GAUSSIAN_SIGMA: float = 15.0           # Gaussian kernel sigma
HOTSPOT_THRESHOLD_PERCENTILE: float = 90.0  # top 10% intensity = hotspot
FIGURE_DPI: int = 100
FIGURE_SIZE: tuple[int, int] = (8, 6)  # inches


def generate_heatmap(
    xs: list[float],
    ys: list[float],
    resolution: int = HEATMAP_RESOLUTION,
    sigma: float = GAUSSIAN_SIGMA,
) -> dict[str, Any]:
    """
    Generate a 2D heatmap from gaze coordinates.

    Algorithm
    ---------
    1. Build a 2D histogram (binned density) from the raw coordinates.
    2. Apply a Gaussian blur to smooth the density surface.
    3. Render with matplotlib using a ``hot`` colourmap.
    4. Encode the figure as a base64 PNG string.
    5. Identify hotspot locations (cells exceeding the 90th-percentile
       intensity).

    Parameters
    ----------
    xs : list[float]
        Horizontal gaze coordinates (normalised 0-1 or pixel values).
    ys : list[float]
        Vertical gaze coordinates (same coordinate space as *xs*).
    resolution : int
        Number of bins along each axis for the histogram grid.
    sigma : float
        Standard deviation of the Gaussian smoothing kernel.

    Returns
    -------
    dict
        {
            "heatmap_image": str,      — base64-encoded PNG
            "hotspots":      list,     — list of {x, y, intensity} dicts
            "total_points":  int,
            "resolution":    int,
        }
    """
    try:
        # --- Validate input ---------------------------------------------- #
        if not xs or not ys or len(xs) != len(ys):
            return {
                "heatmap_image": "",
                "hotspots": [],
                "total_points": 0,
                "resolution": resolution,
                "error": "Invalid or empty coordinate lists",
            }

        x_arr = np.array(xs, dtype=np.float64)
        y_arr = np.array(ys, dtype=np.float64)

        # --- 1. Build 2D histogram --------------------------------------- #
        heatmap_grid, x_edges, y_edges = np.histogram2d(
            x_arr, y_arr,
            bins=resolution,
            range=[[0, 1], [0, 1]],  # normalised coordinate space
        )

        # --- 2. Gaussian smoothing --------------------------------------- #
        heatmap_smooth = gaussian_filter(heatmap_grid.T, sigma=sigma)

        # --- 3. Render with matplotlib ----------------------------------- #
        fig, ax = plt.subplots(figsize=FIGURE_SIZE, dpi=FIGURE_DPI)
        im = ax.imshow(
            heatmap_smooth,
            cmap="hot",
            origin="upper",
            extent=[0, 1, 1, 0],       # match normalised coords (y inverted)
            aspect="auto",
            interpolation="bilinear",
        )
        ax.set_xlabel("X (normalised)")
        ax.set_ylabel("Y (normalised)")
        ax.set_title("Gaze Heatmap")
        fig.colorbar(im, ax=ax, label="Gaze Density")

        # --- 4. Encode as base64 PNG ------------------------------------- #
        buf = io.BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight", dpi=FIGURE_DPI)
        plt.close(fig)  # free memory
        buf.seek(0)
        heatmap_b64: str = base64.b64encode(buf.read()).decode("utf-8")

        # --- 5. Detect hotspots ------------------------------------------ #
        hotspots = _detect_hotspots(
            heatmap_smooth, x_edges, y_edges, resolution
        )

        return {
            "heatmap_image": heatmap_b64,
            "hotspots": hotspots,
            "total_points": len(xs),
            "resolution": resolution,
        }

    except Exception as e:
        return {
            "heatmap_image": "",
            "hotspots": [],
            "total_points": len(xs) if xs else 0,
            "resolution": resolution,
            "error": f"Heatmap generation failed: {str(e)}",
        }


# =========================================================================== #
#  Private helpers                                                             #
# =========================================================================== #


def _detect_hotspots(
    heatmap: np.ndarray,
    x_edges: np.ndarray,
    y_edges: np.ndarray,
    resolution: int,
    percentile: float = HOTSPOT_THRESHOLD_PERCENTILE,
) -> list[dict[str, float]]:
    """
    Identify hotspot regions in the smoothed heatmap.

    A *hotspot* is any grid cell whose intensity exceeds the given
    percentile of the overall distribution.

    Parameters
    ----------
    heatmap : np.ndarray
        2D smoothed density array (shape ``[resolution, resolution]``).
    x_edges, y_edges : np.ndarray
        Bin edges from ``np.histogram2d``.
    resolution : int
        Number of bins per axis.
    percentile : float
        Intensity threshold percentile (e.g. 90 → top 10 %).

    Returns
    -------
    list[dict]
        Each dict: ``{"x": float, "y": float, "intensity": float}``
        where x/y are the bin-centre coordinates (normalised).
    """
    try:
        if heatmap.max() == 0:
            return []

        threshold = np.percentile(heatmap, percentile)
        hotspot_indices = np.argwhere(heatmap >= threshold)

        hotspots: list[dict[str, float]] = []
        for row, col in hotspot_indices:
            # Convert grid indices back to normalised coordinates (bin centres)
            x_centre = float((x_edges[col] + x_edges[col + 1]) / 2.0) if col < len(x_edges) - 1 else 0.0
            y_centre = float((y_edges[row] + y_edges[row + 1]) / 2.0) if row < len(y_edges) - 1 else 0.0
            intensity = float(heatmap[row, col])

            hotspots.append({
                "x": round(x_centre, 4),
                "y": round(y_centre, 4),
                "intensity": round(intensity, 4),
            })

        # Sort by intensity descending, keep top 20
        hotspots.sort(key=lambda h: h["intensity"], reverse=True)
        return hotspots[:20]

    except Exception:
        return []

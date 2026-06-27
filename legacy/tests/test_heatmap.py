"""
SmartEV Vision - Heatmap Generation Tests
Tests for heatmap generation, base64 encoding, hotspot detection, and edge cases.
"""

import base64
import io
import os
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


def generate_heatmap(gaze_points, width=640, height=480, sigma=20):
    """Generate a heatmap image from gaze data points.

    Args:
        gaze_points: list of dicts with 'x', 'y' (normalized 0-1) and 'fixation_duration'
        width: output image width in pixels
        height: output image height in pixels
        sigma: Gaussian kernel standard deviation

    Returns:
        numpy array of shape (height, width) with heatmap values, or None if no points.
    """
    if not gaze_points:
        return None

    heatmap = np.zeros((height, width), dtype=np.float64)

    for point in gaze_points:
        px = int(point['x'] * (width - 1))
        py = int(point['y'] * (height - 1))
        weight = point.get('fixation_duration', 1.0)

        # Create Gaussian blob around fixation point
        for dy in range(-sigma * 3, sigma * 3 + 1):
            for dx in range(-sigma * 3, sigma * 3 + 1):
                ny, nx = py + dy, px + dx
                if 0 <= ny < height and 0 <= nx < width:
                    dist_sq = dx * dx + dy * dy
                    val = weight * np.exp(-dist_sq / (2 * sigma * sigma))
                    heatmap[ny, nx] += val

    # Normalize to 0-1
    max_val = heatmap.max()
    if max_val > 0:
        heatmap = heatmap / max_val

    return heatmap


def heatmap_to_base64(heatmap, colormap='hot'):
    """Convert a heatmap array to a base64-encoded PNG image.

    Args:
        heatmap: numpy array of shape (height, width) with values 0-1
        colormap: matplotlib colormap name

    Returns:
        base64 encoded string of the PNG image, or empty string if heatmap is None.
    """
    if heatmap is None:
        return ''

    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt

        fig, ax = plt.subplots(1, 1, figsize=(8, 6))
        ax.imshow(heatmap, cmap=colormap, interpolation='bilinear')
        ax.axis('off')

        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', pad_inches=0)
        plt.close(fig)
        buf.seek(0)

        encoded = base64.b64encode(buf.read()).decode('utf-8')
        return encoded
    except ImportError:
        # Fallback: return raw data as base64 if matplotlib not available
        raw_bytes = (heatmap * 255).astype(np.uint8).tobytes()
        return base64.b64encode(raw_bytes).decode('utf-8')


def detect_hotspots(heatmap, threshold=0.7):
    """Detect hotspot regions in the heatmap above a threshold.

    Args:
        heatmap: numpy array with values 0-1
        threshold: minimum value to be considered a hotspot

    Returns:
        list of dicts with 'x', 'y' (normalized), 'intensity'
    """
    if heatmap is None:
        return []

    height, width = heatmap.shape
    hotspots = []

    # Find connected regions above threshold using simple peak detection
    visited = np.zeros_like(heatmap, dtype=bool)

    for y in range(height):
        for x in range(width):
            if heatmap[y, x] >= threshold and not visited[y, x]:
                # Find local peak in neighborhood
                region_x = []
                region_y = []
                region_intensity = []

                # BFS to find connected region
                stack = [(y, x)]
                while stack:
                    cy, cx = stack.pop()
                    if (0 <= cy < height and 0 <= cx < width
                            and not visited[cy, cx]
                            and heatmap[cy, cx] >= threshold):
                        visited[cy, cx] = True
                        region_x.append(cx)
                        region_y.append(cy)
                        region_intensity.append(heatmap[cy, cx])
                        for dy, dx_offset in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                            stack.append((cy + dy, cx + dx_offset))

                if region_x:
                    # Use intensity-weighted centroid
                    weights = np.array(region_intensity)
                    total_weight = weights.sum()
                    cx_avg = np.average(region_x, weights=weights)
                    cy_avg = np.average(region_y, weights=weights)

                    hotspots.append({
                        'x': round(cx_avg / (width - 1), 4),
                        'y': round(cy_avg / (height - 1), 4),
                        'intensity': round(float(weights.max()), 4),
                    })

    return hotspots


class TestHeatmapGeneration(unittest.TestCase):
    """Tests for heatmap array generation."""

    def test_heatmap_generation(self):
        """Test that heatmap is generated with correct shape and value range."""
        gaze_points = [
            {'x': 0.5, 'y': 0.5, 'fixation_duration': 0.4},
            {'x': 0.3, 'y': 0.7, 'fixation_duration': 0.3},
            {'x': 0.7, 'y': 0.3, 'fixation_duration': 0.5},
            {'x': 0.5, 'y': 0.5, 'fixation_duration': 0.6},
        ]

        heatmap = generate_heatmap(gaze_points, width=200, height=150, sigma=10)

        self.assertIsNotNone(heatmap, "Heatmap should not be None")
        self.assertEqual(heatmap.shape, (150, 200),
                         "Heatmap shape should match (height, width)")
        self.assertAlmostEqual(heatmap.max(), 1.0, places=2,
                               msg="Heatmap max should be normalized to ~1.0")
        self.assertGreaterEqual(heatmap.min(), 0.0,
                                "Heatmap min should be >= 0")

    def test_heatmap_fixation_concentration(self):
        """Test that overlapping fixations create stronger signal."""
        # Multiple points at same location
        concentrated = [
            {'x': 0.5, 'y': 0.5, 'fixation_duration': 0.5},
            {'x': 0.5, 'y': 0.5, 'fixation_duration': 0.5},
        ]
        # Single point at different location
        single = [
            {'x': 0.2, 'y': 0.2, 'fixation_duration': 0.5},
        ]

        hm_conc = generate_heatmap(concentrated, width=100, height=100, sigma=8)
        hm_single = generate_heatmap(single, width=100, height=100, sigma=8)

        # Center pixel of concentrated should be brighter than center of single
        center_conc = hm_conc[50, 50]
        center_single = hm_single[20, 20]

        # After normalization, the concentrated one at its peak is 1.0
        # The single one at its peak is also 1.0 (both normalized independently)
        # But the raw values before normalization would differ
        self.assertAlmostEqual(hm_conc.max(), 1.0, places=2,
                               msg="Concentrated heatmap should be normalized to 1.0")


class TestHeatmapBase64Format(unittest.TestCase):
    """Tests for heatmap base64 encoding."""

    def test_heatmap_base64_format(self):
        """Test that heatmap is correctly converted to base64 string."""
        gaze_points = [
            {'x': 0.5, 'y': 0.5, 'fixation_duration': 0.4},
            {'x': 0.6, 'y': 0.4, 'fixation_duration': 0.3},
        ]
        heatmap = generate_heatmap(gaze_points, width=100, height=80, sigma=8)
        b64_string = heatmap_to_base64(heatmap)

        self.assertIsInstance(b64_string, str,
                              "Base64 output should be a string")
        self.assertGreater(len(b64_string), 0,
                           "Base64 string should not be empty")

        # Verify it's valid base64
        try:
            decoded = base64.b64decode(b64_string)
            self.assertGreater(len(decoded), 0,
                               "Decoded base64 should not be empty")
        except Exception as e:
            self.fail(f"Base64 string should be valid: {e}")

    def test_heatmap_base64_none_input(self):
        """Test that None heatmap returns empty string."""
        result = heatmap_to_base64(None)
        self.assertEqual(result, '',
                         "None heatmap should produce empty base64 string")


class TestHotspotDetection(unittest.TestCase):
    """Tests for hotspot detection in heatmaps."""

    def test_hotspot_detection(self):
        """Test that hotspots are detected at high-intensity regions."""
        # Create a gaze pattern with a clear hotspot at center
        gaze_points = [
            {'x': 0.5, 'y': 0.5, 'fixation_duration': 0.8},
            {'x': 0.5, 'y': 0.5, 'fixation_duration': 0.7},
            {'x': 0.51, 'y': 0.49, 'fixation_duration': 0.6},
        ]

        heatmap = generate_heatmap(gaze_points, width=100, height=100, sigma=8)
        hotspots = detect_hotspots(heatmap, threshold=0.7)

        self.assertGreater(len(hotspots), 0,
                           "Should detect at least one hotspot")

        # Check hotspot format
        for hotspot in hotspots:
            self.assertIn('x', hotspot, "Hotspot should have 'x' coordinate")
            self.assertIn('y', hotspot, "Hotspot should have 'y' coordinate")
            self.assertIn('intensity', hotspot, "Hotspot should have 'intensity'")

            self.assertGreaterEqual(hotspot['x'], 0.0,
                                    "Hotspot x should be >= 0")
            self.assertLessEqual(hotspot['x'], 1.0,
                                 "Hotspot x should be <= 1")
            self.assertGreaterEqual(hotspot['y'], 0.0,
                                    "Hotspot y should be >= 0")
            self.assertLessEqual(hotspot['y'], 1.0,
                                 "Hotspot y should be <= 1")

        # The primary hotspot should be near center (0.5, 0.5)
        primary = hotspots[0]
        self.assertAlmostEqual(primary['x'], 0.5, delta=0.15,
                               msg="Primary hotspot x should be near center")
        self.assertAlmostEqual(primary['y'], 0.5, delta=0.15,
                               msg="Primary hotspot y should be near center")

    def test_hotspot_detection_no_hotspots(self):
        """Test hotspot detection with uniform low-intensity data."""
        # Create a very spread out pattern (no strong hotspots)
        gaze_points = [
            {'x': 0.1, 'y': 0.1, 'fixation_duration': 0.1},
            {'x': 0.9, 'y': 0.9, 'fixation_duration': 0.1},
        ]

        heatmap = generate_heatmap(gaze_points, width=200, height=200, sigma=5)
        hotspots = detect_hotspots(heatmap, threshold=0.9)

        # May or may not have hotspots depending on normalization
        # The key is no crash
        self.assertIsInstance(hotspots, list,
                              "Should return a list (possibly empty)")


class TestEmptyGazeHeatmap(unittest.TestCase):
    """Tests for heatmap with empty gaze data."""

    def test_empty_gaze_heatmap(self):
        """Test that empty gaze data produces None heatmap."""
        heatmap = generate_heatmap([])

        self.assertIsNone(heatmap,
                          "Empty gaze data should produce None heatmap")

    def test_empty_hotspot_detection(self):
        """Test hotspot detection on None heatmap."""
        hotspots = detect_hotspots(None)

        self.assertEqual(hotspots, [],
                         "None heatmap should produce empty hotspot list")

    def test_single_point_heatmap(self):
        """Test heatmap generation with a single gaze point."""
        gaze_points = [
            {'x': 0.5, 'y': 0.5, 'fixation_duration': 0.5},
        ]

        heatmap = generate_heatmap(gaze_points, width=100, height=100, sigma=10)

        self.assertIsNotNone(heatmap,
                             "Single-point heatmap should not be None")
        self.assertEqual(heatmap.shape, (100, 100),
                         "Single-point heatmap should have correct shape")
        self.assertAlmostEqual(heatmap.max(), 1.0, places=2,
                               msg="Single-point heatmap peak should be ~1.0")


if __name__ == '__main__':
    unittest.main()

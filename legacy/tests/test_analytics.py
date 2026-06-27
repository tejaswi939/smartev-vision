"""
SmartEV Vision - Analytics Service Tests
Tests for attention duration, engagement score, component ranking, and AOI classification.
"""

import os
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from setup_db import setup_database


COMPONENTS = ['hood', 'body', 'wheels', 'windshield', 'headlights', 'interior']


def classify_aoi(x, y):
    """Classify a gaze point (x, y) into an Area of Interest label.

    Uses normalized coordinates (0-1) with bounding boxes for each vehicle component.
    """
    aoi_bounds = {
        'windshield':  {'x_min': 0.30, 'x_max': 0.70, 'y_min': 0.15, 'y_max': 0.40},
        'hood':        {'x_min': 0.25, 'x_max': 0.75, 'y_min': 0.55, 'y_max': 0.75},
        'wheels':      {'x_min': 0.10, 'x_max': 0.90, 'y_min': 0.70, 'y_max': 0.90},
        'headlights':  {'x_min': 0.05, 'x_max': 0.30, 'y_min': 0.40, 'y_max': 0.60},
        'body':        {'x_min': 0.10, 'x_max': 0.90, 'y_min': 0.30, 'y_max': 0.65},
        'interior':    {'x_min': 0.35, 'x_max': 0.65, 'y_min': 0.20, 'y_max': 0.50},
    }
    for label, bounds in aoi_bounds.items():
        if (bounds['x_min'] <= x <= bounds['x_max'] and
                bounds['y_min'] <= y <= bounds['y_max']):
            return label
    return 'other'


def calculate_attention_durations(gaze_data):
    """Calculate total fixation duration per area from gaze data."""
    durations = {}
    for point in gaze_data:
        area = point.get('area_label', 'other')
        dur = point.get('fixation_duration', 0.0)
        durations[area] = durations.get(area, 0.0) + dur
    return durations


def calculate_engagement_score(session_duration, attention_durations, revisit_counts):
    """Calculate engagement score from session data.

    Engagement = weighted combination of:
      - focus_ratio: total fixation time / session duration (weight 0.4)
      - diversity: how many different components were viewed (weight 0.3)
      - revisit_intensity: average revisits across components (weight 0.3)
    """
    if session_duration <= 0:
        return 0.0

    total_fixation = sum(attention_durations.values())
    focus_ratio = min(1.0, total_fixation / session_duration)

    viewed_components = sum(1 for d in attention_durations.values() if d > 0)
    diversity = viewed_components / len(COMPONENTS)

    total_revisits = sum(revisit_counts.values()) if revisit_counts else 0
    num_components = max(1, len(revisit_counts))
    revisit_intensity = min(1.0, (total_revisits / num_components) / 10.0)

    engagement = 0.4 * focus_ratio + 0.3 * diversity + 0.3 * revisit_intensity
    return round(min(1.0, max(0.0, engagement)), 4)


def get_most_viewed_component(vehicle_views):
    """Return the component with the highest total_duration."""
    if not vehicle_views:
        return None
    return max(vehicle_views, key=lambda v: v.get('total_duration', 0.0))['component']


class TestAttentionDurationCalculation(unittest.TestCase):
    """Tests for attention duration computation."""

    def test_attention_duration_calculation(self):
        """Test that fixation durations are summed correctly per area."""
        gaze_data = [
            {'area_label': 'body', 'fixation_duration': 0.35},
            {'area_label': 'body', 'fixation_duration': 0.45},
            {'area_label': 'hood', 'fixation_duration': 0.20},
            {'area_label': 'wheels', 'fixation_duration': 0.50},
            {'area_label': 'hood', 'fixation_duration': 0.30},
        ]

        durations = calculate_attention_durations(gaze_data)

        self.assertAlmostEqual(durations['body'], 0.80, places=2,
                               msg="Body attention should be sum of fixations (0.35 + 0.45)")
        self.assertAlmostEqual(durations['hood'], 0.50, places=2,
                               msg="Hood attention should be sum of fixations (0.20 + 0.30)")
        self.assertAlmostEqual(durations['wheels'], 0.50, places=2,
                               msg="Wheels attention should be 0.50")
        self.assertNotIn('interior', durations,
                         msg="Interior should not appear if no gaze points")


class TestEngagementScoreCalculation(unittest.TestCase):
    """Tests for engagement score computation."""

    def test_engagement_score_calculation(self):
        """Test engagement score with typical session data."""
        session_duration = 120.0
        attention_durations = {
            'body': 25.0,
            'hood': 15.0,
            'wheels': 10.0,
            'windshield': 12.0,
            'headlights': 8.0,
            'interior': 20.0,
        }
        revisit_counts = {
            'body': 5, 'hood': 3, 'wheels': 2,
            'windshield': 4, 'headlights': 1, 'interior': 6,
        }

        score = calculate_engagement_score(session_duration, attention_durations, revisit_counts)

        self.assertGreater(score, 0.0, "Engagement score should be positive")
        self.assertLessEqual(score, 1.0, "Engagement score should not exceed 1.0")
        self.assertIsInstance(score, float, "Engagement score should be a float")

    def test_engagement_score_zero_duration(self):
        """Test engagement score returns 0 for zero-duration session."""
        score = calculate_engagement_score(0.0, {}, {})
        self.assertEqual(score, 0.0,
                         "Engagement score should be 0 for zero-duration session")

    def test_engagement_score_high_engagement(self):
        """Test that high fixation + diversity + revisits yields high score."""
        session_duration = 60.0
        attention_durations = {comp: 10.0 for comp in COMPONENTS}
        revisit_counts = {comp: 10 for comp in COMPONENTS}

        score = calculate_engagement_score(session_duration, attention_durations, revisit_counts)

        self.assertGreater(score, 0.7,
                           "High engagement session should score > 0.7")


class TestMostViewedComponent(unittest.TestCase):
    """Tests for most-viewed component determination."""

    def test_most_viewed_component(self):
        """Test identifying the component with most total_duration."""
        vehicle_views = [
            {'component': 'hood', 'total_duration': 12.5},
            {'component': 'body', 'total_duration': 30.2},
            {'component': 'wheels', 'total_duration': 8.0},
            {'component': 'windshield', 'total_duration': 15.0},
            {'component': 'headlights', 'total_duration': 5.5},
            {'component': 'interior', 'total_duration': 22.0},
        ]

        most_viewed = get_most_viewed_component(vehicle_views)

        self.assertEqual(most_viewed, 'body',
                         "Body should be the most viewed component (30.2s)")

    def test_empty_session_analytics(self):
        """Test analytics with no vehicle views returns None."""
        result = get_most_viewed_component([])
        self.assertIsNone(result,
                          "Most viewed component should be None for empty views")


class TestAOIClassification(unittest.TestCase):
    """Tests for Area of Interest classification."""

    def test_aoi_classification(self):
        """Test that gaze coordinates are classified into correct AOIs."""
        # Point in body region
        self.assertEqual(classify_aoi(0.50, 0.45), 'body',
                         "Center point should be classified as body")

        # Point in wheels region
        self.assertEqual(classify_aoi(0.50, 0.80), 'wheels',
                         "Lower center should be classified as wheels")

        # Point in windshield region
        self.assertEqual(classify_aoi(0.50, 0.25), 'windshield',
                         "Upper center should be classified as windshield")

        # Point in headlights region
        self.assertEqual(classify_aoi(0.15, 0.50), 'headlights',
                         "Left side should be classified as headlights")

    def test_aoi_classification_outside_bounds(self):
        """Test that points outside all AOIs are classified as 'other'."""
        result = classify_aoi(0.02, 0.02)
        self.assertEqual(result, 'other',
                         "Corner point outside all AOIs should be 'other'")

    def test_aoi_classification_boundary(self):
        """Test classification at AOI boundaries."""
        # Exact boundary of body region (x_min=0.10, y_min=0.30)
        result = classify_aoi(0.10, 0.30)
        self.assertEqual(result, 'body',
                         "Point exactly on body boundary should be classified as body")


if __name__ == '__main__':
    unittest.main()

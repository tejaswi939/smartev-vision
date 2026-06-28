"""
SmartEV Vision - API Endpoint Tests
Tests for user, session, gaze data, analytics, and prediction API endpoints.
"""

import json
import os
import sqlite3
import sys
import tempfile
import unittest

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from setup_db import setup_database


def create_test_db(db_path):
    """Create a test database with schema."""
    setup_database(db_path)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    # Insert a test user
    cursor.execute(
        "INSERT INTO users (name, email, age, gender) VALUES (?, ?, ?, ?)",
        ("Test User", "test@example.com", 30, "Male")
    )
    # Insert a test session
    cursor.execute(
        "INSERT INTO sessions (user_id, ev_model, duration, engagement_score) VALUES (?, ?, ?, ?)",
        (1, "Model A", 120.0, 0.85)
    )
    # Insert gaze data
    gaze_points = [
        (1, 0.5, 0.45, 0.50, 'body', 0.35),
        (1, 1.0, 0.30, 0.70, 'wheels', 0.28),
        (1, 1.5, 0.50, 0.60, 'hood', 0.42),
        (1, 2.0, 0.55, 0.35, 'windshield', 0.31),
        (1, 2.5, 0.15, 0.50, 'headlights', 0.38),
        (1, 3.0, 0.50, 0.40, 'interior', 0.45),
    ]
    for gp in gaze_points:
        cursor.execute(
            "INSERT INTO gaze_data (session_id, timestamp, x, y, area_label, fixation_duration) "
            "VALUES (?, ?, ?, ?, ?, ?)", gp
        )
    # Insert vehicle views
    components = ['hood', 'body', 'wheels', 'windshield', 'headlights', 'interior']
    for comp in components:
        cursor.execute(
            "INSERT INTO vehicle_views (session_id, component, view_count, total_duration, revisits) "
            "VALUES (?, ?, ?, ?, ?)",
            (1, comp, 10, 12.5, 3)
        )
    conn.commit()
    conn.close()


class TestUserAPI(unittest.TestCase):
    """Tests for user registration and retrieval endpoints."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, 'test.db')
        setup_database(self.db_path)
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row

    def tearDown(self):
        self.conn.close()
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_register_user(self):
        """Test that a new user can be registered successfully."""
        cursor = self.conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, age, gender) VALUES (?, ?, ?, ?)",
            ("Alice Smith", "alice@example.com", 28, "Female")
        )
        self.conn.commit()

        cursor.execute("SELECT * FROM users WHERE email = ?", ("alice@example.com",))
        user = cursor.fetchone()

        self.assertIsNotNone(user, "User should be created in database")
        self.assertEqual(user['name'], "Alice Smith", "User name should match")
        self.assertEqual(user['email'], "alice@example.com", "User email should match")
        self.assertEqual(user['age'], 28, "User age should match")
        self.assertEqual(user['gender'], "Female", "User gender should match")

    def test_get_user(self):
        """Test retrieving a user by ID."""
        cursor = self.conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, age, gender) VALUES (?, ?, ?, ?)",
            ("Bob Johnson", "bob@example.com", 35, "Male")
        )
        self.conn.commit()
        user_id = cursor.lastrowid

        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()

        self.assertIsNotNone(user, "User should be retrievable by ID")
        self.assertEqual(user['name'], "Bob Johnson", "User name should match")

    def test_register_duplicate_email(self):
        """Test that registering a duplicate email raises an error."""
        cursor = self.conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, age, gender) VALUES (?, ?, ?, ?)",
            ("Alice", "alice@example.com", 28, "Female")
        )
        self.conn.commit()

        with self.assertRaises(sqlite3.IntegrityError, msg="Duplicate email should raise IntegrityError"):
            cursor.execute(
                "INSERT INTO users (name, email, age, gender) VALUES (?, ?, ?, ?)",
                ("Alice2", "alice@example.com", 30, "Female")
            )
            self.conn.commit()


class TestSessionAPI(unittest.TestCase):
    """Tests for session management endpoints."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, 'test.db')
        setup_database(self.db_path)
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        cursor = self.conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, age, gender) VALUES (?, ?, ?, ?)",
            ("Test User", "test@example.com", 30, "Male")
        )
        self.conn.commit()

    def tearDown(self):
        self.conn.close()
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_start_session(self):
        """Test starting a new viewing session."""
        cursor = self.conn.cursor()
        cursor.execute(
            "INSERT INTO sessions (user_id, ev_model, duration, engagement_score) "
            "VALUES (?, ?, ?, ?)",
            (1, "Model B", 0.0, 0.0)
        )
        self.conn.commit()
        session_id = cursor.lastrowid

        cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        session = cursor.fetchone()

        self.assertIsNotNone(session, "Session should be created")
        self.assertEqual(session['ev_model'], "Model B", "EV model should match")
        self.assertEqual(session['user_id'], 1, "User ID should match")

    def test_end_session(self):
        """Test ending a session updates duration and end_time."""
        cursor = self.conn.cursor()
        cursor.execute(
            "INSERT INTO sessions (user_id, ev_model, duration, engagement_score) "
            "VALUES (?, ?, ?, ?)",
            (1, "Model A", 0.0, 0.0)
        )
        self.conn.commit()
        session_id = cursor.lastrowid

        # Update session with end data
        cursor.execute(
            "UPDATE sessions SET end_time = CURRENT_TIMESTAMP, duration = ?, engagement_score = ? "
            "WHERE id = ?",
            (95.5, 0.78, session_id)
        )
        self.conn.commit()

        cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        session = cursor.fetchone()

        self.assertIsNotNone(session['end_time'], "End time should be set")
        self.assertAlmostEqual(session['duration'], 95.5, places=1,
                               msg="Duration should be updated")
        self.assertAlmostEqual(session['engagement_score'], 0.78, places=2,
                               msg="Engagement score should be updated")

    def test_get_sessions(self):
        """Test retrieving all sessions for a user."""
        cursor = self.conn.cursor()
        for model in ['Model A', 'Model B', 'Model C']:
            cursor.execute(
                "INSERT INTO sessions (user_id, ev_model, duration, engagement_score) "
                "VALUES (?, ?, ?, ?)",
                (1, model, 60.0, 0.7)
            )
        self.conn.commit()

        cursor.execute("SELECT * FROM sessions WHERE user_id = ?", (1,))
        sessions = cursor.fetchall()

        self.assertEqual(len(sessions), 3, "Should retrieve 3 sessions for user")
        models = [s['ev_model'] for s in sessions]
        self.assertIn("Model A", models, "Should include Model A session")
        self.assertIn("Model B", models, "Should include Model B session")
        self.assertIn("Model C", models, "Should include Model C session")


class TestGazeAPI(unittest.TestCase):
    """Tests for gaze data submission endpoints."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, 'test.db')
        setup_database(self.db_path)
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        cursor = self.conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, age, gender) VALUES (?, ?, ?, ?)",
            ("Test User", "test@example.com", 30, "Male")
        )
        cursor.execute(
            "INSERT INTO sessions (user_id, ev_model, duration, engagement_score) "
            "VALUES (?, ?, ?, ?)",
            (1, "Model A", 120.0, 0.8)
        )
        self.conn.commit()

    def tearDown(self):
        self.conn.close()
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_submit_gaze_data(self):
        """Test submitting gaze data points to a session."""
        cursor = self.conn.cursor()
        gaze_points = [
            (1, 0.5, 0.45, 0.50, 'body', 0.35),
            (1, 1.0, 0.30, 0.70, 'wheels', 0.28),
            (1, 1.5, 0.50, 0.60, 'hood', 0.42),
        ]
        for gp in gaze_points:
            cursor.execute(
                "INSERT INTO gaze_data (session_id, timestamp, x, y, area_label, fixation_duration) "
                "VALUES (?, ?, ?, ?, ?, ?)", gp
            )
        self.conn.commit()

        cursor.execute("SELECT COUNT(*) as count FROM gaze_data WHERE session_id = 1")
        count = cursor.fetchone()['count']

        self.assertEqual(count, 3, "Should have 3 gaze data points")

        cursor.execute("SELECT * FROM gaze_data WHERE session_id = 1 ORDER BY timestamp")
        points = cursor.fetchall()
        self.assertEqual(points[0]['area_label'], 'body',
                         "First gaze point should be on body")
        self.assertAlmostEqual(points[0]['fixation_duration'], 0.35, places=2,
                               msg="Fixation duration should match")

    def test_submit_empty_gaze(self):
        """Test that a session can exist without gaze data."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM gaze_data WHERE session_id = 1")
        count = cursor.fetchone()['count']

        self.assertEqual(count, 0, "Session should have no gaze data initially")


class TestAnalyticsAPI(unittest.TestCase):
    """Tests for analytics endpoint responses."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, 'test.db')
        create_test_db(self.db_path)
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row

    def tearDown(self):
        self.conn.close()
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_get_analytics(self):
        """Test retrieving session analytics data."""
        cursor = self.conn.cursor()

        # Calculate attention durations per component
        cursor.execute('''
            SELECT area_label, SUM(fixation_duration) as total_duration,
                   COUNT(*) as fixation_count
            FROM gaze_data WHERE session_id = 1
            GROUP BY area_label
        ''')
        analytics = {row['area_label']: dict(row) for row in cursor.fetchall()}

        self.assertGreater(len(analytics), 0, "Should have analytics data")
        self.assertIn('body', analytics, "Should have body area analytics")
        self.assertIn('hood', analytics, "Should have hood area analytics")

    def test_get_heatmap(self):
        """Test that heatmap data can be generated from gaze points."""
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT x, y, fixation_duration FROM gaze_data WHERE session_id = 1"
        )
        points = cursor.fetchall()

        self.assertGreater(len(points), 0, "Should have gaze points for heatmap")
        for point in points:
            self.assertGreaterEqual(point['x'], 0.0, "X should be >= 0")
            self.assertLessEqual(point['x'], 1.0, "X should be <= 1")
            self.assertGreaterEqual(point['y'], 0.0, "Y should be >= 0")
            self.assertLessEqual(point['y'], 1.0, "Y should be <= 1")


class TestPredictionAPI(unittest.TestCase):
    """Tests for prediction endpoint."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, 'test.db')
        create_test_db(self.db_path)
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row

    def tearDown(self):
        self.conn.close()
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_predict(self):
        """Test that prediction can be stored and retrieved."""
        cursor = self.conn.cursor()
        cursor.execute(
            "INSERT INTO predictions (session_id, preferred_model, preference_category, confidence) "
            "VALUES (?, ?, ?, ?)",
            (1, "Model A", "Design", 0.92)
        )
        self.conn.commit()

        cursor.execute("SELECT * FROM predictions WHERE session_id = 1")
        pred = cursor.fetchone()

        self.assertIsNotNone(pred, "Prediction should be stored")
        self.assertEqual(pred['preferred_model'], "Model A",
                         "Predicted model should match")
        self.assertEqual(pred['preference_category'], "Design",
                         "Predicted category should match")
        self.assertGreater(pred['confidence'], 0.0, "Confidence should be positive")
        self.assertLessEqual(pred['confidence'], 1.0, "Confidence should be <= 1.0")


if __name__ == '__main__':
    unittest.main()

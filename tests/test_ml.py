"""
SmartEV Vision - ML Model Tests
Tests for feature extraction, model training, prediction format, and persistence.
"""

import json
import os
import pickle
import sys
import tempfile
import unittest

import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ml.predictor import PreferencePredictor, COMPONENTS


def create_mock_session_data():
    """Create realistic mock session data for testing."""
    return {
        'gaze_data': [
            {'area_label': 'body', 'fixation_duration': 0.40},
            {'area_label': 'body', 'fixation_duration': 0.35},
            {'area_label': 'hood', 'fixation_duration': 0.25},
            {'area_label': 'hood', 'fixation_duration': 0.30},
            {'area_label': 'wheels', 'fixation_duration': 0.20},
            {'area_label': 'windshield', 'fixation_duration': 0.38},
            {'area_label': 'headlights', 'fixation_duration': 0.28},
            {'area_label': 'interior', 'fixation_duration': 0.45},
            {'area_label': 'interior', 'fixation_duration': 0.42},
            {'area_label': 'body', 'fixation_duration': 0.33},
        ],
        'vehicle_views': [
            {'component': 'hood', 'view_count': 15, 'total_duration': 8.5, 'revisits': 4},
            {'component': 'body', 'view_count': 25, 'total_duration': 18.0, 'revisits': 7},
            {'component': 'wheels', 'view_count': 10, 'total_duration': 5.0, 'revisits': 2},
            {'component': 'windshield', 'view_count': 12, 'total_duration': 9.0, 'revisits': 3},
            {'component': 'headlights', 'view_count': 8, 'total_duration': 4.0, 'revisits': 2},
            {'component': 'interior', 'view_count': 20, 'total_duration': 15.0, 'revisits': 6},
        ],
        'duration': 95.0,
        'engagement_score': 0.82,
    }


def create_mock_model(temp_dir):
    """Create and save a mock Random Forest model for testing."""
    from sklearn.ensemble import RandomForestClassifier

    # Create minimal training data (20 features)
    np.random.seed(42)
    X = np.random.rand(50, 20)
    y_model = np.random.choice(['Model A', 'Model B', 'Model C'], 50)
    y_category = np.random.choice(['Performance', 'Design', 'Comfort', 'Technology'], 50)

    model_clf = RandomForestClassifier(n_estimators=10, random_state=42)
    model_clf.fit(X, y_model)

    category_clf = RandomForestClassifier(n_estimators=10, random_state=42)
    category_clf.fit(X, y_category)

    model_path = os.path.join(temp_dir, 'model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump({
            'model_classifier': model_clf,
            'category_classifier': category_clf,
        }, f)

    return model_path


class TestFeatureExtraction(unittest.TestCase):
    """Tests for feature extraction from session data."""

    def setUp(self):
        self.predictor = PreferencePredictor(model_path='nonexistent.pkl')
        self.session_data = create_mock_session_data()

    def test_feature_extraction(self):
        """Test that extract_features returns correct shape and values."""
        features = self.predictor.extract_features(self.session_data)

        self.assertEqual(features.shape, (1, 20),
                         "Features should have shape (1, 20)")

        feature_values = features[0]

        # Feature group 1: avg_gaze_duration (indices 0-5) should be > 0
        for i in range(6):
            self.assertGreaterEqual(feature_values[i], 0.0,
                                    f"avg_gaze_duration_{COMPONENTS[i]} should be >= 0")

        # Feature group 2: focus_pct (indices 6-11) should sum to ~1.0
        focus_pcts = feature_values[6:12]
        self.assertAlmostEqual(sum(focus_pcts), 1.0, places=2,
                               msg="Focus percentages should sum to approximately 1.0")

        # Feature group 3: revisits (indices 12-17) should be non-negative integers
        for i in range(12, 18):
            self.assertGreaterEqual(feature_values[i], 0.0,
                                    f"Revisit count at index {i} should be >= 0")

        # Feature 18: total_session_duration
        self.assertAlmostEqual(feature_values[18], 95.0, places=1,
                               msg="Session duration should be 95.0")

        # Feature 19: engagement_score
        self.assertAlmostEqual(feature_values[19], 0.82, places=2,
                               msg="Engagement score should be 0.82")

    def test_feature_extraction_empty_data(self):
        """Test feature extraction with minimal/empty session data."""
        empty_session = {
            'gaze_data': [],
            'vehicle_views': [],
            'duration': 0.0,
            'engagement_score': 0.0,
        }
        features = self.predictor.extract_features(empty_session)

        self.assertEqual(features.shape, (1, 20),
                         "Empty session should still produce 20 features")
        # All features should be 0 for empty session
        self.assertTrue(np.all(features == 0.0),
                        "All features should be 0 for empty session data")


class TestModelTraining(unittest.TestCase):
    """Tests for model training pipeline."""

    def test_model_training(self):
        """Test that training produces valid classifiers."""
        from sklearn.ensemble import RandomForestClassifier

        np.random.seed(42)
        X = np.random.rand(60, 20)
        y_model = np.random.choice(['Model A', 'Model B', 'Model C'], 60)

        clf = RandomForestClassifier(n_estimators=10, random_state=42)
        clf.fit(X[:48], y_model[:48])

        predictions = clf.predict(X[48:])

        self.assertEqual(len(predictions), 12,
                         "Should produce predictions for test samples")
        for pred in predictions:
            self.assertIn(pred, ['Model A', 'Model B', 'Model C'],
                          f"Prediction '{pred}' should be a valid model label")

    def test_training_with_sample_data(self):
        """Test training with data from sample_data.json if available."""
        json_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'sample_data.json')
        if not os.path.exists(json_path):
            self.skipTest("sample_data.json not found; run generate_sample_data.py first")

        with open(json_path, 'r') as f:
            data = json.load(f)

        training_data = data['training_data']
        self.assertGreater(len(training_data), 0,
                           "Training data should not be empty")

        X = np.array([entry['features'] for entry in training_data])
        y = np.array([entry['preferred_model'] for entry in training_data])

        self.assertEqual(X.shape[1], 20,
                         "Each sample should have 20 features")
        self.assertEqual(len(X), len(y),
                         "Feature matrix and labels should have same length")


class TestPredictionFormat(unittest.TestCase):
    """Tests for prediction output format and validity."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.model_path = create_mock_model(self.temp_dir)
        self.predictor = PreferencePredictor(model_path=self.model_path)
        self.predictor.load_model()

    def tearDown(self):
        if os.path.exists(self.model_path):
            os.remove(self.model_path)

    def test_prediction_format(self):
        """Test that predict returns correctly formatted dict."""
        session_data = create_mock_session_data()
        result = self.predictor.predict(session_data)

        self.assertIsInstance(result, dict,
                              "Prediction result should be a dict")

        required_keys = ['preferred_model', 'preference_category',
                         'model_confidence', 'category_confidence']
        for key in required_keys:
            self.assertIn(key, result,
                          f"Result should contain key: {key}")

    def test_prediction_categories(self):
        """Test that predictions fall within valid label sets."""
        session_data = create_mock_session_data()
        result = self.predictor.predict(session_data)

        valid_models = ['Model A', 'Model B', 'Model C']
        valid_categories = ['Performance', 'Design', 'Comfort', 'Technology']

        self.assertIn(result['preferred_model'], valid_models,
                      f"Predicted model '{result['preferred_model']}' should be valid")
        self.assertIn(result['preference_category'], valid_categories,
                      f"Predicted category '{result['preference_category']}' should be valid")

        self.assertGreaterEqual(result['model_confidence'], 0.0,
                                "Model confidence should be >= 0")
        self.assertLessEqual(result['model_confidence'], 1.0,
                             "Model confidence should be <= 1")
        self.assertGreaterEqual(result['category_confidence'], 0.0,
                                "Category confidence should be >= 0")
        self.assertLessEqual(result['category_confidence'], 1.0,
                             "Category confidence should be <= 1")

    def test_prediction_without_loading(self):
        """Test that predict raises error if model not loaded."""
        predictor = PreferencePredictor(model_path='nonexistent.pkl')

        with self.assertRaises(RuntimeError,
                               msg="Should raise RuntimeError if model not loaded"):
            predictor.predict(create_mock_session_data())


class TestModelPersistence(unittest.TestCase):
    """Tests for model save/load persistence."""

    def test_model_persistence(self):
        """Test that model can be saved and reloaded correctly."""
        temp_dir = tempfile.mkdtemp()
        model_path = create_mock_model(temp_dir)

        # Load model with predictor
        predictor = PreferencePredictor(model_path=model_path)
        result = predictor.load_model()

        self.assertTrue(result, "load_model should return True on success")
        self.assertTrue(predictor.is_ready(), "Predictor should be ready after loading")

        # Verify predictions work after reload
        session_data = create_mock_session_data()
        prediction = predictor.predict(session_data)

        self.assertIsNotNone(prediction['preferred_model'],
                             "Should produce valid prediction after reload")

        # Clean up
        os.remove(model_path)

    def test_model_load_failure(self):
        """Test that load_model returns False for invalid path."""
        predictor = PreferencePredictor(model_path='totally/fake/path.pkl')
        result = predictor.load_model()

        self.assertFalse(result, "load_model should return False for missing file")
        self.assertFalse(predictor.is_ready(),
                         "Predictor should not be ready after failed load")


if __name__ == '__main__':
    unittest.main()

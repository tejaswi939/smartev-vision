"""
SmartEV Vision - Prediction Interface
Loads trained models and provides preference predictions from session gaze data.
"""

import pickle
import os
import numpy as np


COMPONENTS = ['hood', 'body', 'wheels', 'windshield', 'headlights', 'interior']


class PreferencePredictor:
    """Prediction interface for EV preference classification."""

    def __init__(self, model_path='ml/model.pkl'):
        self.model_path = model_path
        self.model_classifier = None
        self.category_classifier = None
        self._ready = False

    def load_model(self) -> bool:
        """Load trained models from pickle file.

        Returns:
            True if models loaded successfully, False otherwise.
        """
        try:
            if not os.path.exists(self.model_path):
                print(f"Model file not found: {self.model_path}")
                return False

            with open(self.model_path, 'rb') as f:
                models = pickle.load(f)

            self.model_classifier = models.get('model_classifier')
            self.category_classifier = models.get('category_classifier')

            if self.model_classifier is None or self.category_classifier is None:
                print("Model file is missing one or both classifiers.")
                return False

            self._ready = True
            print("Models loaded successfully.")
            return True

        except Exception as e:
            print(f"Error loading models: {e}")
            self._ready = False
            return False

    def extract_features(self, session_data: dict) -> np.ndarray:
        """Extract 20 features from session data.

        Args:
            session_data: dict with keys:
                - gaze_data: list of gaze points with area_label and fixation_duration
                - vehicle_views: list of component view records
                - duration: total session duration in seconds
                - engagement_score: float engagement metric

        Returns:
            numpy array of 20 features.
        """
        features = []

        # Extract vehicle_views data keyed by component
        views_by_component = {}
        if 'vehicle_views' in session_data:
            for view in session_data['vehicle_views']:
                comp = view.get('component', '').lower()
                views_by_component[comp] = view

        # Calculate gaze durations per area from gaze_data
        gaze_durations = {comp: [] for comp in COMPONENTS}
        if 'gaze_data' in session_data:
            for point in session_data['gaze_data']:
                area = point.get('area_label', '').lower()
                duration = point.get('fixation_duration', 0.0)
                if area in gaze_durations:
                    gaze_durations[area].append(duration)

        # Feature group 1: avg_gaze_duration per component (6 features)
        for comp in COMPONENTS:
            durations = gaze_durations[comp]
            if durations:
                features.append(np.mean(durations))
            else:
                # Fallback to vehicle_views total_duration / view_count
                view = views_by_component.get(comp, {})
                count = view.get('view_count', 0)
                total = view.get('total_duration', 0.0)
                features.append(total / count if count > 0 else 0.0)

        # Feature group 2: focus_pct per component (6 features)
        total_gaze_duration = sum(
            sum(durs) for durs in gaze_durations.values()
        )
        if total_gaze_duration == 0:
            # Fallback: use vehicle_views total_duration
            total_gaze_duration = sum(
                views_by_component.get(c, {}).get('total_duration', 0.0)
                for c in COMPONENTS
            )

        for comp in COMPONENTS:
            comp_total = sum(gaze_durations[comp])
            if comp_total == 0:
                comp_total = views_by_component.get(comp, {}).get('total_duration', 0.0)
            if total_gaze_duration > 0:
                features.append(comp_total / total_gaze_duration)
            else:
                features.append(0.0)

        # Feature group 3: revisits per component (6 features)
        for comp in COMPONENTS:
            view = views_by_component.get(comp, {})
            features.append(float(view.get('revisits', 0)))

        # Feature group 4: total_session_duration (1 feature)
        features.append(float(session_data.get('duration', 0.0)))

        # Feature group 5: engagement_score (1 feature)
        features.append(float(session_data.get('engagement_score', 0.0)))

        return np.array(features).reshape(1, -1)

    def predict(self, session_data: dict) -> dict:
        """Make preference predictions for a session.

        Args:
            session_data: dict with gaze/view data (see extract_features).

        Returns:
            dict with:
                - preferred_model: str ("Model A", "Model B", or "Model C")
                - preference_category: str ("Performance", "Design", "Comfort", "Technology")
                - model_confidence: float (0-1)
                - category_confidence: float (0-1)
        """
        if not self._ready:
            raise RuntimeError("Models not loaded. Call load_model() first.")

        features = self.extract_features(session_data)

        # Predict preferred model
        model_pred = self.model_classifier.predict(features)[0]
        model_proba = self.model_classifier.predict_proba(features)[0]
        model_confidence = float(np.max(model_proba))

        # Predict preference category
        category_pred = self.category_classifier.predict(features)[0]
        category_proba = self.category_classifier.predict_proba(features)[0]
        category_confidence = float(np.max(category_proba))

        return {
            'preferred_model': model_pred,
            'preference_category': category_pred,
            'model_confidence': model_confidence,
            'category_confidence': category_confidence,
        }

    def is_ready(self) -> bool:
        """Check if models are loaded and ready for prediction."""
        return self._ready

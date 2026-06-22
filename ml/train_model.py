"""
SmartEV Vision - Model Training Script
Trains Random Forest classifiers for preferred_model and preference_category prediction.
"""

import json
import os
import pickle
import sqlite3

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split


COMPONENTS = ['hood', 'body', 'wheels', 'windshield', 'headlights', 'interior']


def load_training_data_from_json(json_path='data/sample_data.json'):
    """Load training data from the pre-generated JSON file."""
    with open(json_path, 'r') as f:
        data = json.load(f)

    training_data = data['training_data']
    X = np.array([entry['features'] for entry in training_data])
    y_model = np.array([entry['preferred_model'] for entry in training_data])
    y_category = np.array([entry['preference_category'] for entry in training_data])

    return X, y_model, y_category


def load_training_data_from_db(db_path='data/smartev.db'):
    """Load and engineer features from SQLite database tables."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get all sessions with predictions
    cursor.execute('''
        SELECT s.id as session_id, s.duration, s.engagement_score,
               p.preferred_model, p.preference_category
        FROM sessions s
        JOIN predictions p ON p.session_id = s.id
        WHERE p.preferred_model IS NOT NULL
          AND p.preference_category IS NOT NULL
    ''')
    sessions = cursor.fetchall()

    X = []
    y_model = []
    y_category = []

    for session in sessions:
        session_id = session['session_id']
        features = []

        # Get vehicle_views for this session
        cursor.execute(
            'SELECT component, view_count, total_duration, revisits '
            'FROM vehicle_views WHERE session_id = ?',
            (session_id,)
        )
        views = {row['component'].lower(): dict(row) for row in cursor.fetchall()}

        # Feature group 1: avg_gaze_duration per component (6 features)
        for comp in COMPONENTS:
            view = views.get(comp, {})
            count = view.get('view_count', 0)
            total = view.get('total_duration', 0.0)
            features.append(total / count if count > 0 else 0.0)

        # Feature group 2: focus_pct per component (6 features)
        total_duration_all = sum(
            views.get(c, {}).get('total_duration', 0.0) for c in COMPONENTS
        )
        for comp in COMPONENTS:
            comp_dur = views.get(comp, {}).get('total_duration', 0.0)
            features.append(comp_dur / total_duration_all if total_duration_all > 0 else 0.0)

        # Feature group 3: revisits per component (6 features)
        for comp in COMPONENTS:
            features.append(float(views.get(comp, {}).get('revisits', 0)))

        # Feature group 4: total_session_duration (1 feature)
        features.append(float(session['duration'] or 0.0))

        # Feature group 5: engagement_score (1 feature)
        features.append(float(session['engagement_score'] or 0.0))

        X.append(features)
        y_model.append(session['preferred_model'])
        y_category.append(session['preference_category'])

    conn.close()
    return np.array(X), np.array(y_model), np.array(y_category)


def train_and_evaluate():
    """Train Random Forest classifiers and save to disk."""
    # Try loading from JSON first, fallback to database
    json_path = 'data/sample_data.json'
    db_path = 'data/smartev.db'

    if os.path.exists(json_path):
        print(f"Loading training data from {json_path}...")
        X, y_model, y_category = load_training_data_from_json(json_path)
    elif os.path.exists(db_path):
        print(f"Loading training data from {db_path}...")
        X, y_model, y_category = load_training_data_from_db(db_path)
    else:
        print("ERROR: No training data found.")
        print("Run 'python generate_sample_data.py' first to generate training data.")
        return

    print(f"Loaded {len(X)} training samples with {X.shape[1]} features each.\n")

    # 80/20 train/test split
    X_train, X_test, y_model_train, y_model_test, y_cat_train, y_cat_test = \
        train_test_split(X, y_model, y_category, test_size=0.2, random_state=42)

    print(f"Training set: {len(X_train)} samples")
    print(f"Test set:     {len(X_test)} samples\n")

    # ---- Train model_classifier (preferred_model) ----
    print("=" * 60)
    print("TRAINING: Preferred Model Classifier")
    print("=" * 60)

    model_clf = RandomForestClassifier(
        n_estimators=100, random_state=42, max_depth=10, min_samples_split=3
    )
    model_clf.fit(X_train, y_model_train)

    y_model_pred = model_clf.predict(X_test)

    print("\nClassification Report (Preferred Model):")
    print(classification_report(y_model_test, y_model_pred))

    print("Confusion Matrix (Preferred Model):")
    print(confusion_matrix(y_model_test, y_model_pred))
    print()

    # ---- Train category_classifier (preference_category) ----
    print("=" * 60)
    print("TRAINING: Preference Category Classifier")
    print("=" * 60)

    category_clf = RandomForestClassifier(
        n_estimators=100, random_state=42, max_depth=10, min_samples_split=3
    )
    category_clf.fit(X_train, y_cat_train)

    y_cat_pred = category_clf.predict(X_test)

    print("\nClassification Report (Preference Category):")
    print(classification_report(y_cat_test, y_cat_pred))

    print("Confusion Matrix (Preference Category):")
    print(confusion_matrix(y_cat_test, y_cat_pred))
    print()

    # ---- Feature importance ranking ----
    feature_names = []
    for comp in COMPONENTS:
        feature_names.append(f'avg_gaze_duration_{comp}')
    for comp in COMPONENTS:
        feature_names.append(f'focus_pct_{comp}')
    for comp in COMPONENTS:
        feature_names.append(f'revisits_{comp}')
    feature_names.append('total_session_duration')
    feature_names.append('engagement_score')

    print("=" * 60)
    print("FEATURE IMPORTANCE RANKING (Model Classifier)")
    print("=" * 60)
    model_importances = model_clf.feature_importances_
    sorted_idx = np.argsort(model_importances)[::-1]
    for i, idx in enumerate(sorted_idx):
        print(f"  {i + 1:2d}. {feature_names[idx]:<35s} {model_importances[idx]:.4f}")

    print()
    print("=" * 60)
    print("FEATURE IMPORTANCE RANKING (Category Classifier)")
    print("=" * 60)
    cat_importances = category_clf.feature_importances_
    sorted_idx = np.argsort(cat_importances)[::-1]
    for i, idx in enumerate(sorted_idx):
        print(f"  {i + 1:2d}. {feature_names[idx]:<35s} {cat_importances[idx]:.4f}")

    # ---- Save models ----
    os.makedirs('ml', exist_ok=True)

    # Save individual models
    with open('ml/model_preference.pkl', 'wb') as f:
        pickle.dump(model_clf, f)
    print(f"\nSaved model classifier to ml/model_preference.pkl")

    with open('ml/category_preference.pkl', 'wb') as f:
        pickle.dump(category_clf, f)
    print(f"Saved category classifier to ml/category_preference.pkl")

    # Save combined dict for backward compatibility
    combined = {
        'model_classifier': model_clf,
        'category_classifier': category_clf,
    }
    with open('ml/model.pkl', 'wb') as f:
        pickle.dump(combined, f)
    print(f"Saved combined model to ml/model.pkl")

    print("\nTraining complete!")


if __name__ == '__main__':
    train_and_evaluate()

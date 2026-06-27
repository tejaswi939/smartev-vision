"""
SmartEV Vision - Realistic Sample Data Generator
Generates 20 users, 100 sessions with gaze data, vehicle_views, and preference labels.
"""

import json
import os
import random
import sqlite3
import math
from datetime import datetime, timedelta

from setup_db import setup_database


COMPONENTS = ['hood', 'body', 'wheels', 'windshield', 'headlights', 'interior']
EV_MODELS = ['Model A', 'Model B', 'Model C']
CATEGORIES = ['Performance', 'Design', 'Comfort', 'Technology']

# Area bounding boxes (normalized 0-1 screen coordinates)
AREA_BOUNDS = {
    'hood':        {'x_min': 0.25, 'x_max': 0.75, 'y_min': 0.55, 'y_max': 0.75},
    'body':        {'x_min': 0.10, 'x_max': 0.90, 'y_min': 0.30, 'y_max': 0.65},
    'wheels':      {'x_min': 0.10, 'x_max': 0.90, 'y_min': 0.70, 'y_max': 0.90},
    'windshield':  {'x_min': 0.30, 'x_max': 0.70, 'y_min': 0.15, 'y_max': 0.40},
    'headlights':  {'x_min': 0.05, 'x_max': 0.30, 'y_min': 0.40, 'y_max': 0.60},
    'interior':    {'x_min': 0.35, 'x_max': 0.65, 'y_min': 0.20, 'y_max': 0.50},
}

# Attention profiles: how different preference types distribute attention
# Each profile defines relative attention weights for each component
ATTENTION_PROFILES = {
    # Sedan fans: body, windshield, interior focused
    'sedan_design': {
        'hood': 0.08, 'body': 0.30, 'wheels': 0.07,
        'windshield': 0.22, 'headlights': 0.08, 'interior': 0.25,
    },
    'sedan_comfort': {
        'hood': 0.05, 'body': 0.15, 'wheels': 0.05,
        'windshield': 0.15, 'headlights': 0.05, 'interior': 0.55,
    },
    # SUV fans: wheels, body, hood focused
    'suv_performance': {
        'hood': 0.25, 'body': 0.25, 'wheels': 0.25,
        'windshield': 0.08, 'headlights': 0.10, 'interior': 0.07,
    },
    'suv_technology': {
        'hood': 0.15, 'body': 0.15, 'wheels': 0.15,
        'windshield': 0.15, 'headlights': 0.15, 'interior': 0.25,
    },
    # Sports car fans: body, headlights, hood focused
    'sports_design': {
        'hood': 0.22, 'body': 0.30, 'wheels': 0.10,
        'windshield': 0.05, 'headlights': 0.25, 'interior': 0.08,
    },
    'sports_performance': {
        'hood': 0.28, 'body': 0.22, 'wheels': 0.18,
        'windshield': 0.05, 'headlights': 0.20, 'interior': 0.07,
    },
}

# Mapping from profile to labels
PROFILE_LABELS = {
    'sedan_design':      ('Model A', 'Design'),
    'sedan_comfort':     ('Model A', 'Comfort'),
    'suv_performance':   ('Model B', 'Performance'),
    'suv_technology':    ('Model B', 'Technology'),
    'sports_design':     ('Model C', 'Design'),
    'sports_performance':('Model C', 'Performance'),
}

FIRST_NAMES = [
    'Alice', 'Bob', 'Charlie', 'Diana', 'Ethan',
    'Fiona', 'George', 'Hannah', 'Ivan', 'Julia',
    'Kevin', 'Luna', 'Marcus', 'Nina', 'Oscar',
    'Priya', 'Quinn', 'Raj', 'Sophia', 'Tyler',
]

LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones',
    'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
]


def generate_users(n=20):
    """Generate n sample users with varied demographics."""
    users = []
    for i in range(n):
        first = FIRST_NAMES[i % len(FIRST_NAMES)]
        last = LAST_NAMES[i % len(LAST_NAMES)]
        name = f"{first} {last}"
        email = f"{first.lower()}.{last.lower()}{i}@example.com"
        age = random.randint(22, 65)
        gender = random.choice(['Male', 'Female', 'Non-binary'])
        users.append({
            'name': name,
            'email': email,
            'age': age,
            'gender': gender,
        })
    return users


def generate_gaze_points(profile_weights, num_points, session_duration):
    """Generate realistic gaze data points based on attention profile weights."""
    gaze_points = []
    timestamps = sorted([random.uniform(0, session_duration) for _ in range(num_points)])

    # Determine area for each gaze point based on weights
    areas = list(profile_weights.keys())
    weights = [profile_weights[a] for a in areas]

    for i, ts in enumerate(timestamps):
        # Choose area based on attention weights with some noise
        area = random.choices(areas, weights=weights, k=1)[0]
        bounds = AREA_BOUNDS[area]

        # Generate (x, y) within area bounds with Gaussian clustering
        cx = (bounds['x_min'] + bounds['x_max']) / 2
        cy = (bounds['y_min'] + bounds['y_max']) / 2
        spread_x = (bounds['x_max'] - bounds['x_min']) / 4
        spread_y = (bounds['y_max'] - bounds['y_min']) / 4

        x = max(0.0, min(1.0, random.gauss(cx, spread_x)))
        y = max(0.0, min(1.0, random.gauss(cy, spread_y)))

        # Fixation duration: typically 100-800ms with some variation
        fixation_duration = max(0.05, random.gauss(0.35, 0.15))

        gaze_points.append({
            'timestamp': round(ts, 3),
            'x': round(x, 4),
            'y': round(y, 4),
            'area_label': area,
            'fixation_duration': round(fixation_duration, 4),
        })

    return gaze_points


def compute_vehicle_views(gaze_points):
    """Compute vehicle_views aggregates from gaze data points."""
    views = {}
    for comp in COMPONENTS:
        views[comp] = {
            'component': comp,
            'view_count': 0,
            'total_duration': 0.0,
            'revisits': 0,
        }

    # Track transitions for revisit counting
    last_area = None
    visit_tracker = {comp: False for comp in COMPONENTS}

    for point in gaze_points:
        area = point['area_label']
        if area not in views:
            continue

        views[area]['view_count'] += 1
        views[area]['total_duration'] += point['fixation_duration']

        # Count revisits: when returning to an area after looking elsewhere
        if area != last_area:
            if visit_tracker.get(area, False):
                views[area]['revisits'] += 1
            visit_tracker[area] = True
        last_area = area

    # Round total durations
    for comp in COMPONENTS:
        views[comp]['total_duration'] = round(views[comp]['total_duration'], 4)

    return [views[comp] for comp in COMPONENTS]


def compute_features(vehicle_views_list, session_duration, engagement_score):
    """Compute 20 training features from vehicle_views data."""
    views = {v['component']: v for v in vehicle_views_list}
    features = []

    # Feature group 1: avg_gaze_duration per component (6)
    for comp in COMPONENTS:
        v = views.get(comp, {})
        count = v.get('view_count', 0)
        total = v.get('total_duration', 0.0)
        features.append(round(total / count, 6) if count > 0 else 0.0)

    # Feature group 2: focus_pct per component (6)
    total_dur = sum(views.get(c, {}).get('total_duration', 0.0) for c in COMPONENTS)
    for comp in COMPONENTS:
        comp_dur = views.get(comp, {}).get('total_duration', 0.0)
        features.append(round(comp_dur / total_dur, 6) if total_dur > 0 else 0.0)

    # Feature group 3: revisits per component (6)
    for comp in COMPONENTS:
        features.append(float(views.get(comp, {}).get('revisits', 0)))

    # Feature group 4: total_session_duration (1)
    features.append(round(session_duration, 2))

    # Feature group 5: engagement_score (1)
    features.append(round(engagement_score, 4))

    return features


def generate_sample_data():
    """Generate all sample data: users, sessions, gaze_data, vehicle_views, predictions."""
    random.seed(42)

    db_path = 'data/smartev.db'

    # Setup fresh database
    if os.path.exists(db_path):
        os.remove(db_path)
    setup_database(db_path)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # ---- Generate Users ----
    users = generate_users(20)
    user_ids = []
    for user in users:
        cursor.execute(
            'INSERT INTO users (name, email, age, gender) VALUES (?, ?, ?, ?)',
            (user['name'], user['email'], user['age'], user['gender'])
        )
        user_ids.append(cursor.lastrowid)
        user['id'] = cursor.lastrowid

    print(f"Created {len(users)} users")

    # ---- Generate Sessions ----
    profile_keys = list(PROFILE_LABELS.keys())
    sessions_data = []
    training_data = []
    sessions_json = []

    base_time = datetime(2026, 1, 15, 9, 0, 0)

    for session_idx in range(100):
        user_idx = session_idx % 20
        user_id = user_ids[user_idx]

        # Assign a preference profile (determines attention patterns and labels)
        # Add some variety: each user has a primary profile but might deviate
        primary_profile = profile_keys[user_idx % len(profile_keys)]

        # 80% chance of using primary profile, 20% chance of random profile (noise)
        if random.random() < 0.80:
            profile_key = primary_profile
        else:
            profile_key = random.choice(profile_keys)

        preferred_model, preference_category = PROFILE_LABELS[profile_key]
        profile_weights = ATTENTION_PROFILES[profile_key]

        # Determine which EV model they viewed this session
        ev_model = random.choice(EV_MODELS)

        # Session timing
        session_duration = random.uniform(30, 180)  # 30s to 3min
        start_time = base_time + timedelta(hours=session_idx * 2, minutes=random.randint(0, 30))
        end_time = start_time + timedelta(seconds=session_duration)

        # Engagement score: correlated with session duration and focus concentration
        focus_concentration = max(profile_weights.values())
        engagement_score = min(1.0, max(0.0,
            0.3 + (session_duration / 300) * 0.3 + focus_concentration * 0.4
            + random.gauss(0, 0.08)
        ))
        engagement_score = round(engagement_score, 4)

        # Insert session
        cursor.execute(
            'INSERT INTO sessions (user_id, ev_model, start_time, end_time, duration, engagement_score) '
            'VALUES (?, ?, ?, ?, ?, ?)',
            (user_id, ev_model, start_time.isoformat(), end_time.isoformat(),
             round(session_duration, 2), engagement_score)
        )
        session_id = cursor.lastrowid

        # Generate gaze data (200-500 points)
        num_gaze_points = random.randint(200, 500)
        gaze_points = generate_gaze_points(profile_weights, num_gaze_points, session_duration)

        # Insert gaze data
        for point in gaze_points:
            cursor.execute(
                'INSERT INTO gaze_data (session_id, timestamp, x, y, area_label, fixation_duration) '
                'VALUES (?, ?, ?, ?, ?, ?)',
                (session_id, point['timestamp'], point['x'], point['y'],
                 point['area_label'], point['fixation_duration'])
            )

        # Compute and insert vehicle_views
        vehicle_views = compute_vehicle_views(gaze_points)
        for vv in vehicle_views:
            cursor.execute(
                'INSERT INTO vehicle_views (session_id, component, view_count, total_duration, revisits) '
                'VALUES (?, ?, ?, ?, ?)',
                (session_id, vv['component'], vv['view_count'],
                 vv['total_duration'], vv['revisits'])
            )

        # Insert prediction label
        cursor.execute(
            'INSERT INTO predictions (session_id, preferred_model, preference_category, confidence) '
            'VALUES (?, ?, ?, ?)',
            (session_id, preferred_model, preference_category, engagement_score)
        )

        # Compute features for training data
        features = compute_features(vehicle_views, session_duration, engagement_score)

        training_data.append({
            'features': features,
            'preferred_model': preferred_model,
            'preference_category': preference_category,
        })

        sessions_json.append({
            'id': session_id,
            'user_id': user_id,
            'ev_model': ev_model,
            'start_time': start_time.isoformat(),
            'end_time': end_time.isoformat(),
            'duration': round(session_duration, 2),
            'engagement_score': engagement_score,
            'preferred_model': preferred_model,
            'preference_category': preference_category,
        })

    conn.commit()
    conn.close()

    print(f"Created {len(sessions_json)} sessions")
    print(f"Generated gaze data points for all sessions")
    print(f"Computed vehicle_views aggregates")
    print(f"Assigned preference labels")

    # ---- Export to JSON ----
    # Clean users for JSON (remove db id for portability)
    users_json = []
    for u in users:
        users_json.append({
            'id': u['id'],
            'name': u['name'],
            'email': u['email'],
            'age': u['age'],
            'gender': u['gender'],
        })

    output = {
        'users': users_json,
        'sessions': sessions_json,
        'training_data': training_data,
    }

    json_path = 'data/sample_data.json'
    with open(json_path, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\nExported data to {json_path}")

    # ---- Print Summary Statistics ----
    print("\n" + "=" * 60)
    print("SAMPLE DATA SUMMARY")
    print("=" * 60)
    print(f"  Users:              {len(users)}")
    print(f"  Sessions:           {len(sessions_json)}")
    print(f"  Training samples:   {len(training_data)}")
    print(f"  Features per sample: {len(training_data[0]['features'])}")

    # Model distribution
    model_counts = {}
    cat_counts = {}
    for td in training_data:
        model_counts[td['preferred_model']] = model_counts.get(td['preferred_model'], 0) + 1
        cat_counts[td['preference_category']] = cat_counts.get(td['preference_category'], 0) + 1

    print(f"\n  Preferred Model Distribution:")
    for model, count in sorted(model_counts.items()):
        print(f"    {model}: {count} ({count/len(training_data)*100:.1f}%)")

    print(f"\n  Preference Category Distribution:")
    for cat, count in sorted(cat_counts.items()):
        print(f"    {cat}: {count} ({count/len(training_data)*100:.1f}%)")

    print(f"\n  Database saved to: {db_path}")
    print(f"  JSON saved to:     {json_path}")


if __name__ == '__main__':
    generate_sample_data()

from app.features import extract_features, FEATURE_NAMES, CANONICAL_PARTS

def test_feature_length():
    f = extract_features({"components": [], "engagementScore": 0, "interestScore": 0, "totalGazeMs": 0})
    assert len(f) == 20 == len(FEATURE_NAMES)

def test_attention_fraction_and_scores():
    payload = {
        "components": [
            {"meshName": "wheels", "totalViewMs": 300, "focusCount": 3, "entryCount": 3},
            {"meshName": "body", "totalViewMs": 100, "focusCount": 1, "entryCount": 2},
        ],
        "engagementScore": 80, "interestScore": 60, "totalGazeMs": 4000,
    }
    f = extract_features(payload)
    assert abs(f[CANONICAL_PARTS.index("wheels")] - 0.75) < 1e-6
    assert abs(f[CANONICAL_PARTS.index("body")] - 0.25) < 1e-6
    assert abs(f[FEATURE_NAMES.index("engagement")] - 0.8) < 1e-6
    assert f[FEATURE_NAMES.index("coverage")] == 2 / 15

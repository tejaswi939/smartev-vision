import pytest
from app.models import predict
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Performance archetype signature: heavy attention on wheels/body/headlights/taillights/doors
# with high engagement — matches the synthetic training distribution exactly.
PERFORMANCE_PAYLOAD = {
    "components": [
        {"meshName": "wheels",        "totalViewMs": 18000, "focusCount": 30, "entryCount": 35},
        {"meshName": "body",          "totalViewMs": 15000, "focusCount": 25, "entryCount": 28},
        {"meshName": "headlights",    "totalViewMs": 12000, "focusCount": 20, "entryCount": 22},
        {"meshName": "taillights",    "totalViewMs": 10000, "focusCount": 18, "entryCount": 20},
        {"meshName": "doors",         "totalViewMs":  8000, "focusCount": 14, "entryCount": 16},
        # Minimal residual on non-performance parts
        {"meshName": "hood",          "totalViewMs":   500, "focusCount":  1, "entryCount":  2},
        {"meshName": "mirrors",       "totalViewMs":   400, "focusCount":  1, "entryCount":  1},
    ],
    "engagementScore": 90,
    "interestScore":   88,
    "totalGazeMs":    480000,
}


def test_predict_shape():
    result = predict(PERFORMANCE_PAYLOAD)

    # ── Required keys present ──────────────────────────────────────────────────
    assert "archetype" in result
    assert "archetypeConfidence" in result
    assert "interestTier" in result
    assert "interestConfidence" in result
    assert "scores" in result
    assert "modelVersion" in result

    # ── Archetype must be "performance" for this strongly-typed payload ────────
    assert result["archetype"] == "performance", (
        f"Expected 'performance' but got '{result['archetype']}' "
        f"with scores {result['scores']['archetype']}"
    )

    # ── Confidence is a valid probability ─────────────────────────────────────
    assert 0 < result["archetypeConfidence"] <= 1

    # ── Archetype score distribution sums to ≈ 1.0 ────────────────────────────
    arch_scores = result["scores"]["archetype"]
    assert sum(arch_scores.values()) == pytest.approx(1.0, abs=1e-6)


# ── HTTP endpoint tests (TestClient) ──────────────────────────────────────────

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_model_info():
    r = client.get("/model/info")
    assert r.status_code == 200
    body = r.json()
    assert "modelVersion" in body
    assert "archetypeClasses" in body
    assert "interestClasses" in body


def test_predict_endpoint():
    r = client.post("/predict", json=PERFORMANCE_PAYLOAD)
    assert r.status_code == 200
    body = r.json()
    assert body["archetype"] in {"performance", "family", "luxury"}


# High-focus payload: focusDensity will be >= 0.6 → "engaged" emotion
HIGH_FOCUS_PAYLOAD = {
    "components": [
        {"meshName": "wheels",     "totalViewMs": 20000, "focusCount": 40, "entryCount": 42},
        {"meshName": "body",       "totalViewMs": 18000, "focusCount": 36, "entryCount": 38},
        {"meshName": "headlights", "totalViewMs": 14000, "focusCount": 28, "entryCount": 30},
    ],
    "engagementScore": 95,
    "interestScore":   90,
    "totalGazeMs":    500000,
}

_PREDICT_BODY = {
    "archetype": "performance",
    "archetypeConfidence": 0.9,
    "interestTier": "high",
    "interestConfidence": 0.85,
    "scores": {
        "archetype": {"performance": 0.9, "family": 0.05, "luxury": 0.05},
        "interestTier": {"high": 0.85, "medium": 0.1, "low": 0.05},
    },
    "modelVersion": "phase3-rf-v1",
}

_CATALOG = [
    {"slug": "rimac-nevera", "name": "Rimac Nevera", "category": "hypercar", "score": 9.5},
    {"slug": "model-x",      "name": "Tesla Model X", "category": "suv",      "score": 7.0},
]


def test_recommend_endpoint():
    body = {
        "prediction": _PREDICT_BODY,
        "catalog": _CATALOG,
        "attention": {"wheels": 0.4, "body": 0.3},
    }
    r = client.post("/recommend", json=body)
    assert r.status_code == 200
    resp = r.json()
    assert "recommendedVehicleSlug" in resp
    assert "highlightComponents" in resp
    assert "rationale" in resp
    # performance archetype → hypercar/sports preferred → Rimac Nevera
    assert resp["recommendedVehicleSlug"] == "rimac-nevera"


def test_emotion_endpoint():
    r = client.post("/emotion", json=HIGH_FOCUS_PAYLOAD)
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body["emotion"], str) and body["emotion"]
    assert 0 < body["confidence"] <= 1


def test_sentiment_endpoint():
    r = client.post("/sentiment", json={"text": "love it"})
    assert r.status_code == 200
    body = r.json()
    assert body["sentiment"] == "positive"

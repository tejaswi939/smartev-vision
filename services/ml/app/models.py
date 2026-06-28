from functools import lru_cache
import joblib
import json
from app.features import extract_features
from app.train import DEFAULT_DIR, train

@lru_cache
def _load():
    if not (DEFAULT_DIR / "archetype.joblib").exists():
        train()  # train on first use if artifacts missing (dev convenience)
    return (joblib.load(DEFAULT_DIR / "archetype.joblib"),
            joblib.load(DEFAULT_DIR / "interest.joblib"),
            json.loads((DEFAULT_DIR / "info.json").read_text()))

def predict(payload: dict) -> dict:
    arch_clf, int_clf, info = _load()
    f = [extract_features(payload)]
    ap = arch_clf.predict_proba(f)[0]
    ip = int_clf.predict_proba(f)[0]
    arch_scores = {c: float(p) for c, p in zip(arch_clf.classes_, ap)}
    int_scores = {c: float(p) for c, p in zip(int_clf.classes_, ip)}
    archetype = max(arch_scores, key=arch_scores.get)
    interest = max(int_scores, key=int_scores.get)
    return {"archetype": archetype, "archetypeConfidence": arch_scores[archetype],
            "interestTier": interest, "interestConfidence": int_scores[interest],
            "scores": {"archetype": arch_scores, "interestTier": int_scores},
            "modelVersion": info["modelVersion"]}

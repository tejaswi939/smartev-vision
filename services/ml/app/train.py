import json
from pathlib import Path
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from app.synthetic import generate
from app.features import FEATURE_NAMES

MODEL_VERSION = "phase3-rf-v1"
DEFAULT_DIR = Path(__file__).parent / "artifacts"

def _fit(X, y, seed):
    Xtr, Xv, ytr, yv = train_test_split(X, y, test_size=0.25, random_state=seed, stratify=y)
    clf = RandomForestClassifier(n_estimators=200, max_depth=12, random_state=seed)
    clf.fit(Xtr, ytr)
    return clf, accuracy_score(yv, clf.predict(Xv))

def train(seed: int = 42, artifacts_dir: Path | None = None) -> dict:
    d = Path(artifacts_dir or DEFAULT_DIR)
    d.mkdir(parents=True, exist_ok=True)
    X, ya, yt = generate(n_per_class=500, seed=seed)
    arch_clf, arch_acc = _fit(X, ya, seed)
    int_clf, int_acc = _fit(X, yt, seed)
    joblib.dump(arch_clf, d / "archetype.joblib")
    joblib.dump(int_clf, d / "interest.joblib")
    info = {"modelVersion": MODEL_VERSION, "features": FEATURE_NAMES, "archetypeClasses": list(arch_clf.classes_),
            "interestClasses": list(int_clf.classes_), "archetypeValAccuracy": round(arch_acc, 3),
            "interestValAccuracy": round(int_acc, 3)}
    (d / "info.json").write_text(json.dumps(info, indent=2))
    return info

if __name__ == "__main__":
    print(train())

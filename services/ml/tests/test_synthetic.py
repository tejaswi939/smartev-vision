import numpy as np
from app.synthetic import generate, ARCHETYPES
from app.features import FEATURE_NAMES

def test_shape_and_balance():
    X, ya, yt = generate(n_per_class=50, seed=1)
    assert X.shape == (150, len(FEATURE_NAMES))
    assert all(ya.count(a) == 50 for a in ARCHETYPES)
    assert set(yt) <= {"low", "medium", "high"}

def test_deterministic():
    a = generate(n_per_class=20, seed=7)[0]
    b = generate(n_per_class=20, seed=7)[0]
    assert np.allclose(a, b)

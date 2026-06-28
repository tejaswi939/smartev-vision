import numpy as np
from app.features import CANONICAL_PARTS

ARCHETYPES = ["performance", "family", "luxury"]
SIGNATURE = {
    "performance": ["wheels", "body", "headlights", "taillights", "doors"],
    "family": ["seats", "doors", "infotainment", "charging-port", "windows"],
    "luxury": ["infotainment", "dashboard", "seats", "steering-wheel", "mirrors"],
}
_TIERS = ["low", "medium", "high"]
_TIER_BASE = {"low": 0.30, "medium": 0.60, "high": 0.85}

def generate(n_per_class: int = 400, seed: int = 42, noise: float = 0.4):
    rng = np.random.default_rng(seed)
    rows, y_arch, y_tier = [], [], []
    for arch in ARCHETYPES:
        alpha = np.full(len(CANONICAL_PARTS), 0.3)
        for p in SIGNATURE[arch]:
            alpha[CANONICAL_PARTS.index(p)] += 4.0
        for _ in range(n_per_class):
            dist = rng.dirichlet(alpha)
            dist = (1 - noise) * dist + noise * rng.dirichlet(np.ones(len(CANONICAL_PARTS)))
            dist = dist / dist.sum()
            tier = _TIERS[rng.integers(0, 3)]
            base = _TIER_BASE[tier]
            engagement = float(np.clip(base + rng.normal(0, 0.08), 0, 1))
            interest = float(np.clip(base + rng.normal(0, 0.08), 0, 1))
            coverage = float(np.clip(base + rng.normal(0, 0.10), 0, 1))
            focus_density = float(np.clip(base + rng.normal(0, 0.10), 0, 1))
            gaze_log = float(np.clip(base + rng.normal(0, 0.10), 0, 1))
            rows.append([*dist, coverage, engagement, interest, focus_density, gaze_log])
            y_arch.append(arch)
            y_tier.append(tier)
    return np.array(rows), y_arch, y_tier

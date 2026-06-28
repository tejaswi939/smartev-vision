import math

CANONICAL_PARTS = ["body","windows","doors","hood","trunk","wheels","steering-wheel","dashboard",
                   "infotainment","battery","charging-port","mirrors","seats","headlights","taillights"]
FEATURE_NAMES = [f"attn_{p}" for p in CANONICAL_PARTS] + ["coverage","engagement","interest","focusDensity","gazeLog"]

def extract_features(payload: dict) -> list[float]:
    comps = {c["meshName"]: c for c in payload.get("components", [])}
    total = sum(c.get("totalViewMs", 0) for c in comps.values()) or 1.0
    attn = [comps.get(p, {}).get("totalViewMs", 0) / total for p in CANONICAL_PARTS]
    coverage = sum(1 for p in CANONICAL_PARTS if comps.get(p, {}).get("totalViewMs", 0) > 0) / len(CANONICAL_PARTS)
    engagement = (payload.get("engagementScore") or 0) / 100
    interest = (payload.get("interestScore") or 0) / 100
    focus = sum(c.get("focusCount", 0) for c in comps.values())
    entries = sum(c.get("entryCount", 0) for c in comps.values())
    focus_density = (min(focus / entries, 5.0) / 5.0) if entries else 0.0
    gaze_log = math.log1p(payload.get("totalGazeMs") or 0) / math.log1p(600_000)
    return [*attn, coverage, engagement, interest, focus_density, gaze_log]

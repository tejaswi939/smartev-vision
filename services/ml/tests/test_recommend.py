"""
Tests for app.recommend — TDD (written before implementation).
"""
from app.recommend import recommend
from app.synthetic import SIGNATURE


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------
CATALOG_MIXED = [
    {"slug": "ferrari-sf90", "name": "Ferrari SF90", "category": "Plug-in Hybrid Hypercar", "score": 2.0},
    {"slug": "toyota-rav4", "name": "Toyota RAV4", "category": "Electric SUV", "score": 1.5},
    {"slug": "audi-a8", "name": "Audi A8", "category": "Luxury Sedan", "score": 1.2},
]

ATTENTION_ZERO = {}  # all parts at 0 → all under 0.05 → all signature parts highlighted
ATTENTION_FULL = {p: 1.0 for arch in SIGNATURE.values() for p in arch}  # all explored → no highlights


# ---------------------------------------------------------------------------
# (a) performance archetype with a mixed catalog → recommends the hypercar
# ---------------------------------------------------------------------------
def test_performance_recommends_hypercar():
    prediction = {"archetype": "performance"}
    result = recommend(prediction, CATALOG_MIXED, ATTENTION_ZERO)
    assert result["recommendedVehicleSlug"] == "ferrari-sf90"


# ---------------------------------------------------------------------------
# (b) highlightComponents is a subset of SIGNATURE[archetype]
# ---------------------------------------------------------------------------
def test_highlight_components_subset_of_signature():
    prediction = {"archetype": "performance"}
    result = recommend(prediction, CATALOG_MIXED, ATTENTION_ZERO)
    sig = set(SIGNATURE["performance"])
    assert set(result["highlightComponents"]) <= sig


def test_highlight_components_order_matches_signature():
    """highlightComponents must preserve SIGNATURE order."""
    prediction = {"archetype": "performance"}
    result = recommend(prediction, CATALOG_MIXED, ATTENTION_ZERO)
    sig = SIGNATURE["performance"]
    highlights = result["highlightComponents"]
    # The relative order of items that appear in both lists must match SIGNATURE order
    sig_order = [p for p in sig if p in highlights]
    assert sig_order == highlights


def test_highlight_components_respects_attention_threshold():
    """Parts already explored (attention >= 0.05) must NOT appear in highlights."""
    prediction = {"archetype": "performance"}
    # Mark all performance signature parts as explored
    attention = {p: 0.1 for p in SIGNATURE["performance"]}
    result = recommend(prediction, CATALOG_MIXED, attention)
    assert result["highlightComponents"] == []


def test_highlight_components_includes_unexplored():
    """Parts with attention < 0.05 must appear in highlights."""
    prediction = {"archetype": "performance"}
    sig = SIGNATURE["performance"]
    # Explore all except the first part
    attention = {p: 0.1 for p in sig}
    del attention[sig[0]]
    result = recommend(prediction, CATALOG_MIXED, attention)
    assert sig[0] in result["highlightComponents"]


# ---------------------------------------------------------------------------
# (c) rationale is a non-empty string
# ---------------------------------------------------------------------------
def test_rationale_is_non_empty_string():
    prediction = {"archetype": "performance"}
    result = recommend(prediction, CATALOG_MIXED, ATTENTION_ZERO)
    assert isinstance(result["rationale"], str)
    assert len(result["rationale"]) > 0


# ---------------------------------------------------------------------------
# (d) empty catalog → recommendedVehicleSlug is None
# ---------------------------------------------------------------------------
def test_empty_catalog_returns_none_slug():
    prediction = {"archetype": "performance"}
    result = recommend(prediction, [], ATTENTION_ZERO)
    assert result["recommendedVehicleSlug"] is None
    assert isinstance(result["rationale"], str)
    assert len(result["rationale"]) > 0


# ---------------------------------------------------------------------------
# Fallback: no matching category → fall back to highest-score item
# ---------------------------------------------------------------------------
def test_fallback_to_highest_score_when_no_category_match():
    prediction = {"archetype": "family"}
    # No SUV in this catalog
    catalog = [
        {"slug": "ferrari-sf90", "name": "Ferrari SF90", "category": "Hypercar", "score": 2.0},
        {"slug": "audi-a8", "name": "Audi A8", "category": "Luxury Sedan", "score": 1.2},
    ]
    result = recommend(prediction, catalog, ATTENTION_ZERO)
    # Falls back to highest score = ferrari-sf90
    assert result["recommendedVehicleSlug"] == "ferrari-sf90"


# ---------------------------------------------------------------------------
# Tie-breaking: first candidate wins on equal score
# ---------------------------------------------------------------------------
def test_tie_break_first_wins():
    prediction = {"archetype": "performance"}
    catalog = [
        {"slug": "car-a", "name": "Car A", "category": "Sports Car", "score": 1.0},
        {"slug": "car-b", "name": "Car B", "category": "Hypercar", "score": 1.0},
    ]
    result = recommend(prediction, catalog, ATTENTION_ZERO)
    # car-a appears first with same score — first match wins
    assert result["recommendedVehicleSlug"] == "car-a"


# ---------------------------------------------------------------------------
# category=None treated as empty string (no match)
# ---------------------------------------------------------------------------
def test_none_category_treated_as_empty():
    prediction = {"archetype": "performance"}
    catalog = [
        {"slug": "mystery-car", "name": "Mystery Car", "category": None, "score": 9.0},
        {"slug": "ferrari-sf90", "name": "Ferrari SF90", "category": "Hypercar", "score": 2.0},
    ]
    result = recommend(prediction, catalog, ATTENTION_ZERO)
    # mystery-car has None category → treated as "" → no token match; ferrari matches "hypercar"
    assert result["recommendedVehicleSlug"] == "ferrari-sf90"


# ---------------------------------------------------------------------------
# luxury archetype also matches hypercar/sports
# ---------------------------------------------------------------------------
def test_luxury_archetype_matches_hypercar():
    prediction = {"archetype": "luxury"}
    result = recommend(prediction, CATALOG_MIXED, ATTENTION_ZERO)
    assert result["recommendedVehicleSlug"] == "ferrari-sf90"


# ---------------------------------------------------------------------------
# Return dict has exactly the required keys
# ---------------------------------------------------------------------------
def test_return_keys():
    prediction = {"archetype": "family"}
    result = recommend(prediction, CATALOG_MIXED, ATTENTION_ZERO)
    assert set(result.keys()) == {"recommendedVehicleSlug", "highlightComponents", "rationale"}

"""
Recommendation logic for SmartEV Vision.

Pure function — no model loading, no I/O.
"""
from app.synthetic import SIGNATURE

ARCH_CATEGORY: dict[str, list[str]] = {
    "performance": ["hypercar", "sports"],
    "luxury": ["hypercar", "sports"],
    "family": ["suv"],
}


def recommend(
    prediction: dict,
    catalog: list[dict],
    attention: dict[str, float],
) -> dict:
    """
    Return a recommendation dict based on the predicted archetype.

    Args:
        prediction: must contain at least {"archetype": <"performance"|"family"|"luxury">}.
        catalog:    list of dicts with keys slug, name, category (str|None), score (float).
        attention:  maps canonical part meshName → fraction (0..1).

    Returns:
        {
            "recommendedVehicleSlug": str | None,
            "highlightComponents": list[str],
            "rationale": str,
        }
    """
    archetype: str = prediction["archetype"]
    tokens: list[str] = ARCH_CATEGORY.get(archetype, [])

    # --- Step 4: find recommended vehicle ---
    recommended_slug: str | None = None
    recommended_name: str | None = None

    if catalog:
        # Candidates: items whose category (lowercased) contains any token as substring
        candidates = [
            item for item in catalog
            if any(token in (item.get("category") or "").lower() for token in tokens)
        ]

        pool = candidates if candidates else catalog
        best = max(pool, key=lambda item: item.get("score", 0))
        recommended_slug = best["slug"]
        recommended_name = best["name"]

    # --- Step 5: highlight components ---
    signature_parts: list[str] = SIGNATURE.get(archetype, [])
    highlight_components: list[str] = [
        part for part in signature_parts
        if attention.get(part, 0) < 0.05
    ]

    # --- Step 6: rationale ---
    if recommended_name:
        rationale = (
            f"Attention signature reads {archetype}; recommending {recommended_name}."
        )
    else:
        rationale = f"Attention signature reads {archetype}; no vehicles available."

    return {
        "recommendedVehicleSlug": recommended_slug,
        "highlightComponents": highlight_components,
        "rationale": rationale,
    }

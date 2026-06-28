"""Emotion detection seam for SmartEV Vision — Task 3.3 placeholder.

This module defines the EmotionDetector protocol and a heuristic implementation
that infers a coarse engagement emotion from gaze-derived features. It is NOT a
real affective-computing or computer-vision model; it exists so the emotion seam
is wired end-to-end in Phase 3. Replace HeuristicEmotionDetector with a real
webcam/face model in a later phase WITHOUT changing any caller — callers depend
only on the EmotionDetector protocol.
"""

from typing import Protocol

from app.features import FEATURE_NAMES

_COVERAGE = FEATURE_NAMES.index("coverage")
_FOCUS = FEATURE_NAMES.index("focusDensity")


class EmotionDetector(Protocol):
    def detect(self, features: list[float]) -> dict: ...


class HeuristicEmotionDetector:
    """PLACEHOLDER emotion detector for Phase 3.

    Infers a coarse engagement emotion from gaze-derived features (focus density,
    coverage) — NOT a real affective/vision model. It exists so the emotion seam is
    wired end-to-end; swap this class for a real webcam/face model later WITHOUT
    changing any caller (they depend on the EmotionDetector protocol).
    """

    def detect(self, features: list[float]) -> dict:
        focus = features[_FOCUS]
        coverage = features[_COVERAGE]
        if focus >= 0.6:
            return {"emotion": "engaged", "confidence": round(min(0.5 + focus / 2, 1.0), 3)}
        if coverage >= 0.6:
            return {"emotion": "curious", "confidence": round(min(0.5 + coverage / 2, 1.0), 3)}
        return {"emotion": "neutral", "confidence": 0.5}

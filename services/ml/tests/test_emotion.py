"""Tests for HeuristicEmotionDetector — Task 3.3 TDD."""
import pytest
from app.features import FEATURE_NAMES
from app.emotion import HeuristicEmotionDetector

_FOCUS_IDX = FEATURE_NAMES.index("focusDensity")
_COV_IDX = FEATURE_NAMES.index("coverage")


def _make_features(**slots) -> list[float]:
    """Return a zero vector of len(FEATURE_NAMES) with named slots set."""
    vec = [0.0] * len(FEATURE_NAMES)
    for name, val in slots.items():
        vec[FEATURE_NAMES.index(name)] = val
    return vec


@pytest.fixture
def detector():
    return HeuristicEmotionDetector()


class TestEngaged:
    def test_high_focus_density_returns_engaged(self, detector):
        features = _make_features(focusDensity=0.9)
        result = detector.detect(features)
        assert result["emotion"] == "engaged"

    def test_engaged_confidence_in_range(self, detector):
        features = _make_features(focusDensity=0.9)
        result = detector.detect(features)
        assert 0 < result["confidence"] <= 1.0

    def test_focus_at_threshold_returns_engaged(self, detector):
        features = _make_features(focusDensity=0.6)
        result = detector.detect(features)
        assert result["emotion"] == "engaged"

    def test_engaged_confidence_increases_with_focus(self, detector):
        low = detector.detect(_make_features(focusDensity=0.6))
        high = detector.detect(_make_features(focusDensity=1.0))
        assert high["confidence"] >= low["confidence"]


class TestCurious:
    def test_low_focus_high_coverage_returns_curious(self, detector):
        features = _make_features(focusDensity=0.1, coverage=0.9)
        result = detector.detect(features)
        assert result["emotion"] == "curious"

    def test_curious_confidence_in_range(self, detector):
        features = _make_features(focusDensity=0.1, coverage=0.9)
        result = detector.detect(features)
        assert 0 < result["confidence"] <= 1.0

    def test_coverage_at_threshold_returns_curious(self, detector):
        features = _make_features(focusDensity=0.0, coverage=0.6)
        result = detector.detect(features)
        assert result["emotion"] == "curious"


class TestNeutral:
    def test_both_low_returns_neutral(self, detector):
        features = _make_features(focusDensity=0.1, coverage=0.1)
        result = detector.detect(features)
        assert result["emotion"] == "neutral"

    def test_neutral_confidence_in_range(self, detector):
        features = _make_features(focusDensity=0.1, coverage=0.1)
        result = detector.detect(features)
        assert 0 < result["confidence"] <= 1.0

    def test_zero_features_returns_neutral(self, detector):
        features = _make_features()
        result = detector.detect(features)
        assert result["emotion"] == "neutral"


class TestConfidenceBounds:
    @pytest.mark.parametrize("focusDensity,coverage", [
        (0.9, 0.0),
        (0.0, 0.9),
        (0.1, 0.1),
        (1.0, 1.0),
        (0.6, 0.0),
        (0.0, 0.6),
    ])
    def test_confidence_always_in_bounds(self, detector, focusDensity, coverage):
        features = _make_features(focusDensity=focusDensity, coverage=coverage)
        result = detector.detect(features)
        assert 0 < result["confidence"] <= 1.0, (
            f"confidence={result['confidence']} out of (0,1] for "
            f"focusDensity={focusDensity}, coverage={coverage}"
        )

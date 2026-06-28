from functools import lru_cache

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer


@lru_cache
def _analyzer() -> SentimentIntensityAnalyzer:
    return SentimentIntensityAnalyzer()


def score(text: str) -> dict:
    """Lexicon (VADER) sentiment — a PLACEHOLDER for a trained classifier. Swap this module
    for a model without changing callers (the /sentiment contract stays {sentiment, score})."""
    compound = _analyzer().polarity_scores(text or "")["compound"]
    label = "positive" if compound >= 0.05 else "negative" if compound <= -0.05 else "neutral"
    return {"sentiment": label, "score": round(compound, 4)}

from app.sentiment import score


def test_positive():
    assert score("I absolutely love this car, it's amazing!")["sentiment"] == "positive"


def test_negative():
    assert score("This is terrible, I hate the cramped interior.")["sentiment"] == "negative"


def test_neutral():
    assert score("It is a car with four wheels.")["sentiment"] == "neutral"


def test_score_in_range():
    s = score("great")
    assert -1.0 <= s["score"] <= 1.0 and s["sentiment"] in {"positive", "neutral", "negative"}


def test_empty():
    assert score("")["sentiment"] == "neutral"

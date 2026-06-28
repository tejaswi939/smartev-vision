import json
from fastapi import FastAPI
from app.schemas import FeaturesIn, PredictionOut, RecommendIn, RecommendOut, EmotionOut, SentimentIn, SentimentOut
from app.models import predict as _predict, _load
from app.recommend import recommend as _recommend
from app.emotion import HeuristicEmotionDetector
from app.sentiment import score as _sentiment
from app.features import extract_features
from app.train import DEFAULT_DIR

app = FastAPI(title="SmartEV ML Service", version="phase3")
_emotion = HeuristicEmotionDetector()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/model/info")
def model_info():
    if not (DEFAULT_DIR / "info.json").exists():
        _load()  # ensure artifacts exist (also writes info.json)
    return json.loads((DEFAULT_DIR / "info.json").read_text())

@app.post("/predict", response_model=PredictionOut)
def predict_endpoint(body: FeaturesIn):
    return _predict(body.model_dump())

@app.post("/recommend", response_model=RecommendOut)
def recommend_endpoint(body: RecommendIn):
    return _recommend(body.prediction.model_dump(), [c.model_dump() for c in body.catalog], body.attention)

@app.post("/emotion", response_model=EmotionOut)
def emotion_endpoint(body: FeaturesIn):
    return _emotion.detect(extract_features(body.model_dump()))


@app.post("/sentiment", response_model=SentimentOut)
def sentiment_endpoint(body: SentimentIn):
    return _sentiment(body.text)

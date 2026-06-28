from pydantic import BaseModel

class ComponentAggIn(BaseModel):
    meshName: str
    totalViewMs: float = 0
    focusCount: int = 0
    entryCount: int = 0

class FeaturesIn(BaseModel):
    components: list[ComponentAggIn] = []
    engagementScore: float = 0
    interestScore: float = 0
    totalGazeMs: float = 0

class PredictionOut(BaseModel):
    archetype: str
    archetypeConfidence: float
    interestTier: str
    interestConfidence: float
    scores: dict
    modelVersion: str

class CatalogItem(BaseModel):
    slug: str
    name: str
    category: str | None = None
    score: float = 0

class RecommendIn(BaseModel):
    prediction: PredictionOut
    catalog: list[CatalogItem] = []
    attention: dict[str, float] = {}

class RecommendOut(BaseModel):
    recommendedVehicleSlug: str | None = None
    highlightComponents: list[str] = []
    rationale: str = ""

class EmotionOut(BaseModel):
    emotion: str
    confidence: float


class SentimentIn(BaseModel):
    text: str = ""


class SentimentOut(BaseModel):
    sentiment: str
    score: float

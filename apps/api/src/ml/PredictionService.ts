import type { PredictionResult, SessionFeaturesPayload, SentimentLabel } from "@sev/shared";

export interface RecommendInput {
  prediction: PredictionResult;
  catalog: { slug: string; name: string; category: string | null; score: number }[];
  attention: Record<string, number>;
}

export interface RecommendResult {
  recommendedVehicleSlug: string | null;
  highlightComponents: string[];
  rationale: string;
}

export interface PredictionService {
  predict(features: SessionFeaturesPayload): Promise<PredictionResult | null>;
  recommend(input: RecommendInput): Promise<RecommendResult | null>;
  emotion(features: SessionFeaturesPayload): Promise<{ emotion: string; confidence: number } | null>;
  sentiment(text: string): Promise<{ sentiment: SentimentLabel; score: number } | null>;
}

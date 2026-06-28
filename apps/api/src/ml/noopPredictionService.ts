import type { PredictionResult, SessionFeaturesPayload } from "@sev/shared";
import type { PredictionService, RecommendInput, RecommendResult } from "./PredictionService.js";

export class NoopPredictionService implements PredictionService {
  async predict(_features: SessionFeaturesPayload): Promise<PredictionResult | null> {
    return null;
  }

  async recommend(_input: RecommendInput): Promise<RecommendResult | null> {
    return null;
  }

  async emotion(_features: SessionFeaturesPayload): Promise<{ emotion: string; confidence: number } | null> {
    return null;
  }

  async sentiment(_text: string): Promise<null> {
    return null;
  }
}

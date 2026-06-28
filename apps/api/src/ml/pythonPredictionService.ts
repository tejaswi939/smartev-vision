import type { PredictionResult, SessionFeaturesPayload, SentimentLabel } from "@sev/shared";
import type { PredictionService, RecommendInput, RecommendResult } from "./PredictionService.js";

export class PythonPredictionService implements PredictionService {
  constructor(private readonly baseUrl: string) {}

  async predict(features: SessionFeaturesPayload): Promise<PredictionResult | null> {
    try {
      const res = await fetch(`${this.baseUrl}/predict`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(features),
        signal: AbortSignal.timeout(1500),
      });
      if (!res.ok) return null;
      return await res.json() as PredictionResult;
    } catch {
      return null;
    }
  }

  async recommend(input: RecommendInput): Promise<RecommendResult | null> {
    try {
      const res = await fetch(`${this.baseUrl}/recommend`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(1500),
      });
      if (!res.ok) return null;
      return await res.json() as RecommendResult;
    } catch {
      return null;
    }
  }

  async emotion(features: SessionFeaturesPayload): Promise<{ emotion: string; confidence: number } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/emotion`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(features),
        signal: AbortSignal.timeout(1500),
      });
      if (!res.ok) return null;
      return await res.json() as { emotion: string; confidence: number };
    } catch {
      return null;
    }
  }

  async sentiment(text: string): Promise<{ sentiment: SentimentLabel; score: number } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/sentiment`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(1500),
      });
      if (!res.ok) return null;
      return await res.json() as { sentiment: SentimentLabel; score: number };
    } catch {
      return null;
    }
  }
}

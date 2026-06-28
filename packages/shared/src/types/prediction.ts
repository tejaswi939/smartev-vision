export type Archetype = "performance" | "family" | "luxury";
export type InterestTier = "low" | "medium" | "high";

export interface ComponentAggInput {
  meshName: string;
  totalViewMs: number;
  focusCount: number;
  entryCount: number;
}

export interface SessionFeaturesPayload {
  components: ComponentAggInput[];
  engagementScore: number;
  interestScore: number;
  totalGazeMs: number;
}

export interface PredictionResult {
  archetype: Archetype;
  archetypeConfidence: number;
  interestTier: InterestTier;
  interestConfidence: number;
  scores: {
    archetype: Record<string, number>;
    interestTier: Record<string, number>;
  };
  modelVersion: string;
}

export interface PredictionDTO extends PredictionResult {
  sessionId: string;
  recommendedVehicle: { slug: string; name: string } | null;
  highlightComponents: string[];
  rationale: string | null;
  createdAt: string;
}

export interface RecommendationDTO {
  vehicleSlug: string;
  vehicleName: string;
  count: number;
  archetypes: Record<string, number>;
}

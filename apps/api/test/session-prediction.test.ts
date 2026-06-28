import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "./helpers/db.js";
import { runSeed } from "../prisma/seed.js";
import { startSession } from "../src/services/session.service.js";
import { endSession } from "../src/services/session.service.js";
import { ingestGaze } from "../src/services/gazeIngest.service.js";
import { predictionRepo } from "../src/repositories/prediction.repo.js";
import type { PredictionService, RecommendInput } from "../src/ml/PredictionService.js";
import type { PredictionResult, SessionFeaturesPayload } from "@sev/shared";

beforeAll(async () => { await runSeed(prisma); });

const fixedPrediction: PredictionResult = {
  archetype: "performance",
  archetypeConfidence: 0.9,
  interestTier: "high",
  interestConfidence: 0.85,
  scores: { archetype: { performance: 0.9, family: 0.05, luxury: 0.05 }, interestTier: { high: 0.85, medium: 0.1, low: 0.05 } },
  modelVersion: "v1.0.0",
};

const stub: PredictionService = {
  async predict(_features: SessionFeaturesPayload): Promise<PredictionResult | null> {
    return fixedPrediction;
  },
  async recommend(_input: RecommendInput) {
    return { recommendedVehicleSlug: "byd-atto-3", highlightComponents: [], rationale: "x" };
  },
  async emotion(_features: SessionFeaturesPayload) {
    return { emotion: "engaged", confidence: 0.8 };
  },
  async sentiment(_text: string) {
    return null;
  },
};

const stubNull: PredictionService = {
  async predict(_features: SessionFeaturesPayload): Promise<PredictionResult | null> {
    return null;
  },
  async recommend(_input: RecommendInput) {
    return null;
  },
  async emotion(_features: SessionFeaturesPayload) {
    return null;
  },
  async sentiment(_text: string) {
    return null;
  },
};

describe("endSession: prediction + emotion storage", () => {
  it("Test 1: stores prediction and emotion detection when stub returns data", async () => {
    const session = await startSession({ vehicleId: "byd-atto-3", gazeProvider: "mouse" }, null);
    const id = session.id;

    await ingestGaze(id, session.vehicleId, [
      { tMs: 0, x: 0.5, y: 0.5, meshName: "infotainment", provider: "mouse" },
      { tMs: 600, x: 0.5, y: 0.5, meshName: "infotainment", provider: "mouse" },
      { tMs: 900, x: 0.4, y: 0.4, meshName: "seats", provider: "mouse" },
    ]);

    const result = await endSession(id, stub);
    expect(result).toHaveProperty("session");
    expect(result.session.status).toBe("COMPLETED");

    const pred = await predictionRepo.forSession(id);
    expect(pred).not.toBeNull();
    expect(pred!.archetype).toBe("performance");
    expect(pred!.archetypeConfidence).toBeCloseTo(0.9);

    const emotionRow = await prisma.emotionDetection.findFirst({ where: { sessionId: id } });
    expect(emotionRow).not.toBeNull();
    expect(emotionRow!.emotion).toBe("engaged");
    expect(emotionRow!.confidence).toBeCloseTo(0.8);
  });

  it("Test 2: resolves successfully and writes no Prediction row when predict returns null", async () => {
    const session = await startSession({ vehicleId: "byd-atto-3", gazeProvider: "mouse" }, null);
    const id2 = session.id;

    await ingestGaze(id2, session.vehicleId, [
      { tMs: 0, x: 0.5, y: 0.5, meshName: "wheels", provider: "mouse" },
    ]);

    const result = await endSession(id2, stubNull);
    expect(result).toHaveProperty("session");
    expect(result.session.status).toBe("COMPLETED");

    const pred = await predictionRepo.forSession(id2);
    expect(pred).toBeNull();
  });
});

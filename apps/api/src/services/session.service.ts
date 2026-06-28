import type { StartSessionInput } from "@sev/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { sessionRepo } from "../repositories/session.repo.js";
import { computeSession } from "../analytics/engine.node.js";
import { HttpError } from "../lib/httpError.js";
import { getPredictionService } from "../ml/index.js";
import type { PredictionService } from "../ml/PredictionService.js";
import { buildFeaturesPayload } from "../ml/featurePayload.js";
import { predictionRepo } from "../repositories/prediction.repo.js";
import { vehicleRepo } from "../repositories/vehicle.repo.js";

export async function startSession(input: StartSessionInput, userId: string | null) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { OR: [{ id: input.vehicleId }, { slug: input.vehicleId }] },
  });
  if (!vehicle) throw new HttpError(404, "Vehicle not found");

  let validUserId = null;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) validUserId = user.id;
  }

  return sessionRepo.create({
    vehicle: { connect: { id: vehicle.id } },
    ...(validUserId ? { user: { connect: { id: validUserId } } } : {}),
    gazeProvider: input.gazeProvider,
    device: input.device ?? "web",
  });
}

export async function endSession(
  sessionId: string,
  predictionService: PredictionService = getPredictionService(),
) {
  const session = await sessionRepo.findById(sessionId);
  if (!session) throw new HttpError(404, "Session not found");
  const endedAt = new Date();
  const durationSec = (endedAt.getTime() - session.startedAt.getTime()) / 1000;
  const summary = await computeSession(sessionId); // fresh (uncached)
  const updated = await sessionRepo.end(sessionId, {
    endedAt,
    durationSec,
    status: "COMPLETED",
    engagementScore: summary?.engagementScore ?? 0,
    interestScore: summary?.interestScore ?? 0,
    totalGazeMs: summary?.totalGazeMs ?? 0,
  });

  try {
    const componentViews = await prisma.componentView.findMany({ where: { sessionId } });
    const features = buildFeaturesPayload(componentViews, updated);
    const prediction = await predictionService.predict(features);
    if (prediction) {
      const vehicles = await vehicleRepo.listPublished();
      const total = componentViews.reduce((s, c) => s + c.totalViewMs, 0) || 1;
      const attention = Object.fromEntries(
        componentViews.map((c) => [c.meshName, c.totalViewMs / total]),
      );
      const rec = await predictionService.recommend({
        prediction,
        catalog: vehicles.map((v) => ({ slug: v.slug, name: v.name, category: v.category, score: 0 })),
        attention,
      });
      const recommendedVehicleId = rec?.recommendedVehicleSlug
        ? (vehicles.find((v) => v.slug === rec.recommendedVehicleSlug)?.id ?? null)
        : null;
      await predictionRepo.upsert(sessionId, {
        archetype: prediction.archetype,
        archetypeConfidence: prediction.archetypeConfidence,
        interestTier: prediction.interestTier,
        interestConfidence: prediction.interestConfidence,
        recommendedVehicleId,
        scores: prediction.scores as Prisma.InputJsonValue,
        modelVersion: prediction.modelVersion,
        highlightComponents: rec?.highlightComponents ?? [],
        rationale: rec?.rationale ?? null,
      });
      const emotion = await predictionService.emotion(features);
      if (emotion) {
        await prisma.emotionDetection.create({
          data: { sessionId, tMs: durationSec * 500, emotion: emotion.emotion, confidence: emotion.confidence },
        });
      }
    }
  } catch (err) {
    console.warn(`[endSession] prediction step failed for ${sessionId}:`, err);
  }

  return { session: updated, summary };
}

import type { Request, Response } from "express";
import type { PredictionDTO, PredictionResult, RecommendationDTO } from "@sev/shared";
import { sessionRepo } from "../repositories/session.repo.js";
import { predictionRepo } from "../repositories/prediction.repo.js";
import { HttpError } from "../lib/httpError.js";
import { assertCanViewSession } from "./analytics.controller.js";

type PredictionRow = NonNullable<Awaited<ReturnType<typeof predictionRepo.forSession>>>;

function toPredictionDTO(p: PredictionRow): PredictionDTO {
  return {
    sessionId: p.sessionId,
    archetype: p.archetype as PredictionResult["archetype"],
    archetypeConfidence: p.archetypeConfidence,
    interestTier: p.interestTier as PredictionResult["interestTier"],
    interestConfidence: p.interestConfidence,
    scores: p.scores as PredictionResult["scores"],
    modelVersion: p.modelVersion,
    recommendedVehicle: p.recommendedVehicle ?? null,
    highlightComponents: p.highlightComponents,
    rationale: p.rationale,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function getPrediction(req: Request, res: Response) {
  const session = await sessionRepo.findById(req.params.id!);
  if (!session) {
    res.json({ prediction: null });
    return;
  }
  assertCanViewSession(req, session);
  const p = await predictionRepo.forSession(session.id);
  res.json({ prediction: p ? toPredictionDTO(p) : null });
}

export async function getRecommendations(req: Request, res: Response) {
  const rows = await predictionRepo.recent(100);

  const byVehicle = new Map<string, { vehicleName: string; count: number; archetypes: Record<string, number> }>();
  for (const row of rows) {
    if (!row.recommendedVehicle) continue;
    const { slug, name } = row.recommendedVehicle;
    const entry = byVehicle.get(slug) ?? { vehicleName: name, count: 0, archetypes: {} };
    entry.count += 1;
    entry.archetypes[row.archetype] = (entry.archetypes[row.archetype] ?? 0) + 1;
    byVehicle.set(slug, entry);
  }

  const recommendations: RecommendationDTO[] = [...byVehicle.entries()].map(
    ([vehicleSlug, { vehicleName, count, archetypes }]) => ({
      vehicleSlug,
      vehicleName,
      count,
      archetypes,
    }),
  );

  res.json({ recommendations });
}

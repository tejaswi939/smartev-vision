import { prisma } from "../db.js";
import { vehicleRepo } from "../repositories/vehicle.repo.js";
import { feedbackRepo } from "../repositories/feedback.repo.js";
import { getPredictionService } from "../ml/index.js";
import type { PredictionService } from "../ml/PredictionService.js";
import { HttpError } from "../lib/httpError.js";
import type { FeedbackInput, FeedbackDTO, FeedbackSummary, SentimentLabel } from "@sev/shared";
import type { Feedback } from "@prisma/client";

export function toFeedbackDTO(feedback: Feedback, rating: number | null): FeedbackDTO {
  return {
    id: feedback.id,
    vehicleId: feedback.vehicleId,
    sessionId: feedback.sessionId,
    rating,
    favoriteFeature: feedback.favoriteFeature,
    comment: feedback.comment,
    suggestion: feedback.suggestion,
    sentiment: feedback.sentiment as SentimentLabel | null,
    createdAt: feedback.createdAt.toISOString(),
  };
}

export async function createFeedback(
  input: FeedbackInput,
  userId: string,
  svc: PredictionService = getPredictionService(),
): Promise<FeedbackDTO> {
  const vehicle =
    (await vehicleRepo.bySlug(input.vehicleId)) ??
    (await prisma.vehicle.findUnique({ where: { id: input.vehicleId } }));
  if (!vehicle) throw new HttpError(404, "Vehicle not found");

  let sentiment: string | null = null;
  if (input.comment?.trim()) {
    const s = await svc.sentiment(input.comment);
    sentiment = s?.sentiment ?? null;
  }

  const feedback = await feedbackRepo.create({
    userId,
    vehicleId: vehicle.id,
    sessionId: input.sessionId ?? null,
    comment: input.comment ?? null,
    favoriteFeature: input.favoriteFeature ?? null,
    suggestion: input.suggestion ?? null,
    sentiment,
  });

  if (input.rating != null) {
    await feedbackRepo.createRating({ userId, vehicleId: vehicle.id, score: input.rating });
  }

  return toFeedbackDTO(feedback, input.rating ?? null);
}

export function summarize(
  feedbacks: { sentiment: string | null }[],
  ratings: { score: number }[],
): FeedbackSummary {
  const total = feedbacks.length;
  const sentimentCounts: Record<SentimentLabel, number> = { positive: 0, neutral: 0, negative: 0 };
  for (const f of feedbacks) {
    if (f.sentiment === "positive" || f.sentiment === "neutral" || f.sentiment === "negative") {
      sentimentCounts[f.sentiment]++;
    }
  }
  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 100) / 100
      : null;
  return { total, sentiment: sentimentCounts, avgRating };
}

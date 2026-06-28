import type { Request, Response } from "express";
import { feedbackInputSchema } from "@sev/shared";
import { HttpError } from "../lib/httpError.js";
import { feedbackRepo } from "../repositories/feedback.repo.js";
import { vehicleRepo } from "../repositories/vehicle.repo.js";
import { prisma } from "../db.js";
import { createFeedback, summarize, toFeedbackDTO } from "../services/feedback.service.js";

export async function postFeedback(req: Request, res: Response): Promise<void> {
  const parsed = feedbackInputSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.errors[0]?.message ?? "Invalid input");
  const feedback = await createFeedback(parsed.data, req.user!.id);
  res.status(201).json({ feedback });
}

export async function getVehicleFeedback(req: Request, res: Response): Promise<void> {
  const vehicle =
    (await vehicleRepo.bySlug(req.params.slug!)) ??
    (await prisma.vehicle.findUnique({ where: { id: req.params.slug! } }));
  if (!vehicle) throw new HttpError(404, "Vehicle not found");

  const [feedbacks, ratings] = await Promise.all([
    feedbackRepo.forVehicle(vehicle.id),
    feedbackRepo.ratingsForVehicle(vehicle.id),
  ]);

  const dtos = feedbacks.map((f) => toFeedbackDTO(f, null));
  const summary = summarize(feedbacks, ratings);
  res.json({ feedback: dtos, summary });
}

export async function getFeedbackSummary(_req: Request, res: Response): Promise<void> {
  const [feedbacks, ratings] = await Promise.all([
    feedbackRepo.allWithRatings(),
    feedbackRepo.allRatings(),
  ]);
  const summary = summarize(feedbacks, ratings);
  res.json({ summary });
}

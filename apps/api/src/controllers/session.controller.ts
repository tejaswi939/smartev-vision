import type { Request, Response } from "express";
import { startSessionSchema, gazeBatchSchema, interactionBatchSchema } from "@sev/shared";
import { prisma } from "../db.js";
import { startSession, endSession } from "../services/session.service.js";
import { ingestGaze } from "../services/gazeIngest.service.js";
import { sessionRepo } from "../repositories/session.repo.js";
import { componentViewRepo } from "../repositories/componentView.repo.js";
import { HttpError } from "../lib/httpError.js";

export async function postSession(req: Request, res: Response) {
  const input = startSessionSchema.parse(req.body);
  const session = await startSession(input, req.user?.id ?? null);
  res.status(201).json({ session: { id: session.id, vehicleId: session.vehicleId, startedAt: session.startedAt } });
}

export async function postEnd(req: Request, res: Response) {
  const result = await endSession(req.params.id!);
  res.json(result);
}

export async function postGaze(req: Request, res: Response) {
  const { samples } = gazeBatchSchema.parse(req.body);
  const session = await sessionRepo.findById(req.params.id!);
  if (!session) throw new HttpError(404, "Session not found");
  const inserted = await ingestGaze(session.id, session.vehicleId, samples);
  res.status(201).json({ inserted });
}

export async function postInteractions(req: Request, res: Response) {
  const { events } = interactionBatchSchema.parse(req.body);
  const session = await sessionRepo.findById(req.params.id!);
  if (!session) throw new HttpError(404, "Session not found");
  await prisma.interactionLog.createMany({
    data: events.map((e) => ({
      sessionId: session.id, partId: e.partId ?? null, type: e.type, tMs: e.tMs,
      metadata: (e.metadata ?? undefined) as never,
    })),
  });
  for (const e of events) {
    if (e.meshName) await componentViewRepo.bumpInteraction(session.id, session.vehicleId, e.meshName);
  }
  res.status(201).json({ inserted: events.length });
}

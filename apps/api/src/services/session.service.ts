import type { StartSessionInput } from "@sev/shared";
import { prisma } from "../db.js";
import { sessionRepo } from "../repositories/session.repo.js";
import { computeSession } from "../analytics/engine.node.js";
import { HttpError } from "../lib/httpError.js";

export async function startSession(input: StartSessionInput, userId: string | null) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { OR: [{ id: input.vehicleId }, { slug: input.vehicleId }] },
  });
  if (!vehicle) throw new HttpError(404, "Vehicle not found");
  return sessionRepo.create({
    vehicle: { connect: { id: vehicle.id } },
    ...(userId ? { user: { connect: { id: userId } } } : {}),
    gazeProvider: input.gazeProvider,
    device: input.device ?? "web",
  });
}

export async function endSession(sessionId: string) {
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
  return { session: updated, summary };
}

import { prisma } from "../db.js";
import type { Prisma } from "@prisma/client";
export const predictionRepo = {
  upsert: (sessionId: string, data: Omit<Prisma.PredictionUncheckedCreateInput, "sessionId">) =>
    prisma.prediction.upsert({ where: { sessionId }, create: { sessionId, ...data }, update: data }),
  forSession: (sessionId: string) =>
    prisma.prediction.findUnique({ where: { sessionId }, include: { recommendedVehicle: { select: { slug: true, name: true } } } }),
  recent: (take = 100) =>
    prisma.prediction.findMany({ take, orderBy: { createdAt: "desc" }, include: { recommendedVehicle: { select: { slug: true, name: true } } } }),
};

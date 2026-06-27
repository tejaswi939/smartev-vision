import { Prisma } from "@prisma/client";
import type { ResolvedGazeSample } from "@sev/shared";
import { prisma } from "../db.js";

export const gazeRepo = {
  bulkInsert: (sessionId: string, samples: ResolvedGazeSample[]) => {
    const data: Prisma.GazeDataCreateManyInput[] = samples.map((s) => ({
      sessionId,
      partId: s.partId ?? null,
      objectId: s.objectId ?? null,
      tMs: s.tMs,
      x: s.x,
      y: s.y,
      camPos: (s.camPos ?? undefined) as Prisma.InputJsonValue | undefined,
      camRot: (s.camRot ?? undefined) as Prisma.InputJsonValue | undefined,
      rayDir: (s.rayDir ?? undefined) as Prisma.InputJsonValue | undefined,
      provider: s.provider,
    }));
    return prisma.gazeData.createMany({ data });
  },
  forSession: (sessionId: string) =>
    prisma.gazeData.findMany({ where: { sessionId }, select: { x: true, y: true }, orderBy: { tMs: "asc" } }),
  forVehicle: (vehicleId: string, take = 5000) =>
    prisma.gazeData.findMany({ where: { session: { vehicleId } }, select: { x: true, y: true }, take }),
};

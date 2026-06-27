import { prisma } from "../db.js";

export interface ViewDelta {
  dViewMs: number;
  dFocus: number;
  dEntry: number;
  dExit: number;
  first: number;
  last: number;
}

export const componentViewRepo = {
  upsertIncrement: (sessionId: string, vehicleId: string, meshName: string, d: ViewDelta) =>
    prisma.componentView.upsert({
      where: { sessionId_meshName: { sessionId, meshName } },
      create: {
        sessionId, vehicleId, meshName,
        totalViewMs: d.dViewMs, focusCount: d.dFocus, entryCount: d.dEntry, exitCount: d.dExit,
        firstSeenMs: d.first, lastSeenMs: d.last,
      },
      update: {
        totalViewMs: { increment: d.dViewMs },
        focusCount: { increment: d.dFocus },
        entryCount: { increment: d.dEntry },
        exitCount: { increment: d.dExit },
        lastSeenMs: d.last,
      },
    }),
  bumpInteraction: (sessionId: string, vehicleId: string, meshName: string) =>
    prisma.componentView.upsert({
      where: { sessionId_meshName: { sessionId, meshName } },
      create: { sessionId, vehicleId, meshName, interactionCount: 1 },
      update: { interactionCount: { increment: 1 } },
    }),
};

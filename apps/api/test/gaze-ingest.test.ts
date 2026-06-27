import { describe, it, expect, beforeEach } from "vitest";
import { prisma, resetDb } from "./helpers/db.js";
import { ingestGaze } from "../src/services/gazeIngest.service.js";

beforeEach(resetDb);

async function makeSession() {
  const u = await prisma.user.create({ data: { email: "c@x.io", name: "C", role: "CUSTOMER", passwordHash: "x" } });
  const v = await prisma.vehicle.create({ data: { slug: "v", name: "V", make: "M", modelName: "M", year: 2026, type: "SUV", batteryKwh: 1, rangeKm: 1, priceUsd: 1 } });
  const s = await prisma.session.create({ data: { userId: u.id, vehicleId: v.id } });
  return { sessionId: s.id, vehicleId: v.id };
}

describe("ingestGaze", () => {
  it("bulk-inserts gaze + accumulates per-component dwell, focus, entry/exit", async () => {
    const { sessionId, vehicleId } = await makeSession();
    const samples = [
      { tMs: 0, x: 0.5, y: 0.5, objectId: "o:doors", meshName: "doors", provider: "mouse" as const },
      { tMs: 150, x: 0.5, y: 0.5, objectId: "o:doors", meshName: "doors", provider: "mouse" as const },
      { tMs: 300, x: 0.5, y: 0.5, objectId: "o:wheels", meshName: "wheels", provider: "mouse" as const },
      { tMs: 600, x: 0.5, y: 0.5, objectId: "o:wheels", meshName: "wheels", provider: "mouse" as const },
      { tMs: 900, x: 0.5, y: 0.5, objectId: "o:wheels", meshName: "wheels", provider: "mouse" as const },
    ];
    const n = await ingestGaze(sessionId, vehicleId, samples);
    expect(n).toBe(5);
    expect(await prisma.gazeData.count({ where: { sessionId } })).toBe(5);

    const wheels = await prisma.componentView.findUnique({ where: { sessionId_meshName: { sessionId, meshName: "wheels" } } });
    expect(wheels!.totalViewMs).toBeGreaterThanOrEqual(600);
    expect(wheels!.focusCount).toBeGreaterThanOrEqual(1);
    expect(wheels!.entryCount).toBe(1);

    const doors = await prisma.componentView.findUnique({ where: { sessionId_meshName: { sessionId, meshName: "doors" } } });
    expect(doors!.entryCount).toBe(1);
    expect(doors!.exitCount).toBe(1);
  });

  it("accumulates across multiple batches (incremental)", async () => {
    const { sessionId, vehicleId } = await makeSession();
    const batch = [
      { tMs: 0, x: 0.5, y: 0.5, meshName: "body", provider: "mouse" as const },
      { tMs: 500, x: 0.5, y: 0.5, meshName: "body", provider: "mouse" as const },
    ];
    await ingestGaze(sessionId, vehicleId, batch);
    await ingestGaze(sessionId, vehicleId, batch);
    const body = await prisma.componentView.findUnique({ where: { sessionId_meshName: { sessionId, meshName: "body" } } });
    expect(body!.totalViewMs).toBeGreaterThanOrEqual(1000);
    expect(body!.entryCount).toBe(2);
  });
});

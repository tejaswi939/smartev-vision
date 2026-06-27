import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { runSeed } from "./seed.js";

const prisma = new PrismaClient();
beforeAll(async () => { await runSeed(prisma); });
afterAll(async () => { await prisma.$disconnect(); });

describe("seed", () => {
  it("creates one user per role", async () => {
    const roles = await prisma.user.groupBy({ by: ["role"], _count: true });
    expect(roles.length).toBe(3);
  });
  it("creates 3 vehicles with 15 parts each", async () => {
    const vehicles = await prisma.vehicle.findMany({ include: { parts: true } });
    expect(vehicles.length).toBe(3);
    for (const v of vehicles) expect(v.parts.length).toBe(15);
  });
  it("creates audit rows", async () => {
    expect(await prisma.auditLog.count()).toBeGreaterThan(0);
  });
});

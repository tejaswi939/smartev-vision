import { describe, it, expect, beforeAll, vi } from "vitest";
import { TtlCache } from "../src/analytics/cache.js";
import { prisma } from "./helpers/db.js";
import { runSeed } from "../prisma/seed.js";
import { computeOverview, computeSession } from "../src/analytics/engine.node.js";

describe("TtlCache", () => {
  it("returns cached value within TTL (computes once)", async () => {
    const cache = new TtlCache(1000);
    const fn = vi.fn().mockResolvedValue(1);
    expect(await cache.get("k", fn)).toBe(1);
    expect(await cache.get("k", fn)).toBe(1);
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe("nodeAnalyticsEngine (seeded)", () => {
  beforeAll(async () => { await runSeed(prisma); });

  it("overview returns popularity for 3 vehicles + numeric averages", async () => {
    const o = await computeOverview();
    expect(o.vehiclePopularity.length).toBe(3);
    expect(typeof o.avgEngagement).toBe("number");
    expect(o.totalSessions).toBeGreaterThanOrEqual(6);
  });

  it("sessionAnalytics computes scores for a seeded session", async () => {
    const s = await prisma.session.findFirst({ where: { status: "COMPLETED" } });
    const a = await computeSession(s!.id);
    expect(a).not.toBeNull();
    expect(a!.components.length).toBeGreaterThan(0);
    expect(a!.engagementScore).toBeGreaterThanOrEqual(0);
    expect(a!.engagementScore).toBeLessThanOrEqual(100);
  });
});

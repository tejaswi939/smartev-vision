import { describe, it, expect } from "vitest";
import * as f from "../src/analytics/formulas.js";

const comps: f.ComponentAgg[] = [
  { meshName: "body", name: "Body", totalViewMs: 1000, focusCount: 2, interactionCount: 0 },
  { meshName: "infotainment", name: "Infotainment", totalViewMs: 3000, focusCount: 3, interactionCount: 4 },
  { meshName: "wheels", name: "Wheels", totalViewMs: 1000, focusCount: 1, interactionCount: 0 },
];

describe("formulas", () => {
  it("attention % sums to ~100", () => {
    const m = f.attentionPercentages(comps);
    expect(m.get("infotainment")).toBeCloseTo(60);
    expect([...m.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(100);
  });
  it("avg dwell = totalViewMs / focusCount", () => {
    expect(f.avgDwellMs(comps[1]!)).toBeCloseTo(1000);
  });
  it("most viewed excludes body by default; least viewed picks the smallest", () => {
    expect(f.mostViewed(comps)).toBe("infotainment");
    expect(f.leastViewed(comps)).toBe("wheels");
  });
  it("engagement score is 0..100 and rises with coverage/dwell", () => {
    const lo = f.engagementScore({ uniqueViewed: 1, totalComponents: 15, avgDwellMs: 200, interactions: 0, durationSec: 60, entryTransitions: 1 });
    const hi = f.engagementScore({ uniqueViewed: 12, totalComponents: 15, avgDwellMs: 1800, interactions: 8, durationSec: 60, entryTransitions: 30 });
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThanOrEqual(100);
    expect(hi).toBeGreaterThan(lo);
  });
  it("interest score blends engagement, high-value dwell, interactions (0..100)", () => {
    const s = f.interestScore({ engagement: 70, highValueDwellMs: 2000, totalViewMs: 4000, interactions: 10 });
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(100);
  });
  it("ranking orders by attention% + interactions and assigns rank 1..n", () => {
    const ranked = f.componentRanking(comps);
    expect(ranked[0]!.meshName).toBe("infotainment");
    expect(ranked[0]!.rank).toBe(1);
  });
  it("vehicle popularity ranks by sessions x engagement", () => {
    const pop = f.vehiclePopularity([
      { slug: "a", name: "A", sessionCount: 10, avgEngagement: 80, avgInterest: 70, totalViewMs: 1 },
      { slug: "b", name: "B", sessionCount: 2, avgEngagement: 90, avgInterest: 60, totalViewMs: 1 },
    ]);
    expect(pop[0]!.slug).toBe("a");
  });
});

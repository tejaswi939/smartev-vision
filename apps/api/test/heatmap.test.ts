import { describe, it, expect } from "vitest";
import { buildHeatmapGrid } from "../src/analytics/heatmap.js";

describe("buildHeatmapGrid", () => {
  it("bins points into a normalized NxN grid", () => {
    const g = buildHeatmapGrid([{ x: 0.1, y: 0.1 }, { x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }], 10);
    expect(g.length).toBe(10);
    expect(g[0]!.length).toBe(10);
    expect(Math.max(...g.flat())).toBeCloseTo(1);
    expect(g[1]![1]).toBeCloseTo(1); // 2 points here = hottest
    expect(g[9]![9]).toBeCloseTo(0.5); // 1 point = half
  });
  it("returns an all-zero grid for no points", () => {
    const g = buildHeatmapGrid([], 5);
    expect(g.length).toBe(5);
    expect(Math.max(...g.flat())).toBe(0);
  });
});

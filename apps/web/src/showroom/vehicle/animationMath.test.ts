import { describe, it, expect } from "vitest";
import { lerp, approach } from "./animationMath.js";

describe("animationMath", () => {
  it("lerps", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
  it("approaches a target without overshoot", () => {
    expect(approach(0, 1, 1, 100)).toBeCloseTo(1);
    expect(approach(0, 1, 0.001, 1)).toBeLessThan(1);
  });
});

import { describe, it, expect } from "vitest";
import { resolvedGazeSampleSchema, gazeBatchSchema, startSessionSchema } from "./gaze.js";

describe("gaze contracts", () => {
  it("accepts a valid gaze sample", () => {
    expect(resolvedGazeSampleSchema.safeParse({ tMs: 12.5, x: 0.5, y: 0.4, provider: "mouse" }).success).toBe(true);
  });
  it("rejects out-of-range screen coords", () => {
    expect(resolvedGazeSampleSchema.safeParse({ tMs: 1, x: 2, y: 0, provider: "mouse" }).success).toBe(false);
  });
  it("bounds the gaze batch size", () => {
    const big = { samples: Array.from({ length: 1001 }, () => ({ tMs: 1, x: 0.1, y: 0.1, provider: "mouse" })) };
    expect(gazeBatchSchema.safeParse(big).success).toBe(false);
  });
  it("requires a vehicleId to start a session", () => {
    expect(startSessionSchema.safeParse({ gazeProvider: "mouse" }).success).toBe(false);
  });
});

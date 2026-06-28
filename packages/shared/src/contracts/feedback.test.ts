import { describe, it, expect } from "vitest";
import { feedbackInputSchema } from "./feedback.js";

describe("feedback contracts", () => {
  it("accepts a valid payload", () => {
    const r = feedbackInputSchema.safeParse({
      vehicleId: "v123",
      rating: 4,
      comment: "Great experience",
      suggestion: "Add more features",
    });
    expect(r.success).toBe(true);
  });

  it("rejects rating of 6", () => {
    const r = feedbackInputSchema.safeParse({
      vehicleId: "v123",
      rating: 6,
    });
    expect(r.success).toBe(false);
  });

  it("rejects comment of 2001 chars", () => {
    const r = feedbackInputSchema.safeParse({
      vehicleId: "v123",
      comment: "x".repeat(2001),
    });
    expect(r.success).toBe(false);
  });
});

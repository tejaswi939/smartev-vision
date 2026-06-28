import { describe, it, expect } from "vitest";
import { sessionFeaturesPayloadSchema } from "./prediction.js";

describe("prediction contracts", () => {
  it("accepts a valid features payload", () => {
    const r = sessionFeaturesPayloadSchema.safeParse({
      components: [
        {
          meshName: "body",
          totalViewMs: 10,
          focusCount: 1,
          entryCount: 1,
        },
      ],
      engagementScore: 50,
      interestScore: 40,
      totalGazeMs: 1000,
    });
    expect(r.success).toBe(true);
  });

  it("rejects negative gaze", () => {
    expect(
      sessionFeaturesPayloadSchema.safeParse({
        components: [],
        engagementScore: 0,
        interestScore: 0,
        totalGazeMs: -1,
      }).success
    ).toBe(false);
  });
});

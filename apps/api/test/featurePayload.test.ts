import { describe, it, expect } from "vitest";
import { buildFeaturesPayload } from "../src/ml/featurePayload.js";

describe("featurePayload", () => {
  it("maps component views to payload and copies scores through", () => {
    const componentViews = [
      { meshName: "headlights", totalViewMs: 5000, focusCount: 3, entryCount: 2 },
      { meshName: "infotainment", totalViewMs: 8000, focusCount: 5, entryCount: 3 },
    ];

    const session = {
      engagementScore: 70,
      interestScore: 55,
      totalGazeMs: 90000,
    };

    const result = buildFeaturesPayload(componentViews, session);

    expect(result.components).toHaveLength(2);
    expect(result.components[0]).toEqual({
      meshName: "headlights",
      totalViewMs: 5000,
      focusCount: 3,
      entryCount: 2,
    });
    expect(result.components[1]).toEqual({
      meshName: "infotainment",
      totalViewMs: 8000,
      focusCount: 5,
      entryCount: 3,
    });
    expect(result.engagementScore).toBe(70);
    expect(result.interestScore).toBe(55);
    expect(result.totalGazeMs).toBe(90000);
  });

  it("defaults null scores to 0", () => {
    const componentViews = [
      { meshName: "wheels", totalViewMs: 2000, focusCount: 1, entryCount: 1 },
    ];

    const session = {
      engagementScore: null,
      interestScore: null,
      totalGazeMs: null,
    };

    const result = buildFeaturesPayload(componentViews, session);

    expect(result.engagementScore).toBe(0);
    expect(result.interestScore).toBe(0);
    expect(result.totalGazeMs).toBe(0);
  });
});

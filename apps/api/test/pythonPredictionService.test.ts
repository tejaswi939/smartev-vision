import { describe, it, expect, vi, afterEach } from "vitest";
import { PythonPredictionService } from "../src/ml/pythonPredictionService.js";

afterEach(() => vi.restoreAllMocks());

const svc = new PythonPredictionService("http://ml:8000");
const features = { components: [], engagementScore: 1, interestScore: 1, totalGazeMs: 1 };

const mockPrediction = {
  archetype: "family" as const,
  archetypeConfidence: 0.7,
  interestTier: "low" as const,
  interestConfidence: 0.6,
  scores: { archetype: {}, interestTier: {} },
  modelVersion: "x",
};

describe("PythonPredictionService.predict", () => {
  it("returns parsed PredictionResult on 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPrediction),
      }),
    );
    const result = await svc.predict(features);
    expect(result?.archetype).toBe("family");
    expect(result?.archetypeConfidence).toBe(0.7);
    expect(result?.modelVersion).toBe("x");
  });

  it("returns null when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    expect(await svc.predict(features)).toBeNull();
  });

  it("returns null when fetch rejects (network error)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await svc.predict(features)).toBeNull();
  });

  it("returns null when fetch rejects with AbortError (timeout)", async () => {
    const abortErr = new DOMException("timeout", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortErr));
    expect(await svc.predict(features)).toBeNull();
  });
});

describe("PythonPredictionService.recommend", () => {
  it("returns parsed RecommendResult on 200", async () => {
    const mockRecommend = {
      recommendedVehicleSlug: "ev-sport",
      highlightComponents: ["battery", "motor"],
      rationale: "Best match for family archetype",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRecommend),
      }),
    );
    const input = {
      prediction: mockPrediction,
      catalog: [{ slug: "ev-sport", name: "EV Sport", category: "suv", score: 0.9 }],
      attention: { battery: 0.8, motor: 0.6 },
    };
    const result = await svc.recommend(input);
    expect(result?.recommendedVehicleSlug).toBe("ev-sport");
    expect(result?.highlightComponents).toEqual(["battery", "motor"]);
  });

  it("returns null when recommend response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );
    const input = {
      prediction: mockPrediction,
      catalog: [],
      attention: {},
    };
    expect(await svc.recommend(input)).toBeNull();
  });

  it("returns null when recommend fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    const input = {
      prediction: mockPrediction,
      catalog: [],
      attention: {},
    };
    expect(await svc.recommend(input)).toBeNull();
  });
});

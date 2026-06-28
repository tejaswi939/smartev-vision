import { describe, it, expect, vi, afterEach } from "vitest";
import { PythonPredictionService } from "../src/ml/pythonPredictionService.js";

afterEach(() => vi.restoreAllMocks());

const svc = new PythonPredictionService("http://ml:8000");

describe("PythonPredictionService.sentiment", () => {
  it("returns parsed sentiment result on 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sentiment: "positive", score: 0.8 }),
      }),
    );
    const result = await svc.sentiment("I love this car!");
    expect(result?.sentiment).toBe("positive");
    expect(result?.score).toBe(0.8);
  });

  it("returns null when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    expect(await svc.sentiment("some text")).toBeNull();
  });

  it("returns null when fetch rejects (network error)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await svc.sentiment("some text")).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { PROVIDERS, createProvider } from "./providerRegistry.js";

describe("providerRegistry", () => {
  it("lists 4 providers; webgazer is coming-soon", () => {
    expect(PROVIDERS.map((p) => p.id)).toEqual(["mouse", "camera-center", "crosshair", "webgazer"]);
    expect(PROVIDERS.find((p) => p.id === "webgazer")!.available).toBe(false);
  });
  it("creates a provider exposing the GazeProvider interface", () => {
    const p = createProvider("mouse");
    expect(p.id).toBe("mouse");
    expect(typeof p.start).toBe("function");
    expect(typeof p.onSample).toBe("function");
    expect(typeof p.stop).toBe("function");
  });
  it("every provider yields the same GazeSample shape", () => {
    const samples: Record<string, unknown>[] = [];
    for (const meta of PROVIDERS) {
      const p = createProvider(meta.id);
      p.onSample((s) => samples.push(s as unknown as Record<string, unknown>));
      // directly invoke the protected emit via a tiny cast to assert event shape
      (p as unknown as { emit: (x: number, y: number) => void }).emit(0.3, 0.7);
    }
    for (const s of samples) {
      expect(s).toHaveProperty("tMs");
      expect(s).toHaveProperty("x");
      expect(s).toHaveProperty("y");
    }
  });
});

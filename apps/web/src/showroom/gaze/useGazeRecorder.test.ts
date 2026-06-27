import { describe, it, expect } from "vitest";
import { resolveHit } from "./useGazeRecorder.js";

describe("resolveHit", () => {
  it("returns the first hit carrying an objectId", () => {
    const r = resolveHit([
      { userData: {} },
      { userData: { objectId: "v1:p1", meshName: "doors", componentId: "p1" } },
      { userData: { objectId: "v1:p2", meshName: "wheels", componentId: "p2" } },
    ]);
    expect(r).toEqual({ objectId: "v1:p1", meshName: "doors", componentId: "p1" });
  });
  it("returns null when no hit has an objectId", () => {
    expect(resolveHit([{ userData: {} }, {}])).toBeNull();
  });
});

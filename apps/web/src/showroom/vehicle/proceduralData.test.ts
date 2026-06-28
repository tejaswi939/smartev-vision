import { describe, it, expect } from "vitest";
import { getProceduralParts } from "./proceduralData.js";

describe("proceduralData", () => {
  it("returns 15 parts for each vehicle type with required mesh names", () => {
    for (const t of ["HATCHBACK", "SUV", "SPORTS"]) {
      const parts = getProceduralParts(t);
      expect(parts).toHaveLength(15);
      expect(parts.map((p) => p.meshName)).toContain("charging-port");
    }
  });
  it("varies body color by type", () => {
    const sports = getProceduralParts("SPORTS").find((p) => p.meshName === "body")!.color;
    const suv = getProceduralParts("SUV").find((p) => p.meshName === "body")!.color;
    expect(sports).not.toBe(suv);
  });
  it("falls back to a known variant for unknown types", () => {
    expect(getProceduralParts("UNKNOWN")).toHaveLength(15);
  });
});

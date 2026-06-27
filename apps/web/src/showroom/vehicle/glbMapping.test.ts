import { describe, it, expect } from "vitest";
import { normalizeMeshName, mapMeshesToParts } from "./glbMapping.js";
import type { VehiclePartDTO } from "@sev/shared";

const part = (meshName: string): VehiclePartDTO => ({
  id: meshName, name: meshName, category: "EXTERIOR", meshName, specs: null,
  hotspotPosition: null, animation: null, interactive: true, displayOrder: 0,
});

describe("glbMapping", () => {
  it("normalizes names", () => {
    expect(normalizeMeshName("Front_Doors ")).toBe("front-doors");
  });
  it("maps meshes to parts by normalized name; unmatched -> null", () => {
    const parts = [part("doors"), part("wheels")];
    const res = mapMeshesToParts(["Doors", "Body"], parts);
    expect(res.find((r) => r.meshName === "Doors")!.part!.meshName).toBe("doors");
    expect(res.find((r) => r.meshName === "Body")!.part).toBeNull();
  });
});

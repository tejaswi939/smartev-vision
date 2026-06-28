import { describe, it, expect } from "vitest";
import {
  normalizeMeshName,
  mapMeshesToParts,
  classifyMeshName,
  classifyByPosition,
  classifyMesh,
  CANONICAL_PARTS,
} from "./glbMapping.js";
import type { VehiclePartDTO } from "@sev/shared";

const part = (meshName: string): VehiclePartDTO => ({
  id: meshName, name: meshName, category: "EXTERIOR", meshName, specs: null,
  hotspotPosition: null, animation: null, interactive: true, displayOrder: 0,
});

describe("glbMapping (exact)", () => {
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

describe("classifyMeshName — real mesh names from the shipped GLBs", () => {
  const cases: Array<[string, string]> = [
    // BYD Atto 3 (descriptive names)
    ["tyre_tire_0", "wheels"],
    ["rim_metla_Rim_0", "wheels"],
    ["disk_breaks_0", "wheels"],
    ["caliper_breaks_0", "wheels"],
    ["bodypaint_A_CarPaint_0", "body"],
    ["Mr_paint_CarPaint_0", "body"],
    ["HL_lamp_glaas_in_glass_0", "headlights"], // headlight lens -> headlights, not windows
    ["crme_chome_HL_0", "headlights"],
    ["TL_red_part_in_tail_L_0", "taillights"],
    ["break_light_Map_C1_0", "taillights"],
    ["rare_light_Map_C1_0", "taillights"], // "rare" == rear in this model's naming
    ["Windshield_glass_0", "windows"],
    ["Roof_Glass_glass_0", "windows"],
    ["mirror_glass_mirror_0", "mirrors"], // mirror wins over its glass
    ["Interior_interior_0", "seats"],
    ["grille_light_blk_part1_blacklight_0", "body"],
    ["wipers_plastic_Map_B_0", "body"],
    ["support_pillar_blacklight_0", "body"], // "support" must NOT be read as a charging port
    // Lotus Elise (French descriptive)
    ["LOTUS-def.3:Layer6_CAR.verre_0", "windows"],
    ["LOTUS-def.3:Layer7_CAR.mirroir_0", "mirrors"],
    ["LOTUS-def.3:Layer6_CAR.lamp-arr-rouge_0", "taillights"],
    ["LOTUS-def.3:Layer6_CAR.lamp-avant-haut_0", "headlights"],
    ["LOTUS-def.3:Layer6_CAR.carros_0", "body"],
    // Porsche 911 (partial) & Ferrari SF90 (semantic-but-fragmented)
    ["windshield_0", "windows"],
    ["window_rear_0", "windows"],
    ["bumper_front.004_0", "body"],
    ["polySurface_Ferrari_SFStradale_WheelA_D_DWheelA_Material_0", "wheels"],
    ["Paint_Geo_lodA_Ferrari_SFStradale_Paint_Material_0", "body"],
    ["SeatBelt_Geo_lodA_Ferrari_SFStradale_SeatBelt_Material_0", "seats"],
  ];
  it.each(cases)("%s -> %s", (name, expected) => {
    expect(classifyMeshName(name)).toBe(expected);
  });

  it("returns null for meaningless names (Lamborghini Object_N)", () => {
    expect(classifyMeshName("Object_2")).toBeNull();
    expect(classifyMeshName("Object_42")).toBeNull();
  });

  it("every rule maps to a known canonical part", () => {
    for (const name of ["tyre", "windshield", "door", "seat", "paint"]) {
      expect(CANONICAL_PARTS).toContain(classifyMeshName(name));
    }
  });
});

describe("classifyByPosition — geometry fallback (unnamed meshes)", () => {
  // Model normalized to ~4 long (x), ~1.5 tall (y), ~2 wide (z), sitting on the floor.
  const model = { min: [-2, 0, -1] as const, size: [4, 1.5, 2] as const };

  it("flags a low, outer, small mesh as a wheel", () => {
    const wheel = { center: [1.4, 0.35, 0.8] as const, size: [0.3, 0.7, 0.7] as const };
    expect(classifyByPosition(wheel, model)).toBe("wheels");
  });
  it("does not flag the centered roof", () => {
    const roof = { center: [0, 1.3, 0] as const, size: [2, 0.2, 1.6] as const };
    expect(classifyByPosition(roof, model)).toBeNull();
  });
  it("does not flag the full-width underbody pan", () => {
    const pan = { center: [0, 0.1, 0] as const, size: [3.6, 0.1, 1.8] as const };
    expect(classifyByPosition(pan, model)).toBeNull();
  });
});

describe("classifyMesh — full priority chain", () => {
  const model = { min: [-2, 0, -1] as const, size: [4, 1.5, 2] as const };
  const centerMesh = { center: [0, 0.8, 0] as const, size: [1, 0.5, 1] as const };

  it("name keyword wins first", () => {
    expect(classifyMesh({ name: "tyre_01", mesh: centerMesh, model })).toBe("wheels");
  });
  it("transparent material -> windows when name is unknown", () => {
    expect(classifyMesh({ name: "Object_9", isGlass: true, mesh: centerMesh, model })).toBe("windows");
  });
  it("geometry catches an unnamed wheel", () => {
    const wheel = { center: [1.4, 0.3, 0.8] as const, size: [0.3, 0.7, 0.7] as const };
    expect(classifyMesh({ name: "Object_5", mesh: wheel, model })).toBe("wheels");
  });
  it("defaults to body so every mesh stays gaze-trackable", () => {
    expect(classifyMesh({ name: "Object_99", mesh: centerMesh, model })).toBe("body");
  });
});

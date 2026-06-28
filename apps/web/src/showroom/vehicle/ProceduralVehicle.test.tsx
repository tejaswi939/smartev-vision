import { describe, it, expect } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { ProceduralVehicle } from "./ProceduralVehicle.js";
import { InteractionProvider } from "../interaction/InteractionProvider.js";
import type { VehicleDetail } from "@sev/shared";

const mkPart = (meshName: string, id: string) => ({
  id, name: meshName, category: "EXTERIOR", meshName, specs: null,
  hotspotPosition: null, animation: null, interactive: true, displayOrder: 0,
});

const vehicle: VehicleDetail = {
  id: "v1", slug: "x", name: "X", category: "Compact", type: "HATCHBACK", thumbnailUrl: null,
  rangeKm: 1, priceUsd: 1, make: "X", modelName: "X", year: 2026, batteryKwh: 1, description: null,
  modelUrl: null, metadata: null,
  parts: [mkPart("body", "p-body"), mkPart("doors", "p-doors")],
};

describe("ProceduralVehicle", () => {
  it("renders one mesh per part that has a descriptor", async () => {
    const r = await ReactThreeTestRenderer.create(
      <InteractionProvider>
        <ProceduralVehicle vehicle={vehicle} onSelect={() => {}} />
      </InteractionProvider>,
    );
    expect(r.scene.findAllByType("Mesh")).toHaveLength(2);
  });
});

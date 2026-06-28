import { describe, it, expect, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { InteractivePart } from "./InteractivePart.js";
import { InteractionProvider } from "../interaction/InteractionProvider.js";
import type { PartDescriptor } from "./proceduralData.js";
import type { VehiclePartDTO } from "@sev/shared";

const part: VehiclePartDTO = {
  id: "p1", name: "Doors", category: "DOORS", meshName: "doors",
  specs: null, hotspotPosition: null, animation: "door-open", interactive: true, displayOrder: 0,
};
const desc: PartDescriptor = {
  meshName: "doors", kind: "box", args: [1, 1, 1], position: [0, 0, 0],
  color: "#888", metalness: 0.5, roughness: 0.5, interactive: true,
};

describe("InteractivePart", () => {
  it("tags the mesh with a stable objectId and fires click events", async () => {
    const onSelect = vi.fn();
    const renderer = await ReactThreeTestRenderer.create(
      <InteractionProvider>
        <InteractivePart part={part} vehicleId="v1" descriptor={desc} onSelect={onSelect} />
      </InteractionProvider>,
    );
    const mesh = renderer.scene.findByType("Mesh");
    expect(mesh.instance.userData.objectId).toBe("v1:p1");
    const group = renderer.scene.findByType("Group");
    await renderer.fireEvent(group, "click");
    expect(onSelect).toHaveBeenCalledWith("p1");
  });
});

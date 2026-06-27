import type { VehicleDetail } from "@sev/shared";
import { getProceduralParts } from "./proceduralData.js";
import { InteractivePart } from "./InteractivePart.js";

export function ProceduralVehicle({ vehicle, onSelect }: {
  vehicle: VehicleDetail;
  onSelect: (componentId: string) => void;
}) {
  const byMesh = new Map(getProceduralParts(vehicle.type).map((d) => [d.meshName, d]));
  return (
    <group>
      {vehicle.parts.map((part) => {
        const descriptor = byMesh.get(part.meshName);
        if (!descriptor) return null;
        return (
          <InteractivePart key={part.id} part={part} vehicleId={vehicle.id} descriptor={descriptor} onSelect={onSelect} />
        );
      })}
    </group>
  );
}

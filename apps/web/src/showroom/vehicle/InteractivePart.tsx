import { useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import type { VehiclePartDTO } from "@sev/shared";
import type { PartDescriptor } from "./proceduralData.js";
import { PartMesh } from "./PartMesh.js";
import { Hotspot } from "./Hotspot.js";
import { makeObjectId, type InteractionEvent } from "../interaction/objectId.js";
import { useInteractionBus } from "../interaction/InteractionProvider.js";
import { useVehicleAnimation } from "./useVehicleAnimation.js";

export function InteractivePart({ part, vehicleId, descriptor, onSelect }: {
  part: VehiclePartDTO;
  vehicleId: string;
  descriptor: PartDescriptor;
  onSelect: (componentId: string) => void;
}) {
  const ref = useRef<Group>(null);
  const bus = useInteractionBus();
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const objectId = useMemo(() => makeObjectId(vehicleId, part.id), [vehicleId, part.id]);

  useVehicleAnimation(ref, { animation: part.animation, active: open, hovered });

  // Tag the group + all descendants with the objectId so a Phase-2 gaze raycaster can resolve hits.
  useEffect(() => {
    const g = ref.current;
    if (g) g.traverse((o) => { o.userData.objectId = objectId; });
  }, [objectId]);

  const fire = (type: InteractionEvent["type"]) =>
    bus.emit({ type, objectId, vehicleId, componentId: part.id, meshName: part.meshName, tMs: performance.now() });

  return (
    <group
      ref={ref}
      position={descriptor.position}
      onPointerOver={(e) => { e.stopPropagation(); if (part.interactive) { setHovered(true); fire("hover"); } }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (!part.interactive) return;
        setOpen((o) => !o);
        fire("click");
        onSelect(part.id);
      }}
    >
      <PartMesh descriptor={descriptor} />
      {part.interactive && part.hotspotPosition && (
        <Hotspot position={part.hotspotPosition} label={part.name} hovered={hovered} />
      )}
    </group>
  );
}

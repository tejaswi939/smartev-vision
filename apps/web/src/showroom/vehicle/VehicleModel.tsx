import { Component, Suspense, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import type { Mesh } from "three";
import type { VehicleDetail } from "@sev/shared";
import { ProceduralVehicle } from "./ProceduralVehicle.js";
import { Hotspot } from "./Hotspot.js";
import { mapMeshesToParts } from "./glbMapping.js";
import { makeObjectId } from "../interaction/objectId.js";

class FallbackBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Renders a real GLB and tags its meshes with object IDs for Phase-2 gaze. */
function GlbVehicle({ url, vehicle }: { url: string; vehicle: VehicleDetail }) {
  const { scene } = useGLTF(url);
  const meshNames: string[] = [];
  scene.traverse((o) => {
    if ((o as Mesh).isMesh) meshNames.push(o.name);
  });
  for (const { meshName, part } of mapMeshesToParts(meshNames, vehicle.parts)) {
    if (!part) continue;
    const obj = scene.getObjectByName(meshName);
    if (obj) obj.userData.objectId = makeObjectId(vehicle.id, part.id);
  }
  return (
    <group>
      <primitive object={scene} />
      {vehicle.parts
        .filter((p) => p.interactive && p.hotspotPosition)
        .map((p) => <Hotspot key={p.id} position={p.hotspotPosition!} label={p.name} hovered={false} />)}
    </group>
  );
}

export function VehicleModel({ vehicle, onSelect }: {
  vehicle: VehicleDetail;
  onSelect: (componentId: string) => void;
}) {
  if (vehicle.modelUrl) {
    const fallback = <ProceduralVehicle vehicle={vehicle} onSelect={onSelect} />;
    return (
      <FallbackBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <GlbVehicle url={vehicle.modelUrl} vehicle={vehicle} />
        </Suspense>
      </FallbackBoundary>
    );
  }
  return <ProceduralVehicle vehicle={vehicle} onSelect={onSelect} />;
}

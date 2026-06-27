import { Component, Suspense, useMemo, useState, type ReactNode } from "react";
import { useGLTF, Html } from "@react-three/drei";
import { Box3, Vector3, type Material, type Mesh, type Object3D } from "three";
import type { VehicleDetail } from "@sev/shared";
import { ProceduralVehicle } from "./ProceduralVehicle.js";
import { Hotspot } from "./Hotspot.js";
import { classifyMesh } from "./glbMapping.js";
import { makeObjectId } from "../interaction/objectId.js";

const TARGET_FOOTPRINT = 4.2; // normalize every model to ~the procedural car's footprint, for stable framing
// Ground/shadow/podium planes some exporters bake in (underscore-delimited, e.g. `SOL01_SOL_0`, `Layer3_SHADE`).
const HIDE_RE = /(^|[^a-z])(sol|ground|podium|stage|backdrop|shadow|shade)([^a-z]|$)|floor[_\-.]?plane/i;

class FallbackBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface GlassyMat { transmission?: number; transparent?: boolean; }
function isGlassMaterial(mesh: Mesh): boolean {
  const m = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as GlassyMat | undefined;
  if (!m) return false;
  // Car glass is usually alphaMode BLEND with opacity 1 (alpha is in the texture), so three sets
  // material.transparent=true while opacity stays 1 — treat any transparent/transmissive material as
  // glass, else the greenhouse is misread as opaque body and you can't see into the cabin.
  return (m.transmission ?? 0) > 0 || m.transparent === true;
}

/**
 * Render window glass as plain clear alpha-blend so the cabin is visible. Many car GLBs ship glass
 * with KHR transmission=1, which three renders via a transmission pass that — under a bright studio
 * environment — reads as an opaque mirror (you "can't see inside"). Dropping transmission/metalness
 * and using simple low-opacity blending gives reliable see-through glass.
 */
function makeGlassy(mesh: Mesh) {
  const toGlass = (m: Material) => {
    const g = m.clone() as Material & {
      opacity: number; transparent: boolean; depthWrite: boolean;
      transmission?: number; roughness?: number; metalness?: number;
    };
    g.transparent = true;
    g.opacity = 0.35;
    g.depthWrite = false; // don't let the glass occlude the interior behind it
    if ("transmission" in g) g.transmission = 0;
    if ("roughness" in g) g.roughness = 0.05;
    if ("metalness" in g) g.metalness = 0;
    return g;
  };
  mesh.material = Array.isArray(mesh.material) ? mesh.material.map(toGlass) : toGlass(mesh.material);
}

interface MatchedPart { partId: string; meshName: string; label: string; position: [number, number, number]; }

/**
 * Walk a real GLB, classify each mesh to a canonical part, and stamp the gaze contract
 * (`objectId`/`meshName`/`componentId`) onto it — so raycasting, dwell, heatmaps and the
 * componentView analytics keep working unchanged. Hotspots auto-place at each part's centroid.
 */
function prepareScene(source: Object3D, vehicle: VehicleDetail) {
  const root = source.clone(true);
  const partByMesh = new Map(vehicle.parts.map((p) => [p.meshName, p]));

  // Remove ground/shadow planes before measuring — Box3.setFromObject ignores `.visible`,
  // so merely hiding them would still distort the bounding box (and thus the auto-scale).
  const toRemove: Object3D[] = [];
  root.traverse((o) => {
    if ((o as Mesh).isMesh && HIDE_RE.test(o.name)) toRemove.push(o);
  });
  for (const o of toRemove) o.removeFromParent();

  const modelBox = new Box3().setFromObject(root);
  const modelSize = modelBox.getSize(new Vector3());
  const modelCenter = modelBox.getCenter(new Vector3());
  const model = {
    min: [modelBox.min.x, modelBox.min.y, modelBox.min.z] as const,
    size: [modelSize.x, modelSize.y, modelSize.z] as const,
  };

  const centroids = new Map<string, { sum: Vector3; n: number }>();
  const box = new Box3();
  const c = new Vector3();
  const s = new Vector3();

  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    box.setFromObject(mesh);
    box.getCenter(c);
    box.getSize(s);
    const canonical = classifyMesh({
      name: mesh.name,
      isGlass: isGlassMaterial(mesh),
      mesh: { center: [c.x, c.y, c.z], size: [s.x, s.y, s.z] },
      model,
    });
    const part = partByMesh.get(canonical);
    if (!part) return;

    mesh.userData.objectId = makeObjectId(vehicle.id, part.id);
    mesh.userData.meshName = part.meshName;
    mesh.userData.componentId = part.id;
    if (canonical === "windows") makeGlassy(mesh);

    const agg = centroids.get(part.id) ?? { sum: new Vector3(), n: 0 };
    agg.sum.add(c);
    agg.n += 1;
    centroids.set(part.id, agg);
  });

  const scale = TARGET_FOOTPRINT / (Math.max(modelSize.x, modelSize.z) || 1);
  const position: [number, number, number] = [-modelCenter.x * scale, -modelBox.min.y * scale, -modelCenter.z * scale];

  const matched: MatchedPart[] = vehicle.parts
    .filter((p) => p.interactive && centroids.has(p.id))
    .map((p) => {
      const a = centroids.get(p.id)!;
      const cen = a.sum.clone().multiplyScalar(1 / a.n);
      return { partId: p.id, meshName: p.meshName, label: p.name, position: [cen.x, cen.y, cen.z] };
    });

  return { root, scale, position, matched };
}

function GlbVehicle({ url, vehicle, onSelect }: {
  url: string;
  vehicle: VehicleDetail;
  onSelect: (componentId: string) => void;
}) {
  const { scene } = useGLTF(url);
  const [hovered, setHovered] = useState<string | null>(null);
  const { root, scale, position, matched } = useMemo(() => prepareScene(scene, vehicle), [scene, vehicle]);

  const componentAt = (o: Object3D | undefined): string | undefined =>
    (o?.userData?.componentId as string | undefined) ?? undefined;

  return (
    <group
      scale={scale}
      position={position}
      onPointerMove={(e) => { e.stopPropagation(); setHovered(componentAt(e.object) ?? null); }}
      onPointerOut={() => setHovered(null)}
      onClick={(e) => {
        e.stopPropagation();
        const id = componentAt(e.object);
        if (id) onSelect(id);
      }}
    >
      <primitive object={root} />
      {matched.map((m) => (
        <Hotspot
          key={m.partId}
          position={{ x: m.position[0], y: m.position[1], z: m.position[2] }}
          label={m.label}
          hovered={hovered === m.partId}
        />
      ))}
    </group>
  );
}

function ModelLoading() {
  return (
    <Html center>
      <div className="rounded-full border border-neon/40 bg-base/70 px-3 py-1 text-xs text-neon">
        Loading model…
      </div>
    </Html>
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
        <Suspense fallback={<ModelLoading />}>
          <GlbVehicle url={vehicle.modelUrl} vehicle={vehicle} onSelect={onSelect} />
        </Suspense>
      </FallbackBoundary>
    );
  }
  return <ProceduralVehicle vehicle={vehicle} onSelect={onSelect} />;
}

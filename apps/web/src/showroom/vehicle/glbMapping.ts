import type { VehiclePartDTO } from "@sev/shared";

export function normalizeMeshName(s: string): string {
  return s.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

/** Exact normalized-name mapping (kept for idealized GLBs whose meshes already match part names). */
export function mapMeshesToParts(meshNames: string[], parts: VehiclePartDTO[]) {
  const byName = new Map(parts.map((p) => [normalizeMeshName(p.meshName), p]));
  return meshNames.map((meshName) => ({
    meshName,
    part: byName.get(normalizeMeshName(meshName)) ?? null,
  }));
}

/** Canonical part meshNames the analytics/gaze pipeline keys on (mirror of the seeded PARTS). */
export const CANONICAL_PARTS = [
  "body", "windows", "doors", "hood", "trunk", "wheels", "steering-wheel",
  "dashboard", "infotainment", "battery", "charging-port", "mirrors", "seats",
  "headlights", "taillights",
] as const;
export type CanonicalPart = (typeof CANONICAL_PARTS)[number];

// Ordered keyword rules — first match wins, so specific tokens precede the generic `body` catch-all.
// Covers English + the French terms seen in the Lotus model (verre=glass, mirroir=mirror,
// lamp-avant=front lamp, lamp-arr=rear lamp, carros=carrosserie/body, porte=door).
const NAME_RULES: ReadonlyArray<readonly [RegExp, CanonicalPart]> = [
  [/steer/, "steering-wheel"],
  [/wheel|tyre|tire|\brim\b|rim[_\-.]|[_\-.]rim|brake|calliper|caliper|\bdisc\b|disk|hubcap|\blug\b|tread/, "wheels"],
  [/head.?l|headlamp|(^|[_\-.])hl([_\-.]|$)|lamp.?avant|[_\-.]avant|\bdrl\b|fog.?l/, "headlights"],
  [/tail.?l|taillamp|(^|[_\-.])tl([_\-.]|$)|rear.?l|brake.?light|break.?light|lamp.?arr|[_\-.]arr([_\-.]|$)|feu.?arr|rare.?light/, "taillights"],
  [/mirror|mirroir|rear.?view/, "mirrors"],
  [/door|porte|portiere/, "doors"],
  [/windshield|windscreen|window|glass|verre|glazing|canopy|sunroof/, "windows"],
  [/charg|chrg|\bplug\b|inlet|filler/, "charging-port"],
  [/batter|\baccu\b|cell.?pack/, "battery"],
  [/infotain|touchscreen|\bhmi\b|display|head.?unit|nav.?screen/, "infotainment"],
  [/dash|cockpit|console|fascia|instrument/, "dashboard"],
  [/hood|bonnet|frunk/, "hood"],
  [/trunk|tailgate|liftgate|\bhatch\b/, "trunk"],
  [/seat|siege|seatbelt|belt|cushion/, "seats"],
  [/interior|cabin|trim|carpet|headliner/, "seats"],
  [/grill|bumper|fender|panel|paint|carros|chassis|corner|cavity|\broof\b|pillar|skirt|spoiler|diffuser|splitter|badge|logo|plate|plaque|antenna|wiper|exhaust|\bsill\b|vent|emblem|sticker|defogger|reflector|carbon|base/, "body"],
];

/** Pure keyword classifier: GLB mesh/node name -> canonical part, or null if no token matches. */
export function classifyMeshName(raw: string): CanonicalPart | null {
  const n = raw.toLowerCase();
  for (const [re, part] of NAME_RULES) if (re.test(n)) return part;
  return null;
}

export interface MeshGeom { center: readonly [number, number, number]; size: readonly [number, number, number]; }
export interface ModelGeom { min: readonly [number, number, number]; size: readonly [number, number, number]; }

/**
 * Geometry fallback for models with meaningless mesh names (e.g. Lamborghini's `Object_N`):
 * a wheel sits low and toward the outer corners, and is small relative to the whole body.
 */
export function classifyByPosition(mesh: MeshGeom, model: ModelGeom): CanonicalPart | null {
  const [cx, cy, cz] = mesh.center;
  const [minx, miny, minz] = model.min;
  const [sx, sy, sz] = model.size;
  if (sx <= 0 || sy <= 0 || sz <= 0) return null;

  const lowBand = cy < miny + 0.33 * sy; // bottom third of the car
  const offX = Math.abs(cx - (minx + sx / 2)) / (sx / 2); // 0=centerline, 1=edge
  const offZ = Math.abs(cz - (minz + sz / 2)) / (sz / 2);
  const outer = offX > 0.3 || offZ > 0.3; // toward a corner
  const small = mesh.size[0] < 0.6 * sx && mesh.size[2] < 0.6 * sz; // not the full-width underbody pan
  return lowBand && outer && small ? "wheels" : null;
}

export interface ClassifyInput {
  name: string;
  isGlass?: boolean;
  mesh: MeshGeom;
  model: ModelGeom;
}

/**
 * Resolve any GLB mesh to a canonical part. Priority: explicit name keyword -> transparent
 * material (glass) -> geometry (wheels) -> `body` default, so every mesh is always gaze-trackable.
 */
export function classifyMesh(input: ClassifyInput): CanonicalPart {
  return (
    classifyMeshName(input.name) ??
    (input.isGlass ? "windows" : null) ??
    classifyByPosition(input.mesh, input.model) ??
    "body"
  );
}

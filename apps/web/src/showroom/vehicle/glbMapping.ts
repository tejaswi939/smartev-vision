import type { VehiclePartDTO } from "@sev/shared";

export function normalizeMeshName(s: string): string {
  return s.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

export function mapMeshesToParts(meshNames: string[], parts: VehiclePartDTO[]) {
  const byName = new Map(parts.map((p) => [normalizeMeshName(p.meshName), p]));
  return meshNames.map((meshName) => ({
    meshName,
    part: byName.get(normalizeMeshName(meshName)) ?? null,
  }));
}

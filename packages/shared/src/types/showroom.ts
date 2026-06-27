export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface VehicleSummary {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  type: string;
  thumbnailUrl: string | null;
  rangeKm: number;
  priceUsd: number;
}

export interface VehiclePartDTO {
  id: string;
  name: string;
  category: string;
  meshName: string;
  specs: Record<string, string> | null;
  hotspotPosition: Vec3 | null;
  animation: string | null;
  interactive: boolean;
  displayOrder: number;
}

export interface VehicleDetail extends VehicleSummary {
  modelUrl: string | null;
  metadata: Record<string, unknown> | null;
  parts: VehiclePartDTO[];
}

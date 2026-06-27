import type { Request, Response } from "express";
import type { VehicleSummary, VehicleDetail, VehiclePartDTO, Vec3 } from "@sev/shared";
import type { Vehicle, VehiclePart } from "@prisma/client";
import { vehicleRepo } from "../repositories/vehicle.repo.js";
import { HttpError } from "../lib/httpError.js";

function toSummary(v: Vehicle): VehicleSummary {
  return {
    id: v.id, slug: v.slug, name: v.name, category: v.category, type: v.type,
    thumbnailUrl: v.thumbnailUrl, rangeKm: v.rangeKm, priceUsd: v.priceUsd,
  };
}

function toPart(p: VehiclePart): VehiclePartDTO {
  return {
    id: p.id, name: p.name, category: p.category, meshName: p.meshName,
    specs: p.specs as unknown as Record<string, string> | null,
    hotspotPosition: p.hotspotPosition as unknown as Vec3 | null,
    animation: p.animation, interactive: p.interactive, displayOrder: p.displayOrder,
  };
}

export async function listVehicles(_req: Request, res: Response) {
  const rows = await vehicleRepo.listPublished();
  res.json({ vehicles: rows.map(toSummary) });
}

export async function getVehicle(req: Request, res: Response) {
  const v = await vehicleRepo.bySlug(req.params.slug!);
  if (!v || !v.isPublished) throw new HttpError(404, "Vehicle not found");
  const detail: VehicleDetail = {
    ...toSummary(v),
    modelUrl: v.modelUrl,
    metadata: v.metadata as unknown as Record<string, unknown> | null,
    parts: v.parts.map(toPart),
  };
  res.json({ vehicle: detail });
}

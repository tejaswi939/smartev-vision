import type { Request, Response } from "express";
import { prisma } from "../db.js";
import { nodeAnalyticsEngine, computeSession } from "../analytics/engine.node.js";
import { buildHeatmapGrid } from "../analytics/heatmap.js";
import { attentionPercentages, type ComponentAgg } from "../analytics/formulas.js";
import { gazeRepo } from "../repositories/gaze.repo.js";
import { sessionRepo } from "../repositories/session.repo.js";
import { HttpError } from "../lib/httpError.js";

function assertCanViewSession(req: Request, session: { userId: string | null }): void {
  const role = req.user?.role;
  if (role === "ADMIN" || role === "ANALYST") return;
  if (session.userId && session.userId === req.user?.id) return;
  throw new HttpError(403, "Forbidden");
}

export async function getSessionAnalytics(req: Request, res: Response) {
  const session = await sessionRepo.findById(req.params.id!);
  if (!session) throw new HttpError(404, "Session not found");
  assertCanViewSession(req, session);
  res.json({ analytics: await computeSession(session.id) });
}

export async function getSessionHeatmap(req: Request, res: Response) {
  const session = await sessionRepo.findById(req.params.id!);
  if (!session) throw new HttpError(404, "Session not found");
  assertCanViewSession(req, session);
  const points = await gazeRepo.forSession(session.id);
  const analytics = await computeSession(session.id);
  res.json({
    resolution: 40,
    grid: buildHeatmapGrid(points, 40),
    componentScores: (analytics?.components ?? []).map((c) => ({ meshName: c.meshName, attentionPct: c.attentionPct })),
  });
}

export async function getSessionReport(req: Request, res: Response) {
  const session = await sessionRepo.findById(req.params.id!);
  if (!session) throw new HttpError(404, "Session not found");
  assertCanViewSession(req, session);
  res.json({
    report: {
      sessionId: session.id,
      generatedAt: session.endedAt ?? new Date(),
      analytics: await computeSession(session.id),
      note: "JSON insights report. PDF/Excel export arrives in Phase 5.",
    },
  });
}

export async function listSessions(req: Request, res: Response) {
  const role = req.user?.role;
  const rows = role === "ADMIN" || role === "ANALYST"
    ? await sessionRepo.listAll()
    : await sessionRepo.listForUser(req.user!.id);
  res.json({ sessions: rows });
}

export async function getVehicleAnalytics(req: Request, res: Response) {
  const vehicle = await prisma.vehicle.findUnique({ where: { slug: req.params.slug! } });
  if (!vehicle) throw new HttpError(404, "Vehicle not found");
  const grouped = await prisma.componentView.groupBy({
    by: ["meshName"],
    where: { vehicleId: vehicle.id },
    _sum: { totalViewMs: true, focusCount: true, interactionCount: true },
  });
  const agg: ComponentAgg[] = grouped.map((g) => ({
    meshName: g.meshName, name: g.meshName,
    totalViewMs: g._sum.totalViewMs ?? 0, focusCount: g._sum.focusCount ?? 0, interactionCount: g._sum.interactionCount ?? 0,
  }));
  const att = attentionPercentages(agg);
  const sessions = await prisma.session.findMany({ where: { vehicleId: vehicle.id }, select: { engagementScore: true } });
  const eng = sessions.map((s) => s.engagementScore).filter((x): x is number => x != null);
  res.json({
    vehicle: { slug: vehicle.slug, name: vehicle.name },
    sessionCount: sessions.length,
    avgEngagement: eng.length ? eng.reduce((a, b) => a + b, 0) / eng.length : 0,
    components: [...att.entries()]
      .map(([meshName, attentionPct]) => ({ meshName, attentionPct }))
      .sort((a, b) => b.attentionPct - a.attentionPct),
  });
}

export async function getVehicleHeatmap(req: Request, res: Response) {
  const vehicle = await prisma.vehicle.findUnique({ where: { slug: req.params.slug! } });
  if (!vehicle) throw new HttpError(404, "Vehicle not found");
  const points = await gazeRepo.forVehicle(vehicle.id);
  res.json({ resolution: 40, grid: buildHeatmapGrid(points, 40), componentScores: [] });
}

export async function getOverview(_req: Request, res: Response) {
  res.json(await nodeAnalyticsEngine.overview());
}

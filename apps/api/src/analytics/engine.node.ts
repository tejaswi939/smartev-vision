import type { AnalyticsEngine } from "./AnalyticsEngine.js";
import type { SessionAnalytics, OverviewKPIs, VehiclePopularity, ComponentScore } from "@sev/shared";
import { prisma } from "../db.js";
import * as f from "./formulas.js";
import { TtlCache } from "./cache.js";

const cache = new TtlCache(3000);
const INTERACTIVE_TOTAL = 15;

function toAgg(views: { meshName: string; totalViewMs: number; focusCount: number; interactionCount: number }[]): f.ComponentAgg[] {
  return views.map((v) => ({
    meshName: v.meshName, name: v.meshName,
    totalViewMs: v.totalViewMs, focusCount: v.focusCount, interactionCount: v.interactionCount,
  }));
}

export async function computeSession(sessionId: string): Promise<SessionAnalytics | null> {
  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { componentViews: true } });
  if (!session) return null;
  const views = session.componentViews;
  const agg = toAgg(views);
  const components: ComponentScore[] = f.componentRanking(agg);
  const totalViewMs = agg.reduce((s, c) => s + c.totalViewMs, 0);
  const totalFocus = agg.reduce((s, c) => s + c.focusCount, 0);
  const interactions = agg.reduce((s, c) => s + c.interactionCount, 0);
  const uniqueViewed = agg.filter((c) => c.totalViewMs > 0).length;
  const entryTransitions = views.reduce((s, v) => s + v.entryCount, 0);
  const engagement = f.engagementScore({
    uniqueViewed, totalComponents: INTERACTIVE_TOTAL,
    avgDwellMs: totalFocus > 0 ? totalViewMs / totalFocus : 0,
    interactions, durationSec: session.durationSec ?? 0, entryTransitions,
  });
  const highValueDwellMs = agg.filter((c) => f.HIGH_VALUE_MESHES.has(c.meshName)).reduce((s, c) => s + c.totalViewMs, 0);
  const interest = f.interestScore({ engagement, highValueDwellMs, totalViewMs, interactions });
  const timeline = [...views]
    .filter((v) => v.firstSeenMs != null)
    .sort((a, b) => a.firstSeenMs! - b.firstSeenMs!)
    .map((v) => ({ tMs: v.firstSeenMs!, meshName: v.meshName }));
  return {
    sessionId, vehicleId: session.vehicleId,
    totalGazeMs: session.totalGazeMs ?? totalViewMs,
    engagementScore: engagement, interestScore: interest,
    mostViewed: f.mostViewed(agg), leastViewed: f.leastViewed(agg),
    components, timeline,
  };
}

export async function computeVehiclePopularity(): Promise<VehiclePopularity[]> {
  const vehicles = await prisma.vehicle.findMany({ where: { isPublished: true } });
  const avg = (xs: (number | null)[]) => {
    const nn = xs.filter((x): x is number => x != null);
    return nn.length ? nn.reduce((a, b) => a + b, 0) / nn.length : 0;
  };
  const rows = await Promise.all(
    vehicles.map(async (v) => {
      const sessions = await prisma.session.findMany({ where: { vehicleId: v.id }, select: { engagementScore: true, interestScore: true } });
      const agg = await prisma.componentView.aggregate({ where: { vehicleId: v.id }, _sum: { totalViewMs: true } });
      return {
        slug: v.slug, name: v.name, sessionCount: sessions.length,
        avgEngagement: avg(sessions.map((s) => s.engagementScore)),
        avgInterest: avg(sessions.map((s) => s.interestScore)),
        totalViewMs: agg._sum.totalViewMs ?? 0,
      };
    }),
  );
  return f.vehiclePopularity(rows);
}

export async function computeOverview(): Promise<OverviewKPIs> {
  const [totalSessions, activeSessions, engAgg, intAgg, vehiclePopularity, grouped] = await Promise.all([
    prisma.session.count(),
    prisma.session.count({ where: { status: "ACTIVE" } }),
    prisma.session.aggregate({ _avg: { engagementScore: true } }),
    prisma.session.aggregate({ _avg: { interestScore: true } }),
    computeVehiclePopularity(),
    prisma.componentView.groupBy({ by: ["meshName"], _sum: { totalViewMs: true } }),
  ]);
  const aggComps: f.ComponentAgg[] = grouped.map((g) => ({
    meshName: g.meshName, name: g.meshName, totalViewMs: g._sum.totalViewMs ?? 0, focusCount: 1, interactionCount: 0,
  }));
  const scored = [...f.attentionPercentages(aggComps).entries()]
    .map(([meshName, attentionPct]) => ({ meshName, attentionPct }))
    .sort((a, b) => b.attentionPct - a.attentionPct);
  return {
    totalSessions, activeSessions,
    avgEngagement: engAgg._avg.engagementScore ?? 0,
    avgInterest: intAgg._avg.interestScore ?? 0,
    vehiclePopularity,
    topComponents: scored.slice(0, 5),
    bottomComponents: scored.slice(-5).reverse(),
  };
}

export const nodeAnalyticsEngine: AnalyticsEngine = {
  sessionAnalytics: (id) => cache.get(`session:${id}`, () => computeSession(id)),
  vehiclePopularity: () => cache.get("popularity", computeVehiclePopularity),
  overview: () => cache.get("overview", computeOverview),
};

export { cache as analyticsCache };

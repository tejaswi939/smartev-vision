import type { ComponentScore, VehiclePopularity } from "@sev/shared";

export interface ComponentAgg {
  meshName: string;
  name: string;
  totalViewMs: number;
  focusCount: number;
  interactionCount: number;
}

export const HIGH_VALUE_MESHES = new Set(["infotainment", "interior", "battery", "seats", "dashboard"]);
const DWELL_BENCHMARK_MS = 2000;
const DEFAULT_EXCLUDE = new Set(["body", "windows"]);
const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

export function attentionPercentages(components: ComponentAgg[]): Map<string, number> {
  const total = components.reduce((s, c) => s + c.totalViewMs, 0);
  const m = new Map<string, number>();
  for (const c of components) m.set(c.meshName, total > 0 ? (c.totalViewMs / total) * 100 : 0);
  return m;
}

export function avgDwellMs(c: ComponentAgg): number {
  return c.focusCount > 0 ? c.totalViewMs / c.focusCount : 0;
}

export function mostViewed(components: ComponentAgg[], exclude = DEFAULT_EXCLUDE): string | null {
  const pool = components.filter((c) => !exclude.has(c.meshName) && c.totalViewMs > 0);
  if (!pool.length) return null;
  return pool.reduce((a, b) => (b.totalViewMs > a.totalViewMs ? b : a)).meshName;
}

export function leastViewed(components: ComponentAgg[], exclude = DEFAULT_EXCLUDE): string | null {
  const pool = components.filter((c) => !exclude.has(c.meshName) && c.totalViewMs > 0);
  if (!pool.length) return null;
  return pool.reduce((a, b) => (b.totalViewMs < a.totalViewMs ? b : a)).meshName;
}

export function engagementScore(i: {
  uniqueViewed: number;
  totalComponents: number;
  avgDwellMs: number;
  interactions: number;
  durationSec: number;
  entryTransitions: number;
}): number {
  const coverage = i.totalComponents > 0 ? Math.min(i.uniqueViewed / i.totalComponents, 1) : 0;
  const depth = Math.min(i.avgDwellMs / DWELL_BENCHMARK_MS, 1);
  const durMin = Math.max(i.durationSec / 60, 1 / 60);
  const activity = Math.min(i.interactions / durMin / 10, 1);
  const breadth = i.uniqueViewed > 0 ? Math.min(i.entryTransitions / (i.uniqueViewed * 3), 1) : 0;
  return clamp((coverage * 0.3 + depth * 0.3 + activity * 0.2 + breadth * 0.2) * 100);
}

export function interestScore(i: {
  engagement: number;
  highValueDwellMs: number;
  totalViewMs: number;
  interactions: number;
}): number {
  const hv = i.totalViewMs > 0 ? Math.min(i.highValueDwellMs / i.totalViewMs, 1) : 0;
  const depth = Math.min(i.interactions / 20, 1);
  return clamp(0.5 * i.engagement + 0.3 * hv * 100 + 0.2 * depth * 100);
}

export function componentRanking(components: ComponentAgg[]): ComponentScore[] {
  const att = attentionPercentages(components);
  const maxInteractions = Math.max(1, ...components.map((c) => c.interactionCount));
  return components
    .map((c) => {
      const attentionPct = att.get(c.meshName) ?? 0;
      const composite = 0.7 * attentionPct + 0.3 * (c.interactionCount / maxInteractions) * 100;
      return { c, attentionPct, composite };
    })
    .sort((a, b) => b.composite - a.composite)
    .map(({ c, attentionPct }, idx): ComponentScore => ({
      meshName: c.meshName,
      name: c.name,
      totalViewMs: c.totalViewMs,
      focusCount: c.focusCount,
      avgDwellMs: avgDwellMs(c),
      attentionPct,
      interactionCount: c.interactionCount,
      rank: idx + 1,
    }));
}

export function vehiclePopularity(rows: {
  slug: string;
  name: string;
  sessionCount: number;
  avgEngagement: number;
  avgInterest: number;
  totalViewMs: number;
}[]): VehiclePopularity[] {
  return rows
    .map((r) => ({ ...r, score: r.sessionCount * (r.avgEngagement / 100) }))
    .sort((a, b) => b.score - a.score);
}

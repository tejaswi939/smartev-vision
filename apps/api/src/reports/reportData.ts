import type { SessionAnalytics } from "@sev/shared";

export interface SessionReportData {
  title: string;
  kpis: Record<string, string | number>;
  components: { meshName: string; attentionPct: number; totalViewMs: number }[];
}

export function buildSessionReportData(
  analytics: SessionAnalytics,
  vehicleName: string
): SessionReportData {
  return {
    title: `Session Report — ${vehicleName}`,
    kpis: {
      "Engagement Score": analytics.engagementScore,
      "Interest Score": analytics.interestScore,
      "Most Viewed": analytics.mostViewed ?? "N/A",
      "Least Viewed": analytics.leastViewed ?? "N/A",
      "Total Gaze (ms)": analytics.totalGazeMs,
    },
    components: analytics.components.map((c) => ({
      meshName: c.meshName,
      attentionPct: c.attentionPct,
      totalViewMs: c.totalViewMs,
    })),
  };
}

export interface ComponentScore {
  meshName: string;
  name: string;
  totalViewMs: number;
  focusCount: number;
  avgDwellMs: number;
  attentionPct: number;
  interactionCount: number;
  rank: number;
}

export interface SessionAnalytics {
  sessionId: string;
  vehicleId: string;
  totalGazeMs: number;
  engagementScore: number;
  interestScore: number;
  mostViewed: string | null;
  leastViewed: string | null;
  components: ComponentScore[];
  timeline: { tMs: number; meshName: string }[];
}

export interface HeatmapGrid {
  resolution: number;
  grid: number[][];
  componentScores: { meshName: string; attentionPct: number }[];
}

export interface VehiclePopularity {
  slug: string;
  name: string;
  sessionCount: number;
  avgEngagement: number;
  avgInterest: number;
  totalViewMs: number;
  score: number;
}

export interface OverviewKPIs {
  totalSessions: number;
  activeSessions: number;
  avgEngagement: number;
  avgInterest: number;
  vehiclePopularity: VehiclePopularity[];
  topComponents: { meshName: string; attentionPct: number }[];
  bottomComponents: { meshName: string; attentionPct: number }[];
}

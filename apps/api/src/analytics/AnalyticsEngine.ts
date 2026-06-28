import type { SessionAnalytics, OverviewKPIs, VehiclePopularity } from "@sev/shared";

/**
 * The analytics boundary. Phase 2 ships a Node implementation; Phase 3 can provide a
 * Python-backed implementation (predictions/emotion/recommendation) WITHOUT changing
 * API contracts or the frontend — they depend only on this interface and the shared types.
 */
export interface AnalyticsEngine {
  sessionAnalytics(sessionId: string): Promise<SessionAnalytics | null>;
  vehiclePopularity(): Promise<VehiclePopularity[]>;
  overview(): Promise<OverviewKPIs>;
}

import type { SessionFeaturesPayload } from "@sev/shared";

interface ComponentViewLike {
  meshName: string;
  totalViewMs: number;
  focusCount: number;
  entryCount: number;
}

interface SessionScores {
  engagementScore: number | null;
  interestScore: number | null;
  totalGazeMs: number | null;
}

/** Build the ML feature payload from a session's component-view aggregates + its scores. */
export function buildFeaturesPayload(
  componentViews: ComponentViewLike[],
  session: SessionScores,
): SessionFeaturesPayload {
  return {
    components: componentViews.map((c) => ({
      meshName: c.meshName,
      totalViewMs: c.totalViewMs,
      focusCount: c.focusCount,
      entryCount: c.entryCount,
    })),
    engagementScore: session.engagementScore ?? 0,
    interestScore: session.interestScore ?? 0,
    totalGazeMs: session.totalGazeMs ?? 0,
  };
}

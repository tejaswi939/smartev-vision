import { useParams } from "react-router-dom";
import type { SessionAnalytics, HeatmapGrid } from "@sev/shared";
import { AppShell } from "../../components/shell/AppShell.js";
import { StatCard, GlassCard, Skeleton } from "../../components/ui/index.js";
import { AttentionChart } from "../../analytics/AttentionChart.js";
import { SessionTimeline } from "../../analytics/SessionTimeline.js";
import { CustomerJourney } from "../../analytics/CustomerJourney.js";
import { Heatmap2D } from "../../analytics/Heatmap2D.js";
import { useAnalyticsPolling } from "../../showroom/data/useAnalyticsPolling.js";
import { api } from "../../lib/apiClient.js";

export default function SessionDetail() {
  const { id } = useParams();
  const { data } = useAnalyticsPolling<{ analytics: SessionAnalytics | null }>(
    ["session", id],
    () => api.get(`/sessions/${id}/analytics`),
  );
  const heat = useAnalyticsPolling<HeatmapGrid>(["session-heat", id], () => api.get(`/sessions/${id}/heatmap`));
  const loaded = data !== undefined;
  const a = data?.analytics;

  return (
    <AppShell role="CUSTOMER" title="Session Detail">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Engagement" value={a ? `${Math.round(a.engagementScore)}%` : "—"} loading={!loaded} />
        <StatCard label="Interest" value={a ? `${Math.round(a.interestScore)}%` : "—"} loading={!loaded} />
        <StatCard label="Most viewed" value={a?.mostViewed ?? "—"} loading={!loaded} />
      </div>

      {loaded && !a ? (
        <GlassCard>
          <div className="text-sm text-slate-500">
            No attention data recorded for this session yet.
          </div>
        </GlassCard>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <GlassCard>
              <div className="mb-3 font-display text-white">Attention by component</div>
              {a ? <AttentionChart components={a.components} /> : <Skeleton className="h-48 w-full" />}
            </GlassCard>
            <GlassCard>
              <div className="mb-3 font-display text-white">Gaze heatmap</div>
              {heat.data ? <Heatmap2D grid={heat.data.grid} /> : <Skeleton className="h-48 w-full" />}
            </GlassCard>
          </div>
          <GlassCard>
            <div className="mb-3 font-display text-white">Customer journey</div>
            {a ? <CustomerJourney timeline={a.timeline} /> : <Skeleton className="h-24 w-full" />}
          </GlassCard>
          <GlassCard>
            <div className="mb-3 font-display text-white">Timeline</div>
            {a ? <SessionTimeline timeline={a.timeline} /> : <Skeleton className="h-24 w-full" />}
          </GlassCard>
        </>
      )}
    </AppShell>
  );
}

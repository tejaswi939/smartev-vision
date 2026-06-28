import { useParams } from "react-router-dom";
import type { SessionAnalytics, HeatmapGrid, PredictionDTO } from "@sev/shared";
import { AppShell } from "../../components/shell/AppShell.js";
import { StatCard, GlassCard, Skeleton } from "../../components/ui/index.js";
import { AttentionChart } from "../../analytics/AttentionChart.js";
import { SessionTimeline } from "../../analytics/SessionTimeline.js";
import { CustomerJourney } from "../../analytics/CustomerJourney.js";
import { Heatmap2D } from "../../analytics/Heatmap2D.js";
import { PredictionCard } from "../../analytics/PredictionCard.js";
import { FeedbackForm } from "../../analytics/FeedbackForm.js";
import { useAnalyticsPolling } from "../../showroom/data/useAnalyticsPolling.js";
import { api } from "../../lib/apiClient.js";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

interface SessionRow {
  id: string;
  vehicle?: { name: string; slug: string } | null;
}

export default function SessionDetail() {
  const { id } = useParams();
  const { data } = useAnalyticsPolling<{ analytics: SessionAnalytics | null }>(
    ["session", id],
    () => api.get(`/sessions/${id}/analytics`),
  );
  const heat = useAnalyticsPolling<HeatmapGrid>(["session-heat", id], () => api.get(`/sessions/${id}/heatmap`));
  const pred = useAnalyticsPolling<{ prediction: PredictionDTO | null }>(
    ["session-prediction", id],
    () => api.get(`/sessions/${id}/prediction`),
  );
  const sessions = useAnalyticsPolling<{ sessions: SessionRow[] }>(
    ["sessions-list"],
    () => api.get("/sessions"),
  );
  const loaded = data !== undefined;
  const a = data?.analytics;
  const vehicleSlug = sessions.data?.sessions.find((s) => s.id === id)?.vehicle?.slug;

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
          <PredictionCard prediction={pred.data?.prediction ?? null} />
        </>
      )}

      {/* Report export */}
      <GlassCard>
        <div className="mb-3 font-display text-white">Export session report</div>
        <div className="flex gap-3">
          <a
            href={`${API_BASE}/sessions/${id}/report?format=pdf`}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Export PDF
          </a>
          <a
            href={`${API_BASE}/sessions/${id}/report?format=xlsx`}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Export Excel
          </a>
        </div>
      </GlassCard>

      {/* Feedback form — rendered once the vehicle slug is resolved */}
      {vehicleSlug ? (
        <FeedbackForm
          vehicleId={vehicleSlug}
          sessionId={id}
          parts={(data?.analytics?.components ?? []).map((c) => ({ meshName: c.meshName, name: c.meshName }))}
        />
      ) : (
        <GlassCard>
          <div className="text-sm text-slate-500">Loading feedback…</div>
        </GlassCard>
      )}
    </AppShell>
  );
}

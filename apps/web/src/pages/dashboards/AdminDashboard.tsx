import type { OverviewKPIs, RecommendationDTO, FeedbackSummary } from "@sev/shared";
import { AppShell } from "../../components/shell/AppShell.js";
import { StatCard, GlassCard, Skeleton } from "../../components/ui/index.js";
import { PopularityChart } from "../../analytics/PopularityChart.js";
import { ComponentBars } from "../../analytics/ComponentBars.js";
import { RecommendationsPanel } from "../../analytics/RecommendationsPanel.js";
import { SentimentPanel } from "../../analytics/SentimentPanel.js";
import { useAnalyticsPolling } from "../../showroom/data/useAnalyticsPolling.js";
import { api } from "../../lib/apiClient.js";

const EMPTY_SUMMARY: FeedbackSummary = { total: 0, sentiment: { positive: 0, neutral: 0, negative: 0 }, avgRating: null };

export default function AdminDashboard() {
  const { data } = useAnalyticsPolling<OverviewKPIs>(["overview"], () => api.get("/analytics/overview"));
  const recs = useAnalyticsPolling<{ recommendations: RecommendationDTO[] }>(
    ["recommendations"],
    () => api.get("/analytics/recommendations"),
  );
  const feedbackSummary = useAnalyticsPolling<{ summary: FeedbackSummary }>(
    ["feedback-summary"],
    () => api.get("/analytics/feedback-summary"),
  );
  const loading = !data;
  return (
    <AppShell role="ADMIN" title="Admin Overview">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total Sessions" value={data?.totalSessions ?? "—"} loading={loading} />
        <StatCard label="Active Sessions" value={data?.activeSessions ?? "—"} loading={loading} />
        <StatCard label="Avg. Engagement" value={data ? `${Math.round(data.avgEngagement)}%` : "—"} loading={loading} />
        <StatCard label="Avg. Interest" value={data ? `${Math.round(data.avgInterest)}%` : "—"} loading={loading} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <div className="mb-3 font-display text-white">Vehicle popularity</div>
          {data ? <PopularityChart vehicles={data.vehiclePopularity} /> : <Skeleton className="h-48 w-full" />}
        </GlassCard>
        <GlassCard>
          <div className="mb-3 font-display text-white">Top components by attention</div>
          {data ? <ComponentBars items={data.topComponents} /> : <Skeleton className="h-48 w-full" />}
        </GlassCard>
      </div>
      <GlassCard>
        <div className="mb-3 font-display text-white">Top recommended vehicles</div>
        <RecommendationsPanel recommendations={recs.data?.recommendations ?? []} />
      </GlassCard>
      <GlassCard>
        <div className="mb-3 font-display text-white">Feedback sentiment</div>
        <SentimentPanel summary={feedbackSummary.data?.summary ?? EMPTY_SUMMARY} />
      </GlassCard>
    </AppShell>
  );
}

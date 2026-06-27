import type { OverviewKPIs } from "@sev/shared";
import { AppShell } from "../../components/shell/AppShell.js";
import { StatCard, GlassCard, Skeleton } from "../../components/ui/index.js";
import { PopularityChart } from "../../analytics/PopularityChart.js";
import { ComponentBars } from "../../analytics/ComponentBars.js";
import { useAnalyticsPolling } from "../../showroom/data/useAnalyticsPolling.js";
import { api } from "../../lib/apiClient.js";

export default function AdminDashboard() {
  const { data } = useAnalyticsPolling<OverviewKPIs>(["overview"], () => api.get("/analytics/overview"));
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
    </AppShell>
  );
}

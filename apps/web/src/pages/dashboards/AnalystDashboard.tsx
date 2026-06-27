import type { OverviewKPIs } from "@sev/shared";
import { AppShell } from "../../components/shell/AppShell.js";
import { StatCard, GlassCard } from "../../components/ui/index.js";
import { PopularityChart } from "../../analytics/PopularityChart.js";
import { useAnalyticsPolling } from "../../showroom/data/useAnalyticsPolling.js";
import { api } from "../../lib/apiClient.js";

export default function AnalystDashboard() {
  const { data } = useAnalyticsPolling<OverviewKPIs>(["overview"], () => api.get("/analytics/overview"));
  return (
    <AppShell role="ANALYST" title="Insights">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total Sessions" value={data?.totalSessions ?? "—"} />
        <StatCard label="Avg. Engagement" value={data ? `${Math.round(data.avgEngagement)}%` : "—"} />
        <StatCard label="Avg. Interest" value={data ? `${Math.round(data.avgInterest)}%` : "—"} />
        <StatCard label="Top Component" value={data?.topComponents[0]?.meshName ?? "—"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <div className="mb-3 font-display text-white">Vehicle popularity</div>
          {data && <PopularityChart vehicles={data.vehiclePopularity} />}
        </GlassCard>
        <GlassCard>
          <div className="mb-3 font-display text-white">Most & least viewed components</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <ul className="space-y-1">
              {(data?.topComponents ?? []).map((c) => (
                <li key={c.meshName} className="flex justify-between"><span className="text-slate-300">{c.meshName}</span><span className="text-teal">{Math.round(c.attentionPct)}%</span></li>
              ))}
            </ul>
            <ul className="space-y-1">
              {(data?.bottomComponents ?? []).map((c) => (
                <li key={c.meshName} className="flex justify-between"><span className="text-slate-500">{c.meshName}</span><span className="text-slate-500">{Math.round(c.attentionPct)}%</span></li>
              ))}
            </ul>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}

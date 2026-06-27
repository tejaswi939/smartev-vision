import { Link } from "react-router-dom";
import { AppShell } from "../../components/shell/AppShell.js";
import { StatCard, GlassCard } from "../../components/ui/index.js";
import { useAnalyticsPolling } from "../../showroom/data/useAnalyticsPolling.js";
import { api } from "../../lib/apiClient.js";

interface SessionRow {
  id: string;
  vehicle?: { name: string; slug: string } | null;
  startedAt: string;
  engagementScore: number | null;
  status: string;
}

export default function CustomerDashboard() {
  const { data } = useAnalyticsPolling<{ sessions: SessionRow[] }>(["my-sessions"], () => api.get("/sessions"));
  const sessions = data?.sessions ?? [];
  const completed = sessions.filter((s) => s.status === "COMPLETED");
  const avgEng = completed.length
    ? Math.round(completed.reduce((a, s) => a + (s.engagementScore ?? 0), 0) / completed.length)
    : 0;

  return (
    <AppShell role="CUSTOMER" title="My Dashboard">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="My Sessions" value={sessions.length} />
        <StatCard label="Avg. Engagement" value={`${avgEng}%`} />
        <StatCard label="Explore" value={<Link to="/showroom" className="text-neon">Showroom →</Link>} />
      </div>
      <GlassCard>
        <div className="mb-3 font-display text-white">Recent sessions</div>
        {sessions.length === 0 ? (
          <div className="text-sm text-slate-500">
            No sessions yet — visit the <Link to="/showroom" className="text-neon">showroom</Link>.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-300">{s.vehicle?.name ?? "Vehicle"}</span>
                <Link to={`/app/sessions/${s.id}`} className="text-neon">View →</Link>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </AppShell>
  );
}

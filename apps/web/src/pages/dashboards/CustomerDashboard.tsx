import { Link } from "react-router-dom";
import { AppShell } from "../../components/shell/AppShell.js";
import { StatCard, GlassCard, Skeleton } from "../../components/ui/index.js";
import { useAnalyticsPolling } from "../../showroom/data/useAnalyticsPolling.js";
import { api } from "../../lib/apiClient.js";

interface SessionRow {
  id: string;
  vehicle?: { name: string; slug: string } | null;
  startedAt: string;
  engagementScore: number | null;
  status: string;
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "COMPLETED" ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
    : status === "ACTIVE" ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
    : "text-slate-400 border-white/10 bg-white/5";
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${tone}`}>{status.toLowerCase()}</span>;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function CustomerDashboard() {
  const { data } = useAnalyticsPolling<{ sessions: SessionRow[] }>(["my-sessions"], () => api.get("/sessions"));
  const loading = !data;
  const sessions = data?.sessions ?? [];
  const completed = sessions.filter((s) => s.status === "COMPLETED");
  const avgEng = completed.length
    ? Math.round(completed.reduce((a, s) => a + (s.engagementScore ?? 0), 0) / completed.length)
    : 0;

  return (
    <AppShell role="CUSTOMER" title="My Dashboard">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="My Sessions" value={sessions.length} loading={loading} />
        <StatCard label="Avg. Engagement" value={`${avgEng}%`} loading={loading} />
        <StatCard label="Explore" value={<Link to="/showroom" className="text-neon">Showroom →</Link>} />
      </div>
      <GlassCard>
        <div className="mb-3 font-display text-white">Recent sessions</div>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-sm text-slate-500">
            No sessions yet — visit the <Link to="/showroom" className="text-neon">showroom</Link> to start one.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate text-slate-200">{s.vehicle?.name ?? "Vehicle"}</div>
                  <div className="text-xs text-slate-500">{fmtDate(s.startedAt)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={s.status} />
                  {s.engagementScore != null && (
                    <span className="font-display text-neon">{Math.round(s.engagementScore)}%</span>
                  )}
                  <Link to={`/app/sessions/${s.id}`} className="text-neon">View →</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </AppShell>
  );
}

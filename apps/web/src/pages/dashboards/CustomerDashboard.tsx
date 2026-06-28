import { Link } from "react-router-dom";
import { AppShell } from "../../components/shell/AppShell.js";
import { StatCard, GlassCard, Skeleton, Button } from "../../components/ui/index.js";
import { useAnalyticsPolling } from "../../showroom/data/useAnalyticsPolling.js";
import { api } from "../../lib/apiClient.js";

interface SessionRow {
  id: string;
  vehicle?: { name: string; slug: string } | null;
  startedAt: string;
  durationSec: number | null;
  engagementScore: number | null;
  interestScore: number | null;
  totalGazeMs: number | null;
  status: string;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const fmtDuration = (sec: number | null) => {
  if (!sec) return "—";
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
};

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "COMPLETED" ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
    : status === "ACTIVE" ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
    : "text-slate-400 border-white/10 bg-white/5";
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${tone}`}>
      {status.toLowerCase()}
    </span>
  );
}

function Meter({ label, value, tone }: { label: string; value: number | null; tone: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-300">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SessionCard({ s }: { s: SessionRow }) {
  const vehicleName = s.vehicle?.name ?? "Vehicle";
  const gazeSec = s.totalGazeMs ? Math.round(s.totalGazeMs / 1000) : null;
  return (
    <GlassCard className="flex flex-col gap-4 transition hover:border-neon/40 hover:shadow-glow">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-neon/30 to-violet/30 font-display text-white">
          {vehicleName[0] ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-white">{vehicleName}</div>
          <div className="text-xs text-slate-500">
            {fmtDate(s.startedAt)} · {fmtDuration(s.durationSec)}
          </div>
        </div>
        <StatusPill status={s.status} />
      </div>

      <div className="space-y-2">
        <Meter label="Engagement" value={s.engagementScore} tone="bg-neon" />
        <Meter label="Interest" value={s.interestScore} tone="bg-violet" />
      </div>

      <div className="mt-auto flex items-center justify-between text-xs">
        <span className="text-slate-500">{gazeSec != null ? `${gazeSec}s gaze` : "—"}</span>
        <Link to={`/app/sessions/${s.id}`} className="font-medium text-neon hover:underline">
          View report →
        </Link>
      </div>
    </GlassCard>
  );
}

export default function CustomerDashboard() {
  const { data } = useAnalyticsPolling<{ sessions: SessionRow[] }>(["my-sessions"], () => api.get("/sessions"));
  const loading = !data;
  const sessions = data?.sessions ?? [];
  const completed = sessions.filter((s) => s.status === "COMPLETED");
  const avg = (key: "engagementScore" | "interestScore") =>
    completed.length
      ? Math.round(completed.reduce((sum, s) => sum + (s[key] ?? 0), 0) / completed.length)
      : 0;

  return (
    <AppShell role="CUSTOMER" title="My Sessions">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sessions" value={sessions.length} loading={loading} />
        <StatCard label="Avg. engagement" value={`${avg("engagementScore")}%`} loading={loading} />
        <StatCard label="Avg. interest" value={`${avg("interestScore")}%`} loading={loading} />
        <StatCard label="Explore" value={<Link to="/showroom" className="text-neon">Showroom →</Link>} />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <GlassCard className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-2xl">🚗</div>
          <div className="font-display text-lg text-white">No sessions yet</div>
          <p className="max-w-sm text-sm text-slate-400">
            Take a vehicle for a spin in the 3D showroom — your attention is tracked and turned into
            the engagement insights you'll see here.
          </p>
          <Link to="/showroom">
            <Button>Explore the showroom</Button>
          </Link>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => (
            <SessionCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

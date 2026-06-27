import type { VehiclePopularity } from "@sev/shared";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export function PopularityChart({ vehicles }: { vehicles: VehiclePopularity[] }) {
  const data = vehicles.map((v) => ({ name: v.name, sessions: v.sessionCount, engagement: Math.round(v.avgEngagement) }));
  return (
    <div data-testid="popularity-chart">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={10} />
            <Tooltip contentStyle={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.1)" }} />
            <Bar dataKey="sessions" fill="#a855f7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {data.map((d) => (
          <li key={d.name}>{d.name}: {d.sessions} sessions, {d.engagement}% engagement</li>
        ))}
      </ul>
    </div>
  );
}

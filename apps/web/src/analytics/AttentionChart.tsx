import type { ComponentScore } from "@sev/shared";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export function AttentionChart({ components }: { components: ComponentScore[] }) {
  const data = components.map((c) => ({ name: c.meshName, attention: Math.round(c.attentionPct) }));
  return (
    <div data-testid="attention-chart">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="#64748b" fontSize={10} interval={0} angle={-30} textAnchor="end" height={50} />
            <YAxis stroke="#64748b" fontSize={10} />
            <Tooltip contentStyle={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.1)" }} />
            <Bar dataKey="attention" fill="#00d4ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Accessible + test-friendly summary (always present regardless of chart sizing) */}
      <ul className="sr-only">
        {data.map((d) => (
          <li key={d.name}>{d.name}: {d.attention}%</li>
        ))}
      </ul>
    </div>
  );
}

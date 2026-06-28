interface Item { meshName: string; attentionPct: number; }

/** Horizontal attention bars for a ranked component list (Admin/Analyst overviews). */
export function ComponentBars({ items, tone = "neon" }: { items: Item[]; tone?: "neon" | "muted" }) {
  if (!items.length) return <div className="text-sm text-slate-500">No attention data yet.</div>;
  const max = Math.max(1, ...items.map((i) => i.attentionPct));
  return (
    <ul className="space-y-2.5">
      {items.map((c) => (
        <li key={c.meshName} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="capitalize text-slate-300">{c.meshName.replace(/-/g, " ")}</span>
            <span className={tone === "neon" ? "text-neon" : "text-slate-400"}>{Math.round(c.attentionPct)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(c.attentionPct / max) * 100}%`,
                background: tone === "neon" ? "linear-gradient(90deg,#00d4ff,#a855f7)" : "rgba(148,163,184,.5)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

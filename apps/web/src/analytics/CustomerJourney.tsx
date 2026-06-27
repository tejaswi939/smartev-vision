/** The viewed-component path (reconstructable from recorded events for future Session Replay). */
export function CustomerJourney({ timeline }: { timeline: { tMs: number; meshName: string }[] }) {
  if (!timeline.length) return <div className="text-sm text-slate-500">No journey yet.</div>;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="customer-journey">
      {timeline.map((p, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="rounded-lg bg-white/5 px-2 py-1 text-slate-200">{p.meshName}</span>
          {i < timeline.length - 1 && <span className="text-neon">→</span>}
        </span>
      ))}
    </div>
  );
}

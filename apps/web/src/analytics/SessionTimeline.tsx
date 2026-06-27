import { Badge } from "../components/ui/index.js";

/** Time-ordered first-view of each component during the session (ms precision → replay-ready). */
export function SessionTimeline({ timeline }: { timeline: { tMs: number; meshName: string }[] }) {
  if (!timeline.length) return <div className="text-sm text-slate-500">No gaze recorded yet.</div>;
  return (
    <ol className="space-y-2" data-testid="session-timeline">
      {timeline.map((p, i) => (
        <li key={i} className="flex items-center gap-3 text-sm">
          <span className="w-16 text-right font-mono text-slate-500">{(p.tMs / 1000).toFixed(1)}s</span>
          <Badge>{p.meshName}</Badge>
        </li>
      ))}
    </ol>
  );
}

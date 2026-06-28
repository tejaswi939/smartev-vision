import type { FeedbackSummary, SentimentLabel } from "@sev/shared";

const SENTIMENT_CONFIG: { key: SentimentLabel; label: string; color: string; bg: string }[] = [
  { key: "positive", label: "Positive", color: "text-emerald-400", bg: "bg-emerald-500" },
  { key: "neutral",  label: "Neutral",  color: "text-slate-300",   bg: "bg-slate-400"  },
  { key: "negative", label: "Negative", color: "text-rose-400",    bg: "bg-rose-500"   },
];

export function SentimentPanel({ summary }: { summary: FeedbackSummary }) {
  if (summary.total === 0) {
    return <div className="text-sm text-slate-500">No feedback yet.</div>;
  }

  const max = Math.max(1, ...SENTIMENT_CONFIG.map((c) => summary.sentiment[c.key]));

  return (
    <div className="space-y-3">
      <ul className="space-y-2.5">
        {SENTIMENT_CONFIG.map(({ key, label, color, bg }) => {
          const count = summary.sentiment[key];
          return (
            <li key={key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">{label}</span>
                <span className={color}>{count}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full transition-all ${bg}`}
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between border-t border-white/10 pt-3 text-sm">
        <span className="text-slate-400">
          Avg rating:{" "}
          <span className="text-white">{summary.avgRating != null ? summary.avgRating.toFixed(1) : "—"}</span>
        </span>
        <span className="text-slate-500">
          {summary.total} {summary.total === 1 ? "response" : "responses"}
        </span>
      </div>
    </div>
  );
}

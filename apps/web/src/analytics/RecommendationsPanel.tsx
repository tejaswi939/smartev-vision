import type { RecommendationDTO } from "@sev/shared";

export function RecommendationsPanel({ recommendations }: { recommendations: RecommendationDTO[] }) {
  if (!recommendations.length) {
    return <div className="text-sm text-slate-500">No recommendations yet.</div>;
  }

  const max = Math.max(1, ...recommendations.map((r) => r.count));

  return (
    <ul className="space-y-2.5">
      {recommendations.map((rec) => (
        <li key={rec.vehicleSlug} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300">{rec.vehicleName}</span>
            <span className="text-neon">{rec.count}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(rec.count / max) * 100}%`,
                background: "linear-gradient(90deg,#00d4ff,#a855f7)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

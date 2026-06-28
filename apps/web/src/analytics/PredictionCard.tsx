import type { PredictionDTO } from "@sev/shared";
import { GlassCard, Badge } from "../components/ui/index.js";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function PredictionCard({ prediction }: { prediction: PredictionDTO | null }) {
  if (!prediction) return null;

  const { archetype, archetypeConfidence, interestTier, recommendedVehicle, highlightComponents, rationale } =
    prediction;

  return (
    <GlassCard>
      <div className="mb-3 font-display text-white">Predicted preference</div>
      <div className="space-y-3">
        {/* Archetype + confidence */}
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-white">{capitalize(archetype)}</span>
          <span className="text-sm text-slate-400">{Math.round(archetypeConfidence * 100)}% confidence</span>
        </div>

        {/* Interest tier badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Interest:</span>
          <Badge>{capitalize(interestTier)}</Badge>
        </div>

        {/* Recommended vehicle */}
        {recommendedVehicle && (
          <div className="text-sm text-slate-300">
            <span className="text-slate-500">Recommended: </span>
            <span className="text-white">{recommendedVehicle.name}</span>
          </div>
        )}

        {/* Highlight components */}
        {highlightComponents.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {highlightComponents.map((c) => (
              <span
                key={c}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs capitalize text-slate-300"
              >
                {c.replace(/-/g, " ")}
              </span>
            ))}
          </div>
        )}

        {/* Rationale */}
        {rationale && <p className="text-sm text-slate-400">{rationale}</p>}
      </div>
    </GlassCard>
  );
}

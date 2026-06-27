import type { VehiclePartDTO } from "@sev/shared";
import { GlassCard } from "../../components/ui/index.js";

export function HotspotPanel({ part, onClose }: { part: VehiclePartDTO | null; onClose: () => void }) {
  if (!part) return null;
  return (
    <div className="absolute right-4 top-24 z-10 w-72">
      <GlassCard className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-white">{part.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
            ×
          </button>
        </div>
        {part.specs && (
          <dl className="space-y-1 text-sm">
            {Object.entries(part.specs).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-slate-400">{k}</dt>
                <dd className="text-slate-200">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-slate-500">
          Attention analytics — available after Phase 3
        </div>
      </GlassCard>
    </div>
  );
}

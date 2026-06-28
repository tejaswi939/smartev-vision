import type { VehicleDetail } from "@sev/shared";
import { GlassCard, Badge } from "../../components/ui/index.js";

function formatPrice(usd: number): string {
  if (!usd) return "—";
  return usd >= 1_000_000 ? `$${(usd / 1_000_000).toFixed(2)}M` : `$${usd.toLocaleString("en-US")}`;
}

function Spec({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className="font-display text-lg leading-none text-white">
        {value}
        {unit && <span className="ml-0.5 text-xs text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}

/** Premium spec card for the selected vehicle — make/model, class, and the key EV figures. */
export function VehicleInfoPanel({ vehicle }: { vehicle: VehicleDetail }) {
  const interactiveParts = vehicle.parts.filter((p) => p.interactive).length;
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 w-72">
      <GlassCard className="space-y-4">
        <div>
          {vehicle.make && <div className="text-xs uppercase tracking-[0.2em] text-neon">{vehicle.make}</div>}
          <h2 className="font-display text-2xl leading-tight text-white">{vehicle.modelName}</h2>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
            <Badge>{vehicle.category ?? vehicle.type}</Badge>
            {vehicle.year ? <span>{vehicle.year}</span> : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Spec label="Battery" value={vehicle.batteryKwh ? String(vehicle.batteryKwh) : "—"} unit="kWh" />
          <Spec label="Range" value={vehicle.rangeKm ? String(vehicle.rangeKm) : "—"} unit="km" />
          <Spec label="From" value={formatPrice(vehicle.priceUsd)} />
        </div>

        {vehicle.description && <p className="text-xs leading-relaxed text-slate-400">{vehicle.description}</p>}

        <div className="flex items-center gap-2 border-t border-white/5 pt-3 text-xs text-slate-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          {interactiveParts} interactive parts · gaze tracked live
        </div>
      </GlassCard>
    </div>
  );
}

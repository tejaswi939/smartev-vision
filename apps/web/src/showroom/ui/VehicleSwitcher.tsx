import type { VehicleSummary } from "@sev/shared";

/** Segmented pill selector — compact enough for the real (long) vehicle names. */
export function VehicleSwitcher({ vehicles, activeSlug, onSelect }: {
  vehicles: VehicleSummary[];
  activeSlug: string | null;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-white/10 bg-base/50 p-1 backdrop-blur">
      {vehicles.map((v) => {
        const active = v.slug === activeSlug;
        return (
          <button
            key={v.slug}
            onClick={() => onSelect(v.slug)}
            aria-pressed={active}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              active ? "bg-neon text-base shadow-glow" : "text-slate-300 hover:bg-white/10"
            }`}
          >
            {v.name}
          </button>
        );
      })}
    </div>
  );
}

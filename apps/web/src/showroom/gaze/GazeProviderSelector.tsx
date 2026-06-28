import type { GazeProviderId } from "@sev/shared";
import { PROVIDERS } from "./providerRegistry.js";

/** Dock-styled gaze-source picker — blends into the control dock, with the active source highlighted. */
export function GazeProviderSelector({ value, onChange }: { value: GazeProviderId; onChange: (id: GazeProviderId) => void }) {
  return (
    <label className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm transition hover:bg-white/10">
      <span className="text-slate-400">Gaze</span>
      <select
        aria-label="Gaze provider"
        value={value}
        onChange={(e) => onChange(e.target.value as GazeProviderId)}
        className="cursor-pointer bg-transparent font-medium text-neon outline-none"
      >
        {PROVIDERS.map((p) => (
          <option key={p.id} value={p.id} disabled={!p.available} className="bg-surface text-slate-200">
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}

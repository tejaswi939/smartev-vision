import type { GazeProviderId } from "@sev/shared";
import { PROVIDERS } from "./providerRegistry.js";

export function GazeProviderSelector({ value, onChange }: { value: GazeProviderId; onChange: (id: GazeProviderId) => void }) {
  return (
    <select
      aria-label="Gaze provider"
      value={value}
      onChange={(e) => onChange(e.target.value as GazeProviderId)}
      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
    >
      {PROVIDERS.map((p) => (
        <option key={p.id} value={p.id} disabled={!p.available}>
          {p.label}
        </option>
      ))}
    </select>
  );
}

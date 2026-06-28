import type { CameraMode } from "../scene/cameraModes.js";
import { nextCameraMode } from "../scene/cameraModes.js";

const LABEL: Record<CameraMode, string> = { orbit: "Orbit", walk: "Walk", "first-person": "First-person" };

/** Compact cycle control for the dock — shows the current camera mode (highlighted) and advances on click. */
export function CameraModeToggle({ mode, onChange }: { mode: CameraMode; onChange: (m: CameraMode) => void }) {
  return (
    <button
      onClick={() => onChange(nextCameraMode(mode))}
      title="Switch camera mode"
      className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition hover:bg-white/10"
    >
      <span className="text-slate-400">Camera</span>
      <span className="font-medium text-neon">{LABEL[mode]}</span>
    </button>
  );
}

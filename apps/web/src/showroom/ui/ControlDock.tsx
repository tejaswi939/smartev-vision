import type { ReactNode } from "react";
import type { CameraMode } from "../scene/cameraModes.js";
import type { GazeProviderId } from "@sev/shared";
import { CameraModeToggle } from "./CameraModeToggle.js";
import { GazeProviderSelector } from "../gaze/GazeProviderSelector.js";

function Divider() {
  return <span className="hidden h-6 w-px bg-white/10 sm:block" />;
}

/** Floating glassy dock (bottom-center) that groups the scene controls into one consistent cluster. */
export function ControlDock({
  mode,
  onChangeMode,
  providerId,
  onChangeProvider,
  heatmapOn,
  onToggleHeatmap,
  vrButton,
}: {
  mode: CameraMode;
  onChangeMode: (m: CameraMode) => void;
  providerId: GazeProviderId;
  onChangeProvider: (id: GazeProviderId) => void;
  heatmapOn: boolean;
  onToggleHeatmap: () => void;
  vrButton?: ReactNode;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center px-4">
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-white/10 bg-base/60 p-1.5 shadow-glow backdrop-blur-md">
        <CameraModeToggle mode={mode} onChange={onChangeMode} />
        <Divider />
        <GazeProviderSelector value={providerId} onChange={onChangeProvider} />
        <Divider />
        <button
          onClick={onToggleHeatmap}
          aria-pressed={heatmapOn}
          className={`h-9 rounded-lg px-3 text-sm font-medium transition ${
            heatmapOn ? "bg-neon text-base shadow-glow" : "text-slate-200 hover:bg-white/10"
          }`}
        >
          Heatmap
        </button>
        {vrButton && <Divider />}
        {vrButton}
      </div>
    </div>
  );
}

import type { CameraMode } from "../scene/cameraModes.js";
import { nextCameraMode } from "../scene/cameraModes.js";
import { Button } from "../../components/ui/index.js";

const LABEL: Record<CameraMode, string> = { orbit: "Orbit", walk: "Walk", "first-person": "First-person" };

export function CameraModeToggle({ mode, onChange }: { mode: CameraMode; onChange: (m: CameraMode) => void }) {
  return (
    <Button variant="ghost" onClick={() => onChange(nextCameraMode(mode))}>
      Camera: {LABEL[mode]}
    </Button>
  );
}

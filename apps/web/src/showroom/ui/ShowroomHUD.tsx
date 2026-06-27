import type { ReactNode } from "react";
import type { VehicleSummary } from "@sev/shared";
import type { CameraMode } from "../scene/cameraModes.js";
import { VehicleSwitcher } from "./VehicleSwitcher.js";
import { CameraModeToggle } from "./CameraModeToggle.js";
import { GradientText } from "../../components/ui/index.js";

export function ShowroomHUD({ vehicles, activeSlug, onSelectVehicle, mode, onChangeMode, vrButton }: {
  vehicles: VehicleSummary[];
  activeSlug: string | null;
  onSelectVehicle: (slug: string) => void;
  mode: CameraMode;
  onChangeMode: (m: CameraMode) => void;
  vrButton?: ReactNode;
}) {
  return (
    <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="font-display text-lg">
        <GradientText>SmartEV Showroom</GradientText>
      </div>
      <VehicleSwitcher vehicles={vehicles} activeSlug={activeSlug} onSelect={onSelectVehicle} />
      <div className="flex items-center gap-2">
        <CameraModeToggle mode={mode} onChange={onChangeMode} />
        {vrButton}
      </div>
    </div>
  );
}

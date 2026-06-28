import type { VehicleSummary } from "@sev/shared";
import { VehicleSwitcher } from "./VehicleSwitcher.js";
import { GradientText } from "../../components/ui/index.js";

/** Slim top bar — just the brand and the vehicle switcher. Scene controls live in the ControlDock. */
export function ShowroomHUD({ vehicles, activeSlug, onSelectVehicle }: {
  vehicles: VehicleSummary[];
  activeSlug: string | null;
  onSelectVehicle: (slug: string) => void;
}) {
  return (
    <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="font-display text-lg">
        <GradientText>SmartEV Showroom</GradientText>
      </div>
      <VehicleSwitcher vehicles={vehicles} activeSlug={activeSlug} onSelect={onSelectVehicle} />
    </div>
  );
}

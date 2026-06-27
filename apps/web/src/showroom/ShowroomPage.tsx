import { useMemo, useState } from "react";
import type { CameraMode } from "./scene/cameraModes.js";
import { useVehicleCatalog } from "./data/useVehicleCatalog.js";
import { useVehicle } from "./data/useVehicle.js";
import { ShowroomCanvas } from "./ShowroomCanvas.js";
import { StudioEnvironment } from "./scene/StudioEnvironment.js";
import { Lighting } from "./scene/Lighting.js";
import { ReflectiveFloor } from "./scene/ReflectiveFloor.js";
import { PostFX } from "./scene/PostFX.js";
import { CameraRig } from "./scene/CameraRig.js";
import { VehicleModel } from "./vehicle/VehicleModel.js";
import { InteractionProvider } from "./interaction/InteractionProvider.js";
import { ShowroomHUD } from "./ui/ShowroomHUD.js";
import { HotspotPanel } from "./ui/HotspotPanel.js";
import { ShowroomVRButton } from "./scene/XRLayer.js";

export default function ShowroomPage() {
  const catalog = useVehicleCatalog();
  const vehicles = catalog.data ?? [];
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [mode, setMode] = useState<CameraMode>("orbit");
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  const slug = activeSlug ?? vehicles[0]?.slug;
  const vehicleQ = useVehicle(slug);
  const vehicle = vehicleQ.data;

  const selectedPart = useMemo(
    () => vehicle?.parts.find((p) => p.id === selectedPartId) ?? null,
    [vehicle, selectedPartId],
  );

  return (
    <div className="relative h-screen w-full bg-base">
      <ShowroomHUD
        vehicles={vehicles}
        activeSlug={slug ?? null}
        onSelectVehicle={(s) => { setActiveSlug(s); setSelectedPartId(null); }}
        mode={mode}
        onChangeMode={setMode}
        vrButton={<ShowroomVRButton />}
      />
      <ShowroomCanvas>
        {/* InteractionProvider lives INSIDE the Canvas: React context does not cross the R3F root boundary. */}
        <InteractionProvider>
          <StudioEnvironment />
          <Lighting />
          <ReflectiveFloor />
          {vehicle && <VehicleModel vehicle={vehicle} onSelect={setSelectedPartId} />}
          <CameraRig mode={mode} />
          <PostFX />
        </InteractionProvider>
      </ShowroomCanvas>
      <HotspotPanel part={selectedPart} onClose={() => setSelectedPartId(null)} />
    </div>
  );
}

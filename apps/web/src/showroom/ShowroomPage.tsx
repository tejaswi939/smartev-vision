import { useEffect, useMemo, useState } from "react";
import type { CameraMode } from "./scene/cameraModes.js";
import type { GazeProviderId } from "@sev/shared";
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
import { createProvider } from "./gaze/providerRegistry.js";
import { GazeRecorder } from "./gaze/useGazeRecorder.js";
import { useSession } from "./gaze/useSession.js";
import { HeatmapOverlay } from "./gaze/HeatmapOverlay.js";
import { Crosshair } from "./gaze/Crosshair.js";
import { ControlDock } from "./ui/ControlDock.js";
import { VehicleInfoPanel } from "./ui/VehicleInfoPanel.js";

const STORAGE_KEY = "sev_gaze_provider";

export default function ShowroomPage() {
  const catalog = useVehicleCatalog();
  const vehicles = catalog.data ?? [];
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [mode, setMode] = useState<CameraMode>("orbit");
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<GazeProviderId>(
    () => ((typeof localStorage !== "undefined" && (localStorage.getItem(STORAGE_KEY) as GazeProviderId)) || "mouse"),
  );
  const [heatmapOn, setHeatmapOn] = useState(false);

  useEffect(() => {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, providerId);
  }, [providerId]);

  const slug = activeSlug ?? vehicles[0]?.slug;
  const vehicle = useVehicle(slug).data;
  const provider = useMemo(() => createProvider(providerId), [providerId]);
  const sessionId = useSession(vehicle?.id, providerId);

  const selectedPart = useMemo(
    () => vehicle?.parts.find((p) => p.id === selectedPartId) ?? null,
    [vehicle, selectedPartId],
  );

  const showCrosshair = providerId === "crosshair" || providerId === "camera-center";

  return (
    <div className="relative h-screen w-full overflow-hidden bg-base">
      {/* Legibility scrims — gently darken the top/bottom of the bright 3D scene behind the overlays. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-28 bg-gradient-to-b from-base/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-44 bg-gradient-to-t from-base/70 to-transparent" />

      <ShowroomHUD
        vehicles={vehicles}
        activeSlug={slug ?? null}
        onSelectVehicle={(s) => { setActiveSlug(s); setSelectedPartId(null); }}
      />
      {showCrosshair && <Crosshair />}
      {mode === "first-person" && (
        <div className="pointer-events-none absolute left-1/2 top-20 z-10 -translate-x-1/2 rounded-full border border-neon/40 bg-base/70 px-4 py-2 text-xs text-slate-200">
          Click to look around · <span className="text-neon">W A S D</span> to move · <span className="text-neon">Esc</span> to exit
        </div>
      )}
      <ShowroomCanvas>
        {/* InteractionProvider lives INSIDE the Canvas: React context does not cross the R3F root boundary. */}
        <InteractionProvider>
          <StudioEnvironment />
          <Lighting />
          <ReflectiveFloor />
          {vehicle && <VehicleModel vehicle={vehicle} onSelect={setSelectedPartId} />}
          {vehicle && <GazeRecorder provider={provider} sessionId={sessionId} vehicleId={vehicle.id} />}
          <HeatmapOverlay enabled={heatmapOn} />
          <CameraRig mode={mode} />
          <PostFX />
        </InteractionProvider>
      </ShowroomCanvas>
      {vehicle && <VehicleInfoPanel vehicle={vehicle} />}
      <HotspotPanel part={selectedPart} onClose={() => setSelectedPartId(null)} />
      <ControlDock
        mode={mode}
        onChangeMode={setMode}
        providerId={providerId}
        onChangeProvider={setProviderId}
        heatmapOn={heatmapOn}
        onToggleHeatmap={() => setHeatmapOn((v) => !v)}
        vrButton={<ShowroomVRButton />}
      />
    </div>
  );
}

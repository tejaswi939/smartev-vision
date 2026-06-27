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
import { GazeProviderSelector } from "./gaze/GazeProviderSelector.js";

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
    <div className="relative h-screen w-full bg-base">
      <ShowroomHUD
        vehicles={vehicles}
        activeSlug={slug ?? null}
        onSelectVehicle={(s) => { setActiveSlug(s); setSelectedPartId(null); }}
        mode={mode}
        onChangeMode={setMode}
        vrButton={
          <div className="flex items-center gap-2">
            <GazeProviderSelector value={providerId} onChange={setProviderId} />
            <button
              onClick={() => setHeatmapOn((v) => !v)}
              className={`rounded-xl border px-3 py-2 text-sm ${heatmapOn ? "border-neon bg-neon text-base" : "border-white/10 bg-white/5 text-slate-200"}`}
            >
              Heatmap
            </button>
            <ShowroomVRButton />
          </div>
        }
      />
      {showCrosshair && <Crosshair />}
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
      <HotspotPanel part={selectedPart} onClose={() => setSelectedPartId(null)} />
    </div>
  );
}

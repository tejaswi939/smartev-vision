import type { GazeProvider, GazeProviderId } from "@sev/shared";
import { SimulatedMouseGazeProvider } from "./providers/SimulatedMouseGazeProvider.js";
import { CameraCenterGazeProvider } from "./providers/CameraCenterGazeProvider.js";
import { CrosshairGazeProvider } from "./providers/CrosshairGazeProvider.js";
import { WebGazerProvider } from "./providers/WebGazerProvider.js";

export interface ProviderMeta {
  id: GazeProviderId;
  label: string;
  available: boolean;
}

export const PROVIDERS: ProviderMeta[] = [
  { id: "mouse", label: "Mouse Pointer", available: true },
  { id: "camera-center", label: "Camera Center", available: true },
  { id: "crosshair", label: "Crosshair", available: true },
  { id: "webgazer", label: "WebGazer (Coming Soon)", available: false },
];

export function createProvider(id: GazeProviderId): GazeProvider {
  switch (id) {
    case "camera-center":
      return new CameraCenterGazeProvider();
    case "crosshair":
      return new CrosshairGazeProvider();
    case "webgazer":
      return new WebGazerProvider();
    case "mouse":
    default:
      return new SimulatedMouseGazeProvider();
  }
}

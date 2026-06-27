import { BaseProvider } from "./BaseProvider.js";

/**
 * Phase-2 stub. Conforms to the GazeProvider interface so real webcam gaze (and Tobii, etc.)
 * can be enabled later with no consumer changes. It never emits; the registry marks it
 * unavailable ("Coming Soon"). A later phase lazy-loads `webgazer` here.
 */
export class WebGazerProvider extends BaseProvider {
  readonly id = "webgazer";

  async start(): Promise<void> {
    await super.start();
    console.warn("[gaze] WebGazer provider is a Phase-2 stub (Coming Soon). No webcam gaze yet.");
  }
}

import { BaseProvider } from "./BaseProvider.js";

/** Gaze = a fixed center crosshair the user aims by moving the camera (a reticle is shown in the UI). */
export class CrosshairGazeProvider extends BaseProvider {
  readonly id = "crosshair";
  private timer: ReturnType<typeof setInterval> | null = null;

  async start(): Promise<void> {
    await super.start();
    this.timer = setInterval(() => this.emit(0.5, 0.5), 50);
  }
  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await super.stop();
  }
}

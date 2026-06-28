import { BaseProvider } from "./BaseProvider.js";

/** Gaze = viewport center; the recorder raycasts through the moving camera, so the hit changes as the user looks around. */
export class CameraCenterGazeProvider extends BaseProvider {
  readonly id = "camera-center";
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

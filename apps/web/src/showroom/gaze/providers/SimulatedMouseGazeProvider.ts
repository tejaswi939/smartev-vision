import { BaseProvider } from "./BaseProvider.js";

/** Gaze follows the mouse pointer (normalized to the viewport). */
export class SimulatedMouseGazeProvider extends BaseProvider {
  readonly id = "mouse";
  private handler = (e: PointerEvent) => this.emit(e.clientX / window.innerWidth, e.clientY / window.innerHeight);

  async start(): Promise<void> {
    await super.start();
    window.addEventListener("pointermove", this.handler);
  }
  async stop(): Promise<void> {
    window.removeEventListener("pointermove", this.handler);
    await super.stop();
  }
}

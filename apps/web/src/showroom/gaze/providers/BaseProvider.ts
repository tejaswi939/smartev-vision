import type { GazeProvider, GazeSample } from "@sev/shared";

type Cb = (s: GazeSample) => void;
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Shared subscription + tMs bookkeeping for every gaze provider (provider-agnostic events). */
export abstract class BaseProvider implements GazeProvider {
  abstract readonly id: string;
  protected subs = new Set<Cb>();
  protected startedAt = 0;

  onSample(cb: Cb): () => void {
    this.subs.add(cb);
    return () => {
      this.subs.delete(cb);
    };
  }

  protected emit(x: number, y: number): void {
    const tMs = now() - this.startedAt;
    for (const cb of this.subs) cb({ tMs, x, y });
  }

  async start(): Promise<void> {
    this.startedAt = now();
  }

  async stop(): Promise<void> {
    this.subs.clear();
  }
}

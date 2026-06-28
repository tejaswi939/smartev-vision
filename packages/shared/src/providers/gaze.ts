/**
 * Inert seam for eye tracking.
 * Phase 2 implements `SimulatedMouseGazeProvider`; real hardware
 * (Tobii / WebGazer) drops in later with no changes to consumers.
 */
export interface GazeSample {
  tMs: number;
  x: number;
  y: number;
  depth?: number;
  partMeshName?: string;
}

export interface GazeProvider {
  readonly id: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  onSample(cb: (s: GazeSample) => void): () => void;
}

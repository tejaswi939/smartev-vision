/**
 * Inert seam for emotion detection.
 * A later phase implements a webcam provider (OpenCV / DeepFace / MediaPipe)
 * with no changes to consumers.
 */
export interface EmotionSample {
  tMs: number;
  emotion: string;
  confidence: number;
}

export interface EmotionProvider {
  readonly id: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  onSample(cb: (s: EmotionSample) => void): () => void;
}

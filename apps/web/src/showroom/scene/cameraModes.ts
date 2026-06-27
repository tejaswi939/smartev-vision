export const CAMERA_MODES = ["orbit", "walk", "first-person"] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];

export function nextCameraMode(m: CameraMode): CameraMode {
  const i = CAMERA_MODES.indexOf(m);
  return CAMERA_MODES[(i + 1) % CAMERA_MODES.length]!;
}

import { OrbitControls, PointerLockControls } from "@react-three/drei";
import type { CameraMode } from "./cameraModes.js";

export function CameraRig({ mode }: { mode: CameraMode }) {
  if (mode === "first-person") return <PointerLockControls />;
  // "walk" = orbit with panning enabled at human eye height; "orbit" = framed orbit.
  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={mode === "walk"}
      minDistance={2.5}
      maxDistance={14}
      target={[0, mode === "walk" ? 1.4 : 0.8, 0]}
      maxPolarAngle={Math.PI / 2}
    />
  );
}

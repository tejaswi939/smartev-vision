import { useEffect, useRef } from "react";
import { OrbitControls, PointerLockControls } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import { Box3, Vector3, type Mesh, type Object3D } from "three";
import type { CameraMode } from "./cameraModes.js";

/** World-space bounds of the actual vehicle (gaze-tagged meshes), excluding floor/environment. */
function vehicleBounds(scene: Object3D): Box3 | null {
  const box = new Box3();
  let found = false;
  scene.traverse((o) => {
    if ((o as Mesh).isMesh && typeof o.userData?.objectId === "string") {
      box.expandByObject(o);
      found = true;
    }
  });
  return found ? box : null;
}

/**
 * "Sit inside" view: drops the camera into the driver's seat at eye height looking down the car's
 * long axis, with click-to-look (pointer lock) + WASD to move. Falls back gracefully if the model
 * hasn't loaded yet.
 */
function FirstPersonRig() {
  const { camera, scene } = useThree();
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const box = vehicleBounds(scene);
    if (box) {
      const c = box.getCenter(new Vector3());
      const s = box.getSize(new Vector3());
      const eye = box.min.y + s.y * 0.55; // ~seated eye height
      const lengthIsX = s.x >= s.z;
      // sit just behind the cabin centre, face the front (the +ve long axis)
      camera.position.set(
        lengthIsX ? c.x - s.x * 0.12 : c.x,
        eye,
        lengthIsX ? c.z : c.z - s.z * 0.12,
      );
      camera.lookAt(lengthIsX ? c.x + s.x : c.x, eye, lengthIsX ? c.z : c.z + s.z);
    }
    camera.near = 0.03; // don't clip the dashboard/windshield up close
    camera.updateProjectionMatrix();

    const down = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      camera.near = 0.1;
      camera.updateProjectionMatrix();
    };
  }, [scene, camera]);

  useFrame((_, dt) => {
    const k = keys.current;
    if (!(k.KeyW || k.KeyS || k.KeyA || k.KeyD)) return;
    const step = 2.5 * dt;
    const fwd = camera.getWorldDirection(new Vector3());
    fwd.y = 0;
    fwd.normalize();
    const rightAxis = new Vector3().crossVectors(fwd, new Vector3(0, 1, 0)).normalize();
    if (k.KeyW) camera.position.addScaledVector(fwd, step);
    if (k.KeyS) camera.position.addScaledVector(fwd, -step);
    if (k.KeyD) camera.position.addScaledVector(rightAxis, step);
    if (k.KeyA) camera.position.addScaledVector(rightAxis, -step);
  });

  return <PointerLockControls />;
}

export function CameraRig({ mode }: { mode: CameraMode }) {
  if (mode === "first-person") return <FirstPersonRig />;
  // "walk" = orbit with panning enabled at human eye height; "orbit" = framed orbit.
  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={mode === "walk"}
      minDistance={1.2}
      maxDistance={14}
      target={[0, mode === "walk" ? 1.4 : 0.8, 0]}
      maxPolarAngle={Math.PI / 2}
    />
  );
}

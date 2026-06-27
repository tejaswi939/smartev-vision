import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";

// A real GLB for the landing hero (Stage auto-frames + lights it). Lightest of the shipped models.
const HERO_MODEL = "/models/lamborghini-countach.glb";

export function HeroCar() {
  const { scene } = useGLTF(HERO_MODEL);
  const model = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={model} />;
}

useGLTF.preload(HERO_MODEL);

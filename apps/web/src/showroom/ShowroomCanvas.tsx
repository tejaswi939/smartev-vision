import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping } from "three";
import type { ReactNode } from "react";

export function ShowroomCanvas({ children }: { children: ReactNode }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [5, 2.5, 6], fov: 45 }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
      className="h-full w-full"
    >
      {children}
    </Canvas>
  );
}

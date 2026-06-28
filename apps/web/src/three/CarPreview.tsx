import { Component, Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Environment, Lightformer } from "@react-three/drei";
import { LowPolyCar } from "./LowPolyCar.js";
import { HeroCar } from "./HeroCar.js";

/** Falls back to the procedural low-poly car if the GLB fails to load. */
class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function CarPreview() {
  const placeholder = (
    <Stage environment={null} intensity={0.3} adjustCamera={1.1}>
      <LowPolyCar />
    </Stage>
  );
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [4, 2, 6], fov: 45 }} className="h-full w-full">
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
      {/* Procedural reflections so the real car paint reads well — no remote HDR fetch. */}
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2} position={[0, 4, -4]} scale={[10, 5, 1]} />
        <Lightformer form="rect" intensity={1} position={[4, 2, 3]} scale={[5, 5, 1]} color="#00d4ff" />
        <Lightformer form="rect" intensity={1} position={[-4, 2, 3]} scale={[5, 5, 1]} color="#a855f7" />
      </Environment>
      <ModelBoundary fallback={placeholder}>
        <Suspense fallback={placeholder}>
          <Stage environment={null} intensity={0.4} adjustCamera={1.1}>
            <HeroCar />
          </Stage>
        </Suspense>
      </ModelBoundary>
      <OrbitControls autoRotate autoRotateSpeed={0.8} enablePan={false} enableZoom={false} />
    </Canvas>
  );
}

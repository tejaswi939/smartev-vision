import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage } from "@react-three/drei";
import { LowPolyCar } from "./LowPolyCar.js";

export default function CarPreview() {
  return (
    <Canvas camera={{ position: [4, 2, 6], fov: 45 }} className="h-full w-full">
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <Stage environment={null} intensity={0.3}>
        <LowPolyCar />
      </Stage>
      <OrbitControls autoRotate enablePan={false} />
    </Canvas>
  );
}

import { MeshReflectorMaterial, ContactShadows } from "@react-three/drei";

export function ReflectiveFloor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <MeshReflectorMaterial
          mirror={0.4}
          resolution={1024}
          mixBlur={1}
          mixStrength={3}
          roughness={0.85}
          depthScale={1}
          color="#0a0a0f"
          metalness={0.6}
        />
      </mesh>
      <ContactShadows position={[0, 0, 0]} opacity={0.55} scale={20} blur={2.4} far={6} />
    </>
  );
}

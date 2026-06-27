import type { PartDescriptor } from "./proceduralData.js";

export function PartMesh({ descriptor }: { descriptor: PartDescriptor }) {
  const { kind, args, rotation, color, metalness, roughness, emissive } = descriptor;
  return (
    <mesh rotation={rotation} castShadow receiveShadow>
      {kind === "box" && <boxGeometry args={args as [number, number, number]} />}
      {kind === "cylinder" && <cylinderGeometry args={args as [number, number, number, number]} />}
      {kind === "sphere" && <sphereGeometry args={args as [number, number, number]} />}
      <meshStandardMaterial
        color={color}
        metalness={metalness}
        roughness={roughness}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissive ? 0.6 : 0}
      />
    </mesh>
  );
}

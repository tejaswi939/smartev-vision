export function LowPolyCar() {
  const wheels: [number, number][] = [
    [-1.3, -1.0], [1.3, -1.0], [-1.3, 1.0], [1.3, 1.0],
  ];
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[4, 0.8, 1.8]} />
        <meshStandardMaterial color="#00d4ff" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[2.2, 0.7, 1.6]} />
        <meshStandardMaterial color="#0a0a0f" metalness={0.4} roughness={0.4} />
      </mesh>
      {wheels.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.1, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.3, 24]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
      ))}
    </group>
  );
}

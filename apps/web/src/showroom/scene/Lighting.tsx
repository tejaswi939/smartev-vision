export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[6, 9, 5]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />
      <directionalLight position={[-6, 4, -4]} intensity={0.6} />
    </>
  );
}

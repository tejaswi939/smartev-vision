import { Environment, Lightformer } from "@react-three/drei";

/** Procedural studio lighting environment — gives reflections without an external HDR file. */
export function StudioEnvironment() {
  return (
    <Environment resolution={256}>
      <Lightformer form="rect" intensity={2} position={[0, 5, -5]} scale={[10, 5, 1]} />
      <Lightformer form="rect" intensity={1} position={[5, 3, 2]} scale={[5, 5, 1]} color="#00d4ff" />
      <Lightformer form="rect" intensity={1} position={[-5, 3, 2]} scale={[5, 5, 1]} color="#a855f7" />
    </Environment>
  );
}

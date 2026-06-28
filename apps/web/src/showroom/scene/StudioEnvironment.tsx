import { Environment, Lightformer } from "@react-three/drei";

/** Neutral white studio environment — shows the cars in their true colours (no tint) while still
 *  giving PBR reflections, without an external HDR file. */
export function StudioEnvironment() {
  return (
    <Environment resolution={256}>
      <Lightformer form="rect" intensity={2} position={[0, 5, -5]} scale={[10, 5, 1]} />
      <Lightformer form="rect" intensity={1} position={[5, 3, 2]} scale={[5, 5, 1]} />
      <Lightformer form="rect" intensity={1} position={[-5, 3, 2]} scale={[5, 5, 1]} />
    </Environment>
  );
}

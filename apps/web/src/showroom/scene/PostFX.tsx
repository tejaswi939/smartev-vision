import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

export function PostFX() {
  return (
    <EffectComposer>
      <Bloom intensity={0.6} luminanceThreshold={0.7} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette eskil={false} offset={0.2} darkness={0.7} />
    </EffectComposer>
  );
}

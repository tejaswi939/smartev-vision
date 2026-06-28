import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { MeshStandardMaterial } from "three";
import { useInteractionBus } from "../interaction/InteractionProvider.js";

/** Live 3D heatmap: tints components by accumulated gaze, non-destructively (restores on disable). */
export function HeatmapOverlay({ enabled }: { enabled: boolean }) {
  const { scene } = useThree();
  const bus = useInteractionBus();
  const heat = useRef(new Map<string, number>());
  const origIntensity = useRef(new Map<MeshStandardMaterial, number>());
  const origColor = useRef(new Map<MeshStandardMaterial, number>());

  useEffect(
    () =>
      bus.subscribe((e) => {
        if (e.type === "gaze" || e.type === "hover" || e.type === "focus") {
          heat.current.set(e.objectId, (heat.current.get(e.objectId) ?? 0) + (e.type === "focus" ? 3 : 1));
        }
      }),
    [bus],
  );

  // Restore materials when the overlay is turned off (or unmounts).
  useEffect(() => {
    if (enabled) return;
    for (const [mat, v] of origIntensity.current) mat.emissiveIntensity = v;
    for (const [mat, hex] of origColor.current) mat.emissive.setHex(hex);
  }, [enabled]);

  useFrame(() => {
    if (!enabled) return;
    let max = 1;
    for (const v of heat.current.values()) max = Math.max(max, v);
    scene.traverse((o) => {
      const id = o.userData?.objectId as string | undefined;
      const mat = (o as { material?: unknown }).material;
      if (!id || !(mat instanceof MeshStandardMaterial)) return;
      if (!origIntensity.current.has(mat)) origIntensity.current.set(mat, mat.emissiveIntensity);
      if (!origColor.current.has(mat)) origColor.current.set(mat, mat.emissive.getHex());
      const h = Math.min(1, (heat.current.get(id) ?? 0) / max);
      mat.emissiveIntensity = 0.25 + h * 2;
      mat.emissive.setRGB(h, 0.08, 1 - h); // cold blue -> hot red
    });
  });

  return null;
}

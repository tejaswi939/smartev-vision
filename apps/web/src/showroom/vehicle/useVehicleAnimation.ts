import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { approach } from "./animationMath.js";

const OPEN_ANIMATIONS = new Set(["door-open", "hood-open", "trunk-open", "port-open"]);

export function useVehicleAnimation(
  ref: RefObject<Group>,
  opts: { animation: string | null; active: boolean; hovered: boolean },
) {
  useFrame((_state, dt) => {
    const g = ref.current;
    if (!g) return;
    const targetScale = opts.hovered ? 1.04 : 1;
    const s = approach(g.scale.x, targetScale, dt, 8);
    g.scale.setScalar(s);
    if (opts.animation && OPEN_ANIMATIONS.has(opts.animation)) {
      const targetRot = opts.active ? Math.PI / 4 : 0;
      g.rotation.y = approach(g.rotation.y, targetRot, dt, 6);
    }
    if (opts.animation === "wheel-spin" && opts.active) {
      g.rotation.x += dt * 4;
    }
  });
}

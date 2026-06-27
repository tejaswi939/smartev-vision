import { Html } from "@react-three/drei";
import type { Vec3 } from "@sev/shared";

export function Hotspot({ position, label, hovered }: { position: Vec3; label: string; hovered: boolean }) {
  return (
    <Html position={[position.x, position.y, position.z]} center distanceFactor={8} occlude>
      <div
        className={`px-2 py-1 rounded-full text-xs whitespace-nowrap border pointer-events-none ${
          hovered ? "bg-neon text-base border-neon" : "bg-base/70 text-neon border-neon/40"
        }`}
      >
        {label}
      </div>
    </Html>
  );
}

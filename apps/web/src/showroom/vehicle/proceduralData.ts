export interface PartDescriptor {
  meshName: string;
  kind: "box" | "cylinder" | "sphere";
  args: number[];
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  metalness: number;
  roughness: number;
  emissive?: string;
  interactive: boolean;
}

const BASE_PARTS: PartDescriptor[] = [
  { meshName: "body", kind: "box", args: [4, 0.7, 1.8], position: [0, 0.6, 0], color: "#00d4ff", metalness: 0.7, roughness: 0.3, interactive: true },
  { meshName: "windows", kind: "box", args: [2.2, 0.6, 1.6], position: [-0.1, 1.15, 0], color: "#0a0a0f", metalness: 0.4, roughness: 0.05, interactive: true },
  { meshName: "doors", kind: "box", args: [1.6, 0.55, 0.05], position: [0, 0.6, 0.9], color: "#00d4ff", metalness: 0.7, roughness: 0.3, interactive: true },
  { meshName: "hood", kind: "box", args: [1.0, 0.1, 1.7], position: [1.4, 0.95, 0], color: "#00d4ff", metalness: 0.7, roughness: 0.3, interactive: true },
  { meshName: "trunk", kind: "box", args: [0.8, 0.1, 1.7], position: [-1.6, 0.95, 0], color: "#00d4ff", metalness: 0.7, roughness: 0.3, interactive: true },
  { meshName: "wheels", kind: "cylinder", args: [0.45, 0.45, 0.3, 24], position: [1.3, 0.3, 0.95], rotation: [Math.PI / 2, 0, 0], color: "#111111", metalness: 0.5, roughness: 0.6, interactive: true },
  { meshName: "steering-wheel", kind: "cylinder", args: [0.22, 0.22, 0.05, 24], position: [0.5, 0.95, 0.35], rotation: [Math.PI / 2.2, 0, 0], color: "#1a1a1a", metalness: 0.3, roughness: 0.6, interactive: true },
  { meshName: "dashboard", kind: "box", args: [1.8, 0.15, 0.4], position: [0.5, 0.9, 0], color: "#15151c", metalness: 0.3, roughness: 0.7, interactive: true },
  { meshName: "infotainment", kind: "box", args: [0.5, 0.32, 0.03], position: [0.5, 1.0, 0], color: "#0a0a0f", metalness: 0.2, roughness: 0.2, emissive: "#00d4ff", interactive: true },
  { meshName: "battery", kind: "box", args: [3.2, 0.16, 1.4], position: [0, 0.22, 0], color: "#06d6a0", metalness: 0.4, roughness: 0.5, emissive: "#06d6a0", interactive: true },
  { meshName: "charging-port", kind: "box", args: [0.2, 0.2, 0.06], position: [-1.7, 0.7, 0.85], color: "#222222", metalness: 0.5, roughness: 0.5, emissive: "#00d4ff", interactive: true },
  { meshName: "mirrors", kind: "box", args: [0.1, 0.12, 0.26], position: [1.0, 1.0, 1.0], color: "#00d4ff", metalness: 0.7, roughness: 0.3, interactive: true },
  { meshName: "seats", kind: "box", args: [1.4, 0.5, 1.2], position: [0, 0.85, 0], color: "#26262e", metalness: 0.1, roughness: 0.9, interactive: true },
  { meshName: "headlights", kind: "box", args: [0.12, 0.2, 1.4], position: [1.98, 0.6, 0], color: "#ffffff", metalness: 0.1, roughness: 0.1, emissive: "#ffffff", interactive: true },
  { meshName: "taillights", kind: "box", args: [0.1, 0.2, 1.5], position: [-1.98, 0.6, 0], color: "#330008", metalness: 0.1, roughness: 0.1, emissive: "#ff0033", interactive: true },
];

interface Variant {
  bodyScale: [number, number, number];
  bodyColor: string;
  accent: string;
}

const VARIANTS: Record<string, Variant> = {
  HATCHBACK: { bodyScale: [0.85, 1.0, 0.95], bodyColor: "#00d4ff", accent: "#00d4ff" },
  SUV: { bodyScale: [1.05, 1.3, 1.05], bodyColor: "#a855f7", accent: "#a855f7" },
  SPORTS: { bodyScale: [1.1, 0.8, 1.0], bodyColor: "#ff006e", accent: "#ff006e" },
};

const BODY_PARTS = new Set(["body", "doors", "hood", "trunk", "mirrors"]);
const ACCENT_PARTS = new Set(["taillights", "charging-port", "infotainment"]);

export function getProceduralParts(type: string): PartDescriptor[] {
  const variant = VARIANTS[type] ?? VARIANTS.HATCHBACK!;
  return BASE_PARTS.map((p) => {
    const d: PartDescriptor = { ...p, args: [...p.args], position: [...p.position] };
    if (BODY_PARTS.has(p.meshName)) d.color = variant.bodyColor;
    if (ACCENT_PARTS.has(p.meshName) && p.emissive) d.emissive = variant.accent;
    if (p.meshName === "body") {
      d.args = [p.args[0]! * variant.bodyScale[0], p.args[1]! * variant.bodyScale[1], p.args[2]! * variant.bodyScale[2]];
    }
    return d;
  });
}

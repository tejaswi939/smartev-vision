export function makeObjectId(vehicleId: string, componentId: string): string {
  return `${vehicleId}:${componentId}`;
}

export interface InteractionEvent {
  type: "hover" | "click" | "gaze" | "focus";
  objectId: string;
  vehicleId: string;
  componentId: string;
  meshName: string;
  tMs: number;
}

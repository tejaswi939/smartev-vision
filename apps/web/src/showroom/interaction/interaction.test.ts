import { describe, it, expect, vi } from "vitest";
import { makeObjectId } from "./objectId.js";
import { createInteractionBus } from "./interactionBus.js";

describe("interaction", () => {
  it("builds a stable object id", () => {
    expect(makeObjectId("veh1", "part1")).toBe("veh1:part1");
  });
  it("delivers events to subscribers and unsubscribes", () => {
    const bus = createInteractionBus();
    const seen = vi.fn();
    const off = bus.subscribe(seen);
    bus.emit({ type: "click", objectId: "v:p", vehicleId: "v", componentId: "p", meshName: "doors", tMs: 0 });
    off();
    bus.emit({ type: "hover", objectId: "v:p", vehicleId: "v", componentId: "p", meshName: "doors", tMs: 1 });
    expect(seen).toHaveBeenCalledOnce();
    expect(seen.mock.calls[0]![0]).toMatchObject({ type: "click", meshName: "doors" });
  });
});

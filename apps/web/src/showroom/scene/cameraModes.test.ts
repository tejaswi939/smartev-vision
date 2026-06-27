import { describe, it, expect } from "vitest";
import { nextCameraMode, CAMERA_MODES } from "./cameraModes.js";

describe("cameraModes", () => {
  it("cycles modes", () => {
    expect(CAMERA_MODES).toContain("orbit");
    expect(nextCameraMode("orbit")).toBe("walk");
    expect(nextCameraMode(CAMERA_MODES[CAMERA_MODES.length - 1]!)).toBe("orbit");
  });
});

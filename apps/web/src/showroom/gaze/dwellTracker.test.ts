import { describe, it, expect } from "vitest";
import { DwellTracker } from "./dwellTracker.js";

describe("DwellTracker", () => {
  it("emits enter/exit on object change and focus after the dwell threshold", () => {
    const t = new DwellTracker();
    expect(t.update("o:doors", 0).map((e) => e.type)).toEqual(["enter"]);
    const changed = t.update("o:wheels", 100);
    expect(changed.map((e) => e.type)).toEqual(["exit", "enter"]);
    expect(changed[0]!.objectId).toBe("o:doors");
    expect(t.update("o:wheels", 300).map((e) => e.type)).toEqual([]); // 200ms < 400
    expect(t.update("o:wheels", 600).map((e) => e.type)).toEqual(["focus"]); // 500ms >= 400
  });
  it("treats background (null) as no event", () => {
    const t = new DwellTracker();
    expect(t.update(null, 0)).toEqual([]);
  });
});

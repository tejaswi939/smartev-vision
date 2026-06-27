import { describe, it, expect } from "vitest";
import { pausedWhenHidden } from "./useAnalyticsPolling.js";

describe("pausedWhenHidden", () => {
  it("returns the interval when the tab is visible", () => {
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    expect(pausedWhenHidden(4000)).toBe(4000);
  });
  it("returns false (pauses) when the tab is hidden", () => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    expect(pausedWhenHidden(4000)).toBe(false);
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });
});

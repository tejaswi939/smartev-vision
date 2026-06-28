import { describe, it, expect, vi } from "vitest";
import { GazeBatcher } from "./gazeBatcher.js";

describe("GazeBatcher", () => {
  it("flushes when maxSize is reached", () => {
    const flush = vi.fn();
    const b = new GazeBatcher<number>(flush, 60);
    for (let i = 0; i < 59; i++) b.push(i);
    expect(flush).not.toHaveBeenCalled();
    b.push(59);
    expect(flush).toHaveBeenCalledOnce();
    expect(flush.mock.calls[0]![0]).toHaveLength(60);
    expect(b.size).toBe(0);
  });
  it("flush() drains a partial buffer and no-ops when empty", () => {
    const flush = vi.fn();
    const b = new GazeBatcher<number>(flush, 60);
    b.push(1);
    b.push(2);
    b.flush();
    expect(flush).toHaveBeenCalledWith([1, 2]);
    b.flush();
    expect(flush).toHaveBeenCalledOnce();
  });
});

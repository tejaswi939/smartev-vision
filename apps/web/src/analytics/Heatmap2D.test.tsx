import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { Heatmap2D } from "./Heatmap2D.js";

const realGetContext = HTMLCanvasElement.prototype.getContext;
afterEach(() => {
  HTMLCanvasElement.prototype.getContext = realGetContext;
});

describe("Heatmap2D", () => {
  it("draws the grid cells to the canvas", () => {
    const fillRect = vi.fn();
    const ctx = { fillRect, clearRect: vi.fn(), set fillStyle(_v: string) {} } as unknown as CanvasRenderingContext2D;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    render(<Heatmap2D grid={[[0, 1], [0.5, 0.2]]} size={40} />);
    expect(fillRect).toHaveBeenCalledTimes(4); // 2x2 grid
  });
});

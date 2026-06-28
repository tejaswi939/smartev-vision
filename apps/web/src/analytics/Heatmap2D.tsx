import { useEffect, useRef } from "react";

function heatColor(v: number): string {
  if (v <= 0) return "#0a0a0f";
  const r = Math.round(255 * Math.min(1, v * 1.2));
  const g = Math.round(80 * (1 - v));
  const b = Math.round(255 * (1 - v));
  return `rgb(${r},${g},${b})`;
}

/** Renders a normalized N×N intensity grid to a canvas with the SmartEV heat ramp. */
export function Heatmap2D({ grid, size = 240 }: { grid: number[][]; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const n = grid.length || 1;
    const cell = size / n;
    ctx.clearRect(0, 0, size, size);
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y]!;
      for (let x = 0; x < row.length; x++) {
        ctx.fillStyle = heatColor(row[x]!);
        ctx.fillRect(x * cell, y * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }
  }, [grid, size]);
  return <canvas ref={ref} width={size} height={size} data-testid="heatmap2d" className="rounded-xl border border-white/10" />;
}

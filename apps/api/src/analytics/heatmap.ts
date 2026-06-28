/** Bins normalized (0..1) gaze points into an N×N grid and normalizes to 0..1 (hottest cell = 1). */
export function buildHeatmapGrid(points: { x: number; y: number; weight?: number }[], resolution = 40): number[][] {
  const grid: number[][] = Array.from({ length: resolution }, () => new Array<number>(resolution).fill(0));
  for (const p of points) {
    const xi = Math.min(resolution - 1, Math.max(0, Math.floor(p.x * resolution)));
    const yi = Math.min(resolution - 1, Math.max(0, Math.floor(p.y * resolution)));
    grid[yi]![xi]! += p.weight ?? 1;
  }
  let max = 0;
  for (const row of grid) for (const v of row) max = Math.max(max, v);
  if (max > 0) {
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) grid[y]![x]! /= max;
    }
  }
  return grid;
}

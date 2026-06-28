export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Frame-rate-independent approach toward a target; never overshoots. */
export function approach(current: number, target: number, dt: number, speed: number): number {
  const t = 1 - Math.exp(-speed * dt);
  return lerp(current, target, Math.min(1, t));
}

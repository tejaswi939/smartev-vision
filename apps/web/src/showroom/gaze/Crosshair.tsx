/** Center reticle for crosshair / camera-center gaze modes. */
export function Crosshair() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
      <div className="h-6 w-6 rounded-full border-2 border-neon/70 shadow-glow" />
    </div>
  );
}

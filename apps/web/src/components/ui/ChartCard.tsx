import type { ReactNode } from "react";
import { GlassCard } from "./GlassCard.js";

export function ChartCard({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <GlassCard>
      <div className="mb-3 font-display text-white">{title}</div>
      <div className="h-48 grid place-items-center text-slate-500 text-sm">
        {children ?? "No data yet"}
      </div>
    </GlassCard>
  );
}

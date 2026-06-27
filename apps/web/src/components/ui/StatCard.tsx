import type { ReactNode } from "react";
import { GlassCard } from "./GlassCard.js";

export function StatCard({
  label, value, delta, icon,
}: { label: string; value: ReactNode; delta?: string; icon?: ReactNode }) {
  return (
    <GlassCard className="flex items-center justify-between">
      <div>
        <div className="text-sm text-slate-400">{label}</div>
        <div className="text-2xl font-display text-white">{value}</div>
        {delta && <div className="text-xs text-teal">{delta}</div>}
      </div>
      {icon && <div className="text-neon text-3xl">{icon}</div>}
    </GlassCard>
  );
}

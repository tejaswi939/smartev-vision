import type { ReactNode } from "react";
import { GlassCard } from "./GlassCard.js";
import { Skeleton } from "./Skeleton.js";

export function StatCard({
  label, value, delta, icon, loading,
}: { label: string; value: ReactNode; delta?: string; icon?: ReactNode; loading?: boolean }) {
  return (
    <GlassCard className="flex items-center justify-between">
      <div className="min-w-0">
        <div className="text-sm text-slate-400">{label}</div>
        {loading ? (
          <Skeleton className="mt-1.5 h-7 w-20" />
        ) : (
          <div className="truncate text-2xl font-display text-white">{value}</div>
        )}
        {delta && !loading && <div className="text-xs text-teal">{delta}</div>}
      </div>
      {icon && <div className="text-3xl text-neon">{icon}</div>}
    </GlassCard>
  );
}

import type { ReactNode } from "react";

export type BadgeTone = "neon" | "violet" | "teal" | "slate";

const TONES: Record<BadgeTone, string> = {
  neon: "bg-neon/15 text-neon border-neon/30",
  violet: "bg-violet/15 text-violet border-violet/40",
  teal: "bg-teal/15 text-teal border-teal/40",
  slate: "bg-white/10 text-slate-300 border-white/20",
};

export function Badge({ children, tone = "neon" }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border ${TONES[tone]}`}>{children}</span>
  );
}

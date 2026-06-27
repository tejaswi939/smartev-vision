import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="px-2 py-0.5 text-xs rounded-full bg-neon/15 text-neon border border-neon/30">
      {children}
    </span>
  );
}

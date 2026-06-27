import type { HTMLAttributes } from "react";

export function GlassCard({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`glass p-6 ${className}`} {...rest} />;
}

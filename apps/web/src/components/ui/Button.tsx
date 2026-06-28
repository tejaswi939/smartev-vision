import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: "bg-neon text-base hover:shadow-glow",
    ghost: "bg-white/5 text-slate-200 hover:bg-white/10 border border-white/10",
    danger: "bg-rose-500 text-white hover:bg-rose-400",
  };
  return (
    <button
      className={`px-4 py-2 rounded-xl font-medium transition disabled:opacity-50 ${styles[variant]} ${className}`}
      {...rest}
    />
  );
}

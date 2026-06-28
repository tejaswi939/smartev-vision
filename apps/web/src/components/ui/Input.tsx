import type { InputHTMLAttributes, ReactNode } from "react";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-neon outline-none ${className}`}
      {...rest}
    />
  );
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-slate-400">{label}</span>
      {children}
      {hint && !error && <span className="text-xs text-slate-500">{hint}</span>}
      {error && (
        <span className="text-xs text-rose-400" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

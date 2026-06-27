import type { InputHTMLAttributes, ReactNode } from "react";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-neon outline-none ${className}`}
      {...rest}
    />
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-slate-400">{label}</span>
      {children}
      {error && (
        <span className="text-xs text-rose-400" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

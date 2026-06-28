import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Role } from "@sev/shared";
import { useAuth } from "../../auth/AuthContext.js";

const NAV: Record<Role, { to: string; label: string }[]> = {
  ADMIN: [
    { to: "/admin", label: "Overview" },
    { to: "/admin", label: "Users" },
    { to: "/showroom", label: "Showroom" },
  ],
  ANALYST: [
    { to: "/insights", label: "Insights" },
    { to: "/showroom", label: "Showroom" },
  ],
  CUSTOMER: [
    { to: "/app", label: "My Sessions" },
    { to: "/showroom", label: "Showroom" },
    { to: "/profile", label: "Profile" },
  ],
};

export function AppShell({ role, title, children }: { role: Role; title: string; children: ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-full grid grid-cols-[240px_1fr]">
      <aside className="glass m-3 p-4 space-y-3">
        <div className="font-display text-neon text-lg">SmartEV</div>
        <nav className="flex flex-col gap-1">
          {NAV[role].map((n, i) => (
            <Link key={i} to={n.to} className="px-3 py-2 rounded-lg hover:bg-white/10">
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-white">{title}</h1>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span>{user?.name}</span>
            <button onClick={() => void logout()} className="text-rose-400">
              Logout
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

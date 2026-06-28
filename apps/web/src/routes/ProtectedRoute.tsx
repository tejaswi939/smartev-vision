import { Navigate, Outlet } from "react-router-dom";
import type { Role } from "@sev/shared";
import { ROLE_HOME } from "@sev/shared";
import { useAuth } from "../auth/AuthContext.js";

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
}

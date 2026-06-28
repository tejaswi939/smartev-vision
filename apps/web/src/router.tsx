import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute.js";
import Landing from "./pages/Landing.js";
import Login from "./pages/auth/Login.js";
import Register from "./pages/auth/Register.js";
import Forgot from "./pages/auth/Forgot.js";
import Reset from "./pages/auth/Reset.js";
import Profile from "./pages/auth/Profile.js";

// Heavy routes (3D showroom + Recharts dashboards) are code-split out of the initial bundle.
const ShowroomPage = lazy(() => import("./showroom/ShowroomPage.js"));
const CustomerDashboard = lazy(() => import("./pages/dashboards/CustomerDashboard.js"));
const AnalystDashboard = lazy(() => import("./pages/dashboards/AnalystDashboard.js"));
const AdminDashboard = lazy(() => import("./pages/dashboards/AdminDashboard.js"));
const SessionDetail = lazy(() => import("./pages/dashboards/SessionDetail.js"));

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/reset" element={<Reset />} />
        <Route path="/showroom" element={<ShowroomPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route element={<ProtectedRoute roles={["CUSTOMER"]} />}>
          <Route path="/app" element={<CustomerDashboard />} />
          <Route path="/app/sessions/:id" element={<SessionDetail />} />
        </Route>
        <Route element={<ProtectedRoute roles={["ANALYST"]} />}>
          <Route path="/insights" element={<AnalystDashboard />} />
        </Route>
        <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

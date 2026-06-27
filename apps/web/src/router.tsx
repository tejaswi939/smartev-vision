import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute.js";
import Landing from "./pages/Landing.js";
import Login from "./pages/auth/Login.js";
import Register from "./pages/auth/Register.js";
import Forgot from "./pages/auth/Forgot.js";
import Reset from "./pages/auth/Reset.js";
import Profile from "./pages/auth/Profile.js";
import CustomerDashboard from "./pages/dashboards/CustomerDashboard.js";
import AnalystDashboard from "./pages/dashboards/AnalystDashboard.js";
import AdminDashboard from "./pages/dashboards/AdminDashboard.js";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot" element={<Forgot />} />
      <Route path="/reset" element={<Reset />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route element={<ProtectedRoute roles={["CUSTOMER"]} />}>
        <Route path="/app" element={<CustomerDashboard />} />
      </Route>
      <Route element={<ProtectedRoute roles={["ANALYST"]} />}>
        <Route path="/insights" element={<AnalystDashboard />} />
      </Route>
      <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}

import { useQuery } from "@tanstack/react-query";
import type { AuthUser, Paginated } from "@sev/shared";
import { AppShell } from "../../components/shell/AppShell.js";
import { StatCard, ChartCard } from "../../components/ui/index.js";
import { api } from "../../lib/apiClient.js";

export default function AdminDashboard() {
  const { data } = useQuery<Paginated<AuthUser>>({
    queryKey: ["users"],
    queryFn: () => api.get("/users"),
  });
  return (
    <AppShell role="ADMIN" title="Admin Overview">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Total Users" value={data?.total ?? "—"} />
        <StatCard label="Vehicles" value="3" />
        <StatCard label="Sessions" value="6" />
      </div>
      <ChartCard title="Sessions over time" />
    </AppShell>
  );
}

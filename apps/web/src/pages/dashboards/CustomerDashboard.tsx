import { AppShell } from "../../components/shell/AppShell.js";
import { StatCard, ChartCard } from "../../components/ui/index.js";

export default function CustomerDashboard() {
  return (
    <AppShell role="CUSTOMER" title="My Dashboard">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Sessions" value="6" />
        <StatCard label="Avg. Engagement" value="72%" delta="+4% vs last week" />
        <StatCard label="Favorite Model" value="Aurora S" />
      </div>
      <ChartCard title="Attention over time" />
    </AppShell>
  );
}

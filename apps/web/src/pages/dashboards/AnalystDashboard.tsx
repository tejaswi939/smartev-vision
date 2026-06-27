import { AppShell } from "../../components/shell/AppShell.js";
import { StatCard, ChartCard } from "../../components/ui/index.js";

export default function AnalystDashboard() {
  return (
    <AppShell role="ANALYST" title="Insights">
      <div className="grid sm:grid-cols-4 gap-4">
        <StatCard label="Total Sessions" value="6" />
        <StatCard label="Avg. Engagement" value="68%" />
        <StatCard label="Top Component" value="Infotainment" />
        <StatCard label="Satisfaction" value="4.6/5" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Most-viewed components" />
        <ChartCard title="Engagement distribution" />
      </div>
    </AppShell>
  );
}

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
} from "recharts";
import DashboardCard from "@/components/dashboard/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bullet } from "@/components/ui/bullet";
import type { CustomerAnalyticsData } from "@/src/services/analytics";
import { CHART_COLORS } from "./format";
import InfoHint from "./info-hint";

const histConfig = {
  count: { label: "Orders", color: "var(--chart-3)" },
} satisfies ChartConfig;

export default function CustomerAnalytics({
  data,
}: {
  data: CustomerAnalyticsData | undefined;
}) {
  if (!data) {
    return (
      <div className="rounded-lg border border-border/60 bg-card px-4 py-10 text-center text-muted-foreground uppercase">
        Loading data...
      </div>
    );
  }

  const pieData = data.newVsReturning.map((d) => ({
    name: d.type === "new" ? "New customers" : "Returning customers",
    value: d.count,
    fill: d.type === "new" ? CHART_COLORS[0] : CHART_COLORS[1],
  }));

  const totalCustomers = data.newVsReturning.reduce((s, d) => s + d.count, 0);
  const cohortMonths = [...new Set(data.cohortData.map((c) => c.firstMonth))].sort();
  const allMonths = [...new Set(data.cohortData.map((c) => c.month))].sort();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New vs Returning */}
        <DashboardCard
          title="NEW VS RETURNING CUSTOMERS"
          addon={<InfoHint text="Shows customer mix between first-time buyers and repeat buyers." />}
        >
          <div className="bg-accent rounded-lg p-3 w-full">
            <div className="w-full h-64">
              <ChartContainer className="w-full h-full" config={{}}>
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0];
                      const pct = totalCustomers > 0 ? ((Number(d.value) / totalCustomers) * 100).toFixed(1) : "0";
                      return (
                        <div className="border-border/50 bg-background rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                          <div className="font-medium">{d.name}</div>
                          <div className="text-muted-foreground">{Number(d.value)} customers ({pct}%)</div>
                        </div>
                      );
                    }}
                  />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {pieData.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5 uppercase">
                <Bullet style={{ backgroundColor: p.fill }} className="rotate-45" />
                <span className="text-sm font-medium text-muted-foreground">
                  {p.name}: <span className="font-display">{p.value}</span>
                </span>
              </div>
            ))}
          </div>
        </DashboardCard>

        {/* Order Value Distribution */}
        <DashboardCard
          title="ORDER VALUE DISTRIBUTION"
          addon={<InfoHint text="Histogram of order values to reveal common spending ranges." />}
        >
          <div className="bg-accent rounded-lg p-3 w-full">
            <div className="w-full h-64">
              <ChartContainer className="w-full h-full" config={histConfig}>
                <BarChart data={data.orderValueDistribution} margin={{ left: -12, right: 12, top: 12, bottom: 12 }}>
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="8 8"
                    strokeWidth={2}
                    stroke="var(--muted-foreground)"
                    opacity={0.3}
                  />
                  <XAxis dataKey="range" tickLine={false} className="text-sm fill-muted-foreground" />
                  <YAxis tickLine={false} axisLine={false} className="text-sm fill-muted-foreground" />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent indicator="dot" formatter={(value) => `${Number(value)} orders`} />
                    }
                  />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </DashboardCard>

        {/* Cohort Retention Table */}
        <DashboardCard
          title="MONTHLY RETENTION COHORT"
          addon={<InfoHint text="Rows are first purchase month cohorts, columns are follow-up months, values are retained customer rates." />}
        >
          <div className="bg-accent rounded-lg overflow-auto max-h-72">
            {cohortMonths.length > 0 ? (
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-accent">
                  <tr>
                    <th className="border-b border-border/60 p-1.5 text-left font-medium text-muted-foreground uppercase tracking-wide">Start month</th>
                    {allMonths.map((m) => (
                      <th key={m} className="border-b border-border/60 p-1.5 text-center font-medium text-muted-foreground">{m.slice(5)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohortMonths.map((fm) => {
                    const firstMonthData = data.cohortData.find(
                      (c) => c.firstMonth === fm && c.month === fm
                    );
                    const baseCount = firstMonthData?.customers ?? 1;
                    return (
                      <tr key={fm} className="border-b border-border/30">
                        <td className="p-1.5 font-medium">{fm}</td>
                        {allMonths.map((m) => {
                          const entry = data.cohortData.find(
                            (c) => c.firstMonth === fm && c.month === m
                          );
                          if (!entry || m < fm) {
                            return <td key={m} className="p-1.5 text-center text-muted-foreground">-</td>;
                          }
                          const pct = baseCount > 0 ? Math.round((entry.customers / baseCount) * 100) : 0;
                          const intensity = Math.min(pct / 100, 1);
                          return (
                            <td
                              key={m}
                              className="p-1.5 text-center font-display"
                              style={{
                                backgroundColor: `color-mix(in oklch, var(--chart-1) ${intensity * 50}%, transparent)`,
                              }}
                            >
                              {pct}%
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-muted-foreground uppercase">
                Not enough data to build cohorts
              </div>
            )}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}

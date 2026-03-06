import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import DashboardCard from "@/components/dashboard/card";
import DashboardStat from "@/components/dashboard/stat";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartLegend } from "@/components/dashboard/chart";
import GearIcon from "@/components/icons/gear";
import ProcessorIcon from "@/components/icons/proccesor";
import BoomIcon from "@/components/icons/boom";
import type { SalesOverviewData } from "@/src/services/analytics";
import {
  CATEGORY_LABELS,
  CHANNEL_LABELS,
  CHART_COLORS,
  formatVnd,
  formatVndFull,
} from "./format";
import InfoHint from "./info-hint";

function getWeekKey(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function toMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${month}/${year.slice(2)}`;
}

function toDateLabel(date: string) {
  return date.slice(5);
}

const categoryKeys = [
  "tws_earbuds",
  "over_ear",
  "gaming_headset",
  "in_ear",
  "accessories",
] as const;

type Granularity = "daily" | "weekly" | "monthly";

const EMPTY_SALES_DATA: SalesOverviewData = {
  totalRevenue: 0,
  totalOrders: 0,
  avgOrderValue: 0,
  returnedOrders: 0,
  cancelledOrders: 0,
  netRevenue: 0,
  totalProfit: 0,
  totalCost: 0,
  prevPeriodRevenue: 0,
  revenueByDate: [],
  revenueByChannel: [],
  revenueByModel: [],
  revenueByBrand: [],
  revenueByCategoryMonthly: [],
  transactions: [],
};

export default function SalesOverview({ data }: { data: SalesOverviewData | undefined }) {
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const safeData = data ?? EMPTY_SALES_DATA;

  const growthRate =
    safeData.prevPeriodRevenue > 0
      ? ((safeData.totalRevenue - safeData.prevPeriodRevenue) / safeData.prevPeriodRevenue) * 100
      : 0;

  const marginPct = safeData.totalRevenue > 0 ? (safeData.totalProfit / safeData.totalRevenue) * 100 : 0;

  const latestDateStr = safeData.revenueByDate[safeData.revenueByDate.length - 1]?.date;
  const latestDate = latestDateStr ? new Date(`${latestDateStr}T00:00:00`) : new Date();
  const latestMonth = `${latestDate.getFullYear()}-${String(latestDate.getMonth() + 1).padStart(2, "0")}`;

  const startOfWeek = new Date(latestDate);
  const day = startOfWeek.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  startOfWeek.setDate(startOfWeek.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const summary = useMemo(() => {
    let mtdRevenue = 0;
    let wtdRevenue = 0;
    let mtdOrders = 0;
    let wtdOrders = 0;

    for (const tx of safeData.transactions) {
      if (tx.month === latestMonth) {
        mtdRevenue += tx.revenue;
        mtdOrders += 1;
      }
      const txDate = new Date(`${tx.date}T00:00:00`);
      if (txDate >= startOfWeek && txDate <= latestDate) {
        wtdRevenue += tx.revenue;
        wtdOrders += 1;
      }
    }

    const daysCovered = Math.max(1, safeData.revenueByDate.length);
    return {
      mtdRevenue,
      wtdRevenue,
      mtdOrders,
      wtdOrders,
      avgOrderPerDay: safeData.totalOrders / daysCovered,
      netRevenue: safeData.netRevenue,
      cancelReturnRate:
        safeData.totalOrders > 0
          ? ((safeData.returnedOrders + safeData.cancelledOrders) / safeData.totalOrders) * 100
          : 0,
    };
  }, [safeData, latestDate, latestMonth, startOfWeek]);

  const activeChannels = useMemo(
    () =>
      safeData.revenueByChannel
        .filter((item) => item.channel !== "website")
        .slice(0, 5)
        .map((item) => item.channel),
    [safeData.revenueByChannel],
  );

  const trendData = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();

    const ensurePoint = (key: string, label: string) => {
      const existing = map.get(key);
      if (existing) return existing;
      const row: Record<string, number | string> = { key, label, total: 0 };
      activeChannels.forEach((channel) => {
        row[channel] = 0;
      });
      map.set(key, row);
      return row;
    };

    for (const tx of safeData.transactions) {
      let bucketKey = tx.date;
      let label = toDateLabel(tx.date);
      if (granularity === "weekly") {
        bucketKey = getWeekKey(tx.date);
        label = bucketKey.slice(5);
      }
      if (granularity === "monthly") {
        bucketKey = tx.month;
        label = toMonthLabel(tx.month);
      }

      const row = ensurePoint(bucketKey, label);
      row.total = Number(row.total) + tx.revenue;
      if (activeChannels.includes(tx.channel)) {
        row[tx.channel] = Number(row[tx.channel]) + tx.revenue;
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      String(a.key).localeCompare(String(b.key)),
    );
  }, [activeChannels, safeData.transactions, granularity]);

  const categoryMonthlyData = safeData.revenueByCategoryMonthly.map((item) => ({
    ...item,
    monthLabel: toMonthLabel(item.month),
  }));

  const lineConfig: ChartConfig = {
    total: { label: "Total", color: "var(--chart-1)" },
  };
  activeChannels.forEach((channel, index) => {
    lineConfig[channel] = {
      label: CHANNEL_LABELS[channel] ?? channel,
      color: CHART_COLORS[(index + 1) % CHART_COLORS.length],
    };
  });

  const categoryConfig: ChartConfig = {};
  categoryKeys.forEach((key, index) => {
    categoryConfig[key] = {
      label: CATEGORY_LABELS[key],
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
  });

  if (!data) {
    return (
      <div className="rounded-lg border border-border/60 bg-card px-4 py-10 text-center text-muted-foreground uppercase">
        Loading data...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardStat
          label="TOTAL REVENUE"
          value={String(Math.round(safeData.totalRevenue))}
          odometerValue={Math.round(safeData.totalRevenue)}
          unitLabel="VND"
          description={`MTD ${formatVnd(summary.mtdRevenue)} | WTD ${formatVnd(summary.wtdRevenue)}`}
          icon={GearIcon}
          intent={safeData.totalRevenue > 0 ? "positive" : "neutral"}
          direction={safeData.totalRevenue > 0 ? "up" : undefined}
        />

        <DashboardStat
          label="ORDERS"
          value={String(safeData.totalOrders)}
          odometerValue={safeData.totalOrders}
          description={`Avg ${summary.avgOrderPerDay.toFixed(1)}/day`}
          icon={ProcessorIcon}
          intent={safeData.totalOrders > 0 ? "positive" : "neutral"}
          direction={safeData.totalOrders > 0 ? "up" : undefined}
        />

        <DashboardStat
          label="AOV"
          value={String(Math.round(safeData.avgOrderValue))}
          odometerValue={Math.round(safeData.avgOrderValue)}
          unitLabel="VND"
          description={`Growth ${growthRate > 0 ? "+" : ""}${growthRate.toFixed(1)}%`}
          icon={BoomIcon}
          intent={growthRate >= 0 ? "positive" : "negative"}
          direction={growthRate >= 0 ? "up" : "down"}
        />

        <DashboardStat
          label="RETURN/CANCEL RATE"
          value={summary.cancelReturnRate.toFixed(1)}
          odometerValue={Number(summary.cancelReturnRate.toFixed(1))}
          odometerFormat="(,ddd).d"
          unitLabel="%"
          description={`${safeData.returnedOrders + safeData.cancelledOrders} orders`}
          icon={GearIcon}
          intent={summary.cancelReturnRate > 10 ? "negative" : "neutral"}
          direction={summary.cancelReturnRate > 10 ? "down" : undefined}
        />

        <DashboardStat
          label="NET REVENUE"
          value={String(Math.round(summary.netRevenue))}
          odometerValue={Math.round(summary.netRevenue)}
          unitLabel="VND"
          description={`Gross margin ${marginPct.toFixed(1)}%`}
          icon={ProcessorIcon}
          intent={summary.netRevenue > 0 ? "positive" : "neutral"}
          direction={summary.netRevenue > 0 ? "up" : undefined}
        />

        <DashboardStat
          label="VS PREVIOUS PERIOD"
          value={growthRate.toFixed(1)}
          odometerValue={Number(growthRate.toFixed(1))}
          odometerFormat="(,ddd).d"
          unitLabel="%"
          description={`Prev ${formatVnd(safeData.prevPeriodRevenue)}`}
          icon={BoomIcon}
          intent={growthRate >= 0 ? "positive" : "negative"}
          direction={growthRate >= 0 ? "up" : "down"}
        />
      </div>

      <DashboardCard
        title="REVENUE OVER TIME"
        addon={
          <div className="flex items-center gap-2">
            <InfoHint text="Trend chart by day/week/month. Total line plus channel overlays help compare channel momentum over time." />
            <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        }
      >
        <div className="flex items-center gap-5 mb-3 flex-wrap">
          {Object.entries(lineConfig).map(([key, value]) => (
            <ChartLegend key={key} label={String(value.label)} color={String(value.color)} />
          ))}
        </div>
        <div className="bg-accent rounded-lg p-3 w-full">
          <div className="w-full h-72">
            <ChartContainer className="w-full h-full" config={lineConfig}>
              <LineChart data={trendData} margin={{ left: -12, right: 12, top: 12, bottom: 12 }}>
                <CartesianGrid
                  horizontal={false}
                  strokeDasharray="8 8"
                  strokeWidth={2}
                  stroke="var(--muted-foreground)"
                  opacity={0.3}
                />
                <XAxis dataKey="label" tickLine={false} className="text-sm fill-muted-foreground" />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatVnd}
                  className="text-sm fill-muted-foreground"
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" formatter={(value) => formatVndFull(Number(value))} />}
                />
                <Line type="linear" dataKey="total" stroke="var(--color-total)" strokeWidth={2.5} dot={false} />
                {activeChannels.map((channel) => (
                  <Line
                    key={channel}
                    type="linear"
                    dataKey={channel}
                    stroke={`var(--color-${channel})`}
                    strokeWidth={1.8}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          </div>
        </div>
      </DashboardCard>

      <div className="grid grid-cols-1 gap-6">
        <DashboardCard
          title="MONTHLY REVENUE MIX BY CATEGORY"
          addon={<InfoHint text="Stacked bars show category contribution by month, making product-mix changes easy to spot." />}
        >
          <div className="bg-accent rounded-lg p-3 w-full">
            <div className="w-full h-72">
              <ChartContainer className="w-full h-full" config={categoryConfig}>
                <BarChart data={categoryMonthlyData} margin={{ left: -12, right: 12, top: 12, bottom: 12 }}>
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="8 8"
                    strokeWidth={2}
                    stroke="var(--muted-foreground)"
                    opacity={0.3}
                  />
                  <XAxis dataKey="monthLabel" tickLine={false} className="text-sm fill-muted-foreground" />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={formatVnd} className="text-sm fill-muted-foreground" />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" formatter={(value) => formatVndFull(Number(value))} />}
                  />
                  {categoryKeys.map((key) => (
                    <Bar key={key} dataKey={key} stackId="category" fill={`var(--color-${key})`} />
                  ))}
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}



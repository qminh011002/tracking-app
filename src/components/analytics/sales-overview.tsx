import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
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
import { Bullet } from "@/components/ui/bullet";
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

function growth(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
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
  prevPeriodProfit: 0,
  prevPeriodOrders: 0,
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

  const prevProfit = safeData.prevPeriodProfit ?? 0;
  const prevOrders = safeData.prevPeriodOrders ?? 0;

  const revenueGrowth = growth(safeData.totalRevenue, safeData.prevPeriodRevenue);
  const profitGrowth = growth(safeData.totalProfit, prevProfit);
  const orderGrowth = growth(safeData.totalOrders, prevOrders);
  const marginPct = safeData.totalRevenue > 0 ? (safeData.totalProfit / safeData.totalRevenue) * 100 : 0;
  const prevMarginPct =
    safeData.prevPeriodRevenue > 0 ? (prevProfit / safeData.prevPeriodRevenue) * 100 : 0;
  const marginDelta = marginPct - prevMarginPct;
  const avgOrderPerDay =
    safeData.revenueByDate.length > 0 ? safeData.totalOrders / safeData.revenueByDate.length : 0;
  const avgProfitPerOrder = safeData.totalOrders > 0 ? safeData.totalProfit / safeData.totalOrders : 0;

  // Revenue + profit trend at the selected granularity.
  const trendData = useMemo(() => {
    const map = new Map<string, { key: string; label: string; revenue: number; profit: number }>();

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

      const row = map.get(bucketKey) ?? { key: bucketKey, label, revenue: 0, profit: 0 };
      row.revenue += tx.revenue;
      row.profit += tx.profit;
      map.set(bucketKey, row);
    }

    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [safeData.transactions, granularity]);

  const channelData = useMemo(
    () =>
      safeData.revenueByChannel
        .filter((item) => item.revenue > 0)
        .map((item, index) => ({
          name: CHANNEL_LABELS[item.channel] ?? item.channel,
          value: item.revenue,
          orders: item.orders,
          fill: CHART_COLORS[index % CHART_COLORS.length],
        })),
    [safeData.revenueByChannel],
  );

  const topProducts = useMemo(
    () => safeData.revenueByModel.slice(0, 6),
    [safeData.revenueByModel],
  );

  const categoryMonthlyData = safeData.revenueByCategoryMonthly.map((item) => ({
    ...item,
    monthLabel: toMonthLabel(item.month),
  }));

  const trendConfig: ChartConfig = {
    revenue: { label: "Revenue", color: "var(--chart-1)" },
    profit: { label: "Profit", color: "var(--chart-2)" },
  };

  const productConfig: ChartConfig = {
    revenue: { label: "Revenue", color: "var(--chart-1)" },
  };

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
      {/* Primary KPIs — revenue, profit and margin lead the view. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardStat
          label="TOTAL REVENUE"
          value={String(Math.round(safeData.totalRevenue))}
          odometerValue={Math.round(safeData.totalRevenue)}
          unitLabel="VND"
          description={`vs prev ${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth.toFixed(1)}% (${formatVnd(safeData.prevPeriodRevenue)})`}
          icon={GearIcon}
          intent={revenueGrowth >= 0 ? "positive" : "negative"}
          direction={revenueGrowth >= 0 ? "up" : "down"}
        />

        <DashboardStat
          label="GROSS PROFIT"
          value={String(Math.round(safeData.totalProfit))}
          odometerValue={Math.round(safeData.totalProfit)}
          unitLabel="VND"
          description={`vs prev ${profitGrowth >= 0 ? "+" : ""}${profitGrowth.toFixed(1)}% (${formatVnd(prevProfit)})`}
          icon={BoomIcon}
          intent={safeData.totalProfit >= 0 ? "positive" : "negative"}
          direction={safeData.totalProfit >= 0 ? "up" : "down"}
        />

        <DashboardStat
          label="GROSS MARGIN"
          value={marginPct.toFixed(1)}
          odometerValue={Number(marginPct.toFixed(1))}
          odometerFormat="(,ddd).d"
          unitLabel="%"
          description={`${marginDelta >= 0 ? "+" : ""}${marginDelta.toFixed(1)} pts vs prev`}
          icon={ProcessorIcon}
          intent={marginDelta >= 0 ? "positive" : "negative"}
          direction={marginDelta >= 0 ? "up" : "down"}
        />

        <DashboardStat
          label="ORDERS"
          value={String(safeData.totalOrders)}
          odometerValue={safeData.totalOrders}
          description={`Avg ${avgOrderPerDay.toFixed(1)}/day | vs prev ${orderGrowth >= 0 ? "+" : ""}${orderGrowth.toFixed(0)}%`}
          icon={ProcessorIcon}
          intent={orderGrowth >= 0 ? "positive" : "negative"}
          direction={orderGrowth >= 0 ? "up" : "down"}
        />

        <DashboardStat
          label="AVG ORDER VALUE"
          value={String(Math.round(safeData.avgOrderValue))}
          odometerValue={Math.round(safeData.avgOrderValue)}
          unitLabel="VND"
          description="Revenue per order"
          icon={GearIcon}
          intent="neutral"
        />

        <DashboardStat
          label="AVG PROFIT / ORDER"
          value={String(Math.round(avgProfitPerOrder))}
          odometerValue={Math.round(avgProfitPerOrder)}
          unitLabel="VND"
          description={`Total cost ${formatVnd(safeData.totalCost)}`}
          icon={BoomIcon}
          intent="neutral"
        />
      </div>

      {/* Hero: revenue (bars) vs profit (line) over time. */}
      <DashboardCard
        title="REVENUE & PROFIT OVER TIME"
        addon={
          <div className="flex items-center gap-2">
            <InfoHint text="Bars show revenue, the line shows gross profit per period. Toggle the grain to compare day, week and month momentum." />
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
          <ChartLegend label="Revenue" color="var(--chart-1)" />
          <ChartLegend label="Profit" color="var(--chart-2)" />
        </div>
        <div className="bg-accent rounded-lg p-3 w-full">
          <div className="w-full h-80">
            <ChartContainer className="w-full h-full" config={trendConfig}>
              <ComposedChart data={trendData} margin={{ left: -12, right: 12, top: 12, bottom: 12 }}>
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
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} maxBarSize={48} />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="var(--color-profit)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </ComposedChart>
            </ChartContainer>
          </div>
        </div>
      </DashboardCard>

      {/* At-a-glance breakdowns: channel mix + top products. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard
          title="REVENUE BY CHANNEL"
          addon={<InfoHint text="Share of revenue per sales channel so you can see where demand concentrates." />}
        >
          <div className="bg-accent rounded-lg p-3 w-full">
            <div className="w-full h-72">
              <ChartContainer className="w-full h-full" config={{}}>
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const row = payload[0].payload;
                      const pct =
                        safeData.totalRevenue > 0
                          ? ((Number(row.value) / safeData.totalRevenue) * 100).toFixed(1)
                          : "0";
                      return (
                        <div className="border-border/50 bg-background rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                          <div className="font-medium">{row.name}</div>
                          <div className="text-muted-foreground">{formatVndFull(Number(row.value))} ({pct}%)</div>
                          <div className="text-muted-foreground">{row.orders} orders</div>
                        </div>
                      );
                    }}
                  />
                  <Pie
                    data={channelData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={108}
                    paddingAngle={2}
                  >
                    {channelData.map((item, index) => (
                      <Cell key={index} fill={item.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {channelData.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5 uppercase">
                <Bullet style={{ backgroundColor: item.fill }} className="rotate-45" />
                <span className="text-sm font-medium text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard
          title="TOP PRODUCTS BY REVENUE"
          addon={<InfoHint text="The six SKUs generating the most revenue in the selected period." />}
        >
          <div className="bg-accent rounded-lg p-3 w-full">
            <div className="w-full h-72">
              <ChartContainer className="w-full h-full" config={productConfig}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 10, right: 12, top: 12, bottom: 12 }}>
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="8 8"
                    strokeWidth={2}
                    stroke="var(--muted-foreground)"
                    opacity={0.3}
                  />
                  <XAxis type="number" tickFormatter={formatVnd} tickLine={false} className="text-sm fill-muted-foreground" />
                  <YAxis
                    type="category"
                    dataKey="model"
                    width={130}
                    tickLine={false}
                    className="text-sm fill-muted-foreground"
                    tickFormatter={(value) =>
                      String(value).length > 18 ? `${String(value).slice(0, 18)}...` : String(value)
                    }
                  />
                  <ChartTooltip
                    cursor={false}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const row = payload[0].payload;
                      return (
                        <div className="border-border/50 bg-background rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                          <div className="font-medium">{row.model}</div>
                          <div className="text-muted-foreground">{formatVndFull(row.revenue)}</div>
                          <div className="text-muted-foreground">{row.orders} orders</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Product-mix trend. */}
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
  );
}

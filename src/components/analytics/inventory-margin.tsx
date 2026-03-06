import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
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
import { ChartLegend } from "@/components/dashboard/chart";
import GearIcon from "@/components/icons/gear";
import ProcessorIcon from "@/components/icons/proccesor";
import BoomIcon from "@/components/icons/boom";
import type { InventoryMarginData } from "@/src/services/analytics";
import { CHART_COLORS, formatVnd, formatVndFull } from "./format";
import InfoHint from "./info-hint";

function gaugeColor(value: number) {
  if (value >= 120) return "var(--chart-2)";
  if (value >= 80) return "var(--chart-4)";
  return "var(--destructive)";
}

export default function InventoryMargin({ data }: { data: InventoryMarginData | undefined }) {
  if (!data) {
    return (
      <div className="rounded-lg border border-border/60 bg-card px-4 py-10 text-center text-muted-foreground uppercase">
        Loading data...
      </div>
    );
  }

  const totalDevices = data.inStockCount + data.soldCount;
  const stockPct = totalDevices > 0 ? (data.inStockCount / totalDevices) * 100 : 0;
  const soldPct = totalDevices > 0 ? (data.soldCount / totalDevices) * 100 : 0;

  const waterfall = [
    { name: "Revenue", value: data.costBreakdown.revenue },
    { name: "COGS", value: -data.costBreakdown.cogs },
    { name: "Shipping", value: -data.costBreakdown.shippingCost },
    { name: "Gross profit", value: data.costBreakdown.grossProfit },
  ];

  const marginLineConfig = {
    marginPct: { label: "Bien loi nhuan %", color: "var(--chart-2)" },
  } satisfies ChartConfig;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardStat
          label="IN STOCK"
          value={String(data.inStockCount)}
          odometerValue={data.inStockCount}
          description={`${stockPct.toFixed(0)}% of all devices`}
          icon={GearIcon}
          intent="neutral"
        />
        <DashboardStat
          label="SOLD"
          value={String(data.soldCount)}
          odometerValue={data.soldCount}
          description={`${soldPct.toFixed(0)}% of all devices`}
          icon={ProcessorIcon}
          intent={data.soldCount > 0 ? "positive" : "neutral"}
          direction={data.soldCount > 0 ? "up" : undefined}
        />
        <DashboardStat
          label="INVENTORY VALUE"
          value={String(Math.round(data.totalInventoryValue))}
          odometerValue={Math.round(data.totalInventoryValue)}
          unitLabel="VND"
          description="Total cost value of in-stock units"
          icon={GearIcon}
          intent="neutral"
        />
        <DashboardStat
          label="GROSS PROFIT"
          value={String(Math.round(data.costBreakdown.grossProfit))}
          odometerValue={Math.round(data.costBreakdown.grossProfit)}
          unitLabel="VND"
          description="After COGS and shipping"
          icon={BoomIcon}
          intent={data.costBreakdown.grossProfit > 0 ? "positive" : "negative"}
          direction={data.costBreakdown.grossProfit > 0 ? "up" : "down"}
        />
      </div>

      <DashboardCard
        title="STOCK-TO-SAFETY GAUGE (TOP SKUS)"
        addon={<InfoHint text="Gauge shows stock ratio versus safety stock. >100% is healthy, <80% needs replenishment." />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {data.inventoryByModel.slice(0, 8).map((item) => {
            const ratio = Math.min(200, Math.max(0, item.stockRatio));
            const gaugeData = [{ name: "ratio", value: ratio, fill: gaugeColor(ratio) }];
            return (
              <div key={item.model} className="bg-accent rounded-lg p-3">
                <div className="text-xs text-muted-foreground uppercase truncate">{item.model}</div>
                <div className="mt-1 flex h-40 items-center justify-center overflow-hidden">
                  <ChartContainer
                    className="flex h-full w-full items-center justify-center"
                    config={{ ratio: { label: "Ratio", color: gaugeColor(ratio) } }}
                  >
                    <RadialBarChart
                      width={180}
                      height={180}
                      data={gaugeData}
                      startAngle={90}
                      endAngle={-270}
                      innerRadius="62%"
                      outerRadius="88%"
                    >
                      <PolarAngleAxis type="number" domain={[0, 200]} tick={false} />
                      <RadialBar background dataKey="value" cornerRadius={6} />
                    </RadialBarChart>
                  </ChartContainer>
                </div>
                <div className="font-display text-lg whitespace-nowrap">{ratio.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  Stock: {item.inStock} | Safety: {item.safetyStock}
                </div>
              </div>
            );
          })}
        </div>
      </DashboardCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard
          title="COST WATERFALL TO GROSS PROFIT"
          addon={<InfoHint text="Breaks down revenue into COGS and shipping to show resulting gross profit." />}
        >
          <div className="bg-accent rounded-lg p-3 w-full">
            <div className="w-full h-72">
              <ChartContainer
                className="w-full h-full"
                config={{ value: { label: "VND", color: "var(--chart-1)" } }}
              >
                <BarChart data={waterfall} margin={{ left: -12, right: 12, top: 12, bottom: 12 }}>
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="8 8"
                    strokeWidth={2}
                    stroke="var(--muted-foreground)"
                    opacity={0.3}
                  />
                  <XAxis dataKey="name" tickLine={false} className="text-sm fill-muted-foreground" />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={formatVnd} className="text-sm fill-muted-foreground" />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <ChartTooltip
                    cursor={false}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const row = payload[0].payload;
                      return (
                        <div className="border-border/50 bg-background rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                          <div className="font-medium">{row.name}</div>
                          <div className="text-muted-foreground">{formatVndFull(Math.abs(row.value))}</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="value" radius={4}>
                    {waterfall.map((item, index) => (
                      <Cell key={index} fill={item.value >= 0 ? CHART_COLORS[1] : CHART_COLORS[4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="MONTHLY GROSS MARGIN %"
          addon={<InfoHint text="Tracks gross margin percentage by month to spot profitability trend changes." />}
        >
          <div className="flex items-center gap-6 mb-3">
            <ChartLegend label="Gross margin %" color="var(--chart-2)" />
          </div>
          <div className="bg-accent rounded-lg p-3 w-full">
            <div className="w-full h-72">
              <ChartContainer className="w-full h-full" config={marginLineConfig}>
                <AreaChart data={data.marginByMonth} margin={{ left: -12, right: 12, top: 12, bottom: 12 }}>
                  <defs>
                    <linearGradient id="fillMargin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-marginPct)" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="var(--color-marginPct)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="8 8"
                    strokeWidth={2}
                    stroke="var(--muted-foreground)"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(value) => String(value).slice(5)}
                    tickLine={false}
                    className="text-sm fill-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                    className="text-sm fill-muted-foreground"
                  />
                  <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" formatter={(value) => `${Number(value).toFixed(1)}%`} />}
                  />
                  <Area
                    dataKey="marginPct"
                    type="linear"
                    fill="url(#fillMargin)"
                    stroke="var(--color-marginPct)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}

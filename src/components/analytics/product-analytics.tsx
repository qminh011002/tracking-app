import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import DashboardCard from "@/components/dashboard/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bullet } from "@/components/ui/bullet";
import type { ProductAnalyticsData, SalesOverviewData } from "@/src/services/analytics";
import { CHART_COLORS, formatVnd, formatVndFull } from "./format";
import InfoHint from "./info-hint";

export default function ProductAnalytics({
  data,
  salesData,
}: {
  data: ProductAnalyticsData | undefined;
  salesData: SalesOverviewData | undefined;
}) {
  if (!data) {
    return (
      <div className="rounded-lg border border-border/60 bg-card px-4 py-10 text-center text-muted-foreground uppercase">
        Loading data...
      </div>
    );
  }

  const top10 = data.topProducts.slice(0, 10);

  const barData = top10.map((item) => ({
    ...item,
    quantityScaled: item.quantity * 100000,
  }));

  const brandDonut = (salesData?.revenueByBrand ?? []).map((item, index) => ({
    name: item.brand,
    value: item.revenue,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const topProductConfig = {
    revenue: { label: "Revenue", color: "var(--chart-1)" },
    quantityScaled: { label: "Units", color: "var(--chart-3)" },
  } satisfies ChartConfig;

  const scatterConfig = {
    avgPrice: { label: "Price", color: "var(--chart-2)" },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard
          title="TOP 10 BEST-SELLING PRODUCTS (UNITS + REVENUE)"
          addon={<InfoHint text="Ranks SKUs by sales performance. This chart overlays revenue and scaled unit volume for each top SKU." />}
        >
          <div className="bg-accent rounded-lg p-3 w-full">
            <div className="w-full h-96">
              <ChartContainer className="w-full h-full" config={topProductConfig}>
                <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 12, top: 12, bottom: 12 }}>
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="8 8"
                    strokeWidth={2}
                    stroke="var(--muted-foreground)"
                    opacity={0.3}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={formatVnd}
                    tickLine={false}
                    className="text-sm fill-muted-foreground"
                  />
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
                          <div className="text-muted-foreground">Units: {row.quantity}</div>
                          <div className="text-muted-foreground">Revenue: {formatVndFull(row.revenue)}</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                  <Bar dataKey="quantityScaled" fill="var(--color-quantityScaled)" radius={4} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="PRICE VS UNITS SCATTER (BUBBLE SIZE = REVENUE)"
          addon={<InfoHint text="Each point is a SKU. X-axis is average selling price, Y-axis is sold quantity, bubble size is revenue." />}
        >
          <div className="bg-accent rounded-lg p-3 w-full">
            <div className="w-full h-96">
              <ChartContainer className="w-full h-full" config={scatterConfig}>
                <ScatterChart margin={{ left: -12, right: 12, top: 12, bottom: 12 }}>
                  <CartesianGrid
                    strokeDasharray="8 8"
                    strokeWidth={2}
                    stroke="var(--muted-foreground)"
                    opacity={0.3}
                  />
                  <XAxis
                    type="number"
                    dataKey="avgPrice"
                    tickFormatter={formatVnd}
                    tickLine={false}
                    className="text-sm fill-muted-foreground"
                  />
                  <YAxis
                    type="number"
                    dataKey="quantity"
                    tickLine={false}
                    axisLine={false}
                    className="text-sm fill-muted-foreground"
                  />
                  <ZAxis dataKey="revenue" range={[60, 460]} />
                  <ChartTooltip
                    cursor={false}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const row = payload[0].payload;
                      return (
                        <div className="border-border/50 bg-background rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                          <div className="font-medium">{row.model}</div>
                          <div className="text-muted-foreground">Avg price: {formatVndFull(row.avgPrice)}</div>
                          <div className="text-muted-foreground">Units: {row.quantity}</div>
                          <div className="text-muted-foreground">Revenue: {formatVndFull(row.revenue)}</div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={data.priceVsQuantity}>
                    {data.priceVsQuantity.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} fillOpacity={0.74} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ChartContainer>
            </div>
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <DashboardCard
          title="REVENUE SHARE BY BRAND"
          addon={<InfoHint text="Shows brand-level revenue contribution so you can evaluate portfolio concentration." />}
        >
          <div className="bg-accent rounded-lg p-3 w-full">
            <div className="w-full h-80">
              <ChartContainer className="w-full h-full" config={{}}>
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const item = payload[0];
                      return (
                        <div className="border-border/50 bg-background rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-muted-foreground">{formatVndFull(Number(item.value))}</div>
                        </div>
                      );
                    }}
                  />
                  <Pie
                    data={brandDonut}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={110}
                    paddingAngle={2}
                  >
                    {brandDonut.map((item, index) => (
                      <Cell key={index} fill={item.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {brandDonut.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5 uppercase">
                <Bullet style={{ backgroundColor: item.fill }} className="rotate-45" />
                <span className="text-sm font-medium text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}

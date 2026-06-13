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
        Đang tải dữ liệu...
      </div>
    );
  }

  const top10 = data.topProducts.slice(0, 10);

  const brandsByRevenue = salesData?.revenueByBrand ?? [];

  const brandDonut = brandsByRevenue.map((item, index) => ({
    name: item.brand,
    value: item.revenue,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  // Brands ranked by units sold (orders), with avg price for context.
  const brandUnits = [...brandsByRevenue]
    .map((item, index) => ({
      brand: item.brand,
      units: item.orders,
      revenue: item.revenue,
      avgPrice: item.orders > 0 ? item.revenue / item.orders : 0,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }))
    .sort((a, b) => b.units - a.units);

  const totalBrandUnits = brandUnits.reduce((sum, item) => sum + item.units, 0);

  const topProductConfig = {
    revenue: { label: "Doanh thu", color: "var(--chart-1)" },
    quantity: { label: "Số lượng", color: "var(--chart-3)" },
  } satisfies ChartConfig;

  const scatterConfig = {
    avgPrice: { label: "Giá", color: "var(--chart-2)" },
  } satisfies ChartConfig;

  const brandUnitsConfig = {
    units: { label: "Số lượng đã bán", color: "var(--chart-3)" },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard
          title="TOP 10 SẢN PHẨM BÁN CHẠY NHẤT (SỐ LƯỢNG + DOANH THU)"
          addon={<InfoHint text="Xếp hạng SKU theo hiệu suất bán hàng. Doanh thu dùng trục dưới (VND); số lượng đã bán dùng trục trên." />}
        >
          <div className="bg-accent rounded-lg p-3 w-full">
            <div className="w-full h-96">
              <ChartContainer className="w-full h-full" config={topProductConfig}>
                <BarChart data={top10} layout="vertical" margin={{ left: 10, right: 12, top: 12, bottom: 12 }}>
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="8 8"
                    strokeWidth={2}
                    stroke="var(--muted-foreground)"
                    opacity={0.3}
                  />
                  <XAxis
                    xAxisId="revenue"
                    type="number"
                    tickFormatter={formatVnd}
                    tickLine={false}
                    className="text-sm fill-muted-foreground"
                  />
                  <XAxis
                    xAxisId="units"
                    type="number"
                    orientation="top"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
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
                          <div className="text-muted-foreground">Số lượng: {row.quantity}</div>
                          <div className="text-muted-foreground">Doanh thu: {formatVndFull(row.revenue)}</div>
                        </div>
                      );
                    }}
                  />
                  <Bar xAxisId="revenue" dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                  <Bar xAxisId="units" dataKey="quantity" fill="var(--color-quantity)" radius={4} barSize={8} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="GIÁ SO VỚI SỐ LƯỢNG (KÍCH THƯỚC BONG BÓNG = DOANH THU)"
          addon={<InfoHint text="Mỗi điểm là một SKU. Trục X là giá bán trung bình, trục Y là số lượng đã bán, kích thước bong bóng là doanh thu." />}
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
                          <div className="text-muted-foreground">Giá TB: {formatVndFull(row.avgPrice)}</div>
                          <div className="text-muted-foreground">Số lượng: {row.quantity}</div>
                          <div className="text-muted-foreground">Doanh thu: {formatVndFull(row.revenue)}</div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard
          title="TỶ TRỌNG DOANH THU THEO THƯƠNG HIỆU"
          addon={<InfoHint text="Hiển thị đóng góp doanh thu theo từng thương hiệu để bạn có thể đánh giá mức độ tập trung danh mục." />}
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

        <DashboardCard
          title="SỐ LƯỢNG ĐÃ BÁN THEO THƯƠNG HIỆU"
          addon={<InfoHint text="Số lượng mỗi thương hiệu đã bán trong kỳ, được xếp hạng. Di chuột để xem doanh thu và giá bán trung bình." />}
        >
          <div className="bg-accent rounded-lg p-3 w-full">
            <div className="w-full h-80">
              <ChartContainer className="w-full h-full" config={brandUnitsConfig}>
                <BarChart data={brandUnits} layout="vertical" margin={{ left: 10, right: 12, top: 12, bottom: 12 }}>
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="8 8"
                    strokeWidth={2}
                    stroke="var(--muted-foreground)"
                    opacity={0.3}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    className="text-sm fill-muted-foreground"
                  />
                  <YAxis
                    type="category"
                    dataKey="brand"
                    width={110}
                    tickLine={false}
                    className="text-sm fill-muted-foreground"
                    tickFormatter={(value) =>
                      String(value).length > 16 ? `${String(value).slice(0, 16)}...` : String(value)
                    }
                  />
                  <ChartTooltip
                    cursor={false}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const row = payload[0].payload;
                      const share =
                        totalBrandUnits > 0 ? ((row.units / totalBrandUnits) * 100).toFixed(1) : "0";
                      return (
                        <div className="border-border/50 bg-background rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                          <div className="font-medium">{row.brand}</div>
                          <div className="text-muted-foreground">Số lượng: {row.units} ({share}%)</div>
                          <div className="text-muted-foreground">Doanh thu: {formatVndFull(row.revenue)}</div>
                          <div className="text-muted-foreground">Giá TB: {formatVndFull(row.avgPrice)}</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="units" radius={4}>
                    {brandUnits.map((item, index) => (
                      <Cell key={index} fill={item.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}

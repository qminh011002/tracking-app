import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import DashboardCard from "@/components/dashboard/card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ChartLegend } from "@/components/dashboard/chart";
import { Bullet } from "@/components/ui/bullet";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import DashboardOdometer from "@/components/dashboard/odometer";
import {
  estimateTax,
  forecastTax,
  getNextDeadline,
  PIT_RATE,
  TAX_FREE_THRESHOLD,
  TOTAL_TAX_RATE,
  VAT_RATE,
} from "@/src/lib/tax-calculator";
import type { SalesOverviewData } from "@/src/services/analytics";
import { formatVnd, formatVndFull } from "./format";
import InfoHint from "./info-hint";

const MONTH_LABELS = [
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
  "T10",
  "T11",
  "T12",
];

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDeadlineDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export default function TaxDashboard({
  salesData,
}: {
  salesData: SalesOverviewData | undefined;
}) {
  // Doanh thu thực tế từng tháng (từ đầu năm tới hiện tại).
  const monthlyRevenue = useMemo(() => {
    const arr = new Array(12).fill(0) as number[];
    (salesData?.revenueByDate ?? []).forEach((item) => {
      const m = Number(item.date.slice(5, 7));
      if (m >= 1 && m <= 12) arr[m - 1] += item.revenue;
    });
    return arr;
  }, [salesData]);

  const currentMonth = useMemo(() => {
    const lastWithData = monthlyRevenue.reduce(
      (last, value, idx) => (value > 0 ? idx + 1 : last),
      0,
    );
    return Math.max(new Date().getMonth() + 1, lastWithData, 1);
  }, [monthlyRevenue]);

  const forecast = useMemo(
    () => forecastTax(monthlyRevenue, currentMonth),
    [monthlyRevenue, currentMonth],
  );

  // Cho phép người dùng tự điều chỉnh doanh thu cả năm để xem thử thuế.
  const [scenarioRevenue, setScenarioRevenue] = useState<number | null>(null);
  const annualRevenue = scenarioRevenue ?? forecast.projectedAnnualRevenue;
  const annualTax = useMemo(() => estimateTax(annualRevenue), [annualRevenue]);
  const isScenario = scenarioRevenue !== null;

  const nextDeadline = useMemo(() => getNextDeadline(new Date()), []);

  const progressPct = Math.min(
    (forecast.ytdRevenue / TAX_FREE_THRESHOLD) * 100,
    100,
  );
  const projectedPct = Math.min(
    (forecast.projectedAnnualRevenue / TAX_FREE_THRESHOLD) * 100,
    100,
  );

  const chartData = forecast.cumulativeByMonth.map((p) => ({
    month: MONTH_LABELS[p.month - 1],
    actual: p.isActual ? p.cumulative : null,
    // Nối liền đường dự báo với đường thực tế tại tháng hiện tại.
    forecast:
      p.month >= forecast.currentMonth ? p.cumulative : null,
  }));

  const chartConfig = {
    actual: { label: "Doanh thu thực tế", color: "var(--chart-1)" },
    forecast: { label: "Dự báo", color: "var(--chart-3)" },
  } satisfies ChartConfig;

  const exempt = annualTax.isExempt;

  return (
    <div className="space-y-8">
      {/* Giải thích luật — ngắn gọn */}
      <DashboardCard
        title="CÁCH TÍNH THUẾ HỘ KINH DOANH 2026"
        intent="default"
        addon={
          <InfoHint text="Hộ kinh doanh bán hàng hóa, áp dụng từ 01/01/2026. Thuế tính trên doanh thu (tổng tiền bán ra), không phải trên lợi nhuận." />
        }
      >
        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <div className="bg-accent rounded-lg p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ngưỡng miễn thuế
            </div>
            <div className="font-display mt-1 text-lg">
              {formatVndFull(TAX_FREE_THRESHOLD)} / năm
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Doanh thu cả năm ≤ 500 triệu thì <b>không phải nộp thuế</b>.
            </p>
          </div>
          <div className="bg-accent rounded-lg p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Thuế suất khi vượt ngưỡng
            </div>
            <div className="font-display mt-1 text-lg">
              {formatPct(TOTAL_TAX_RATE)} trên doanh thu
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Gồm GTGT {formatPct(VAT_RATE)} + TNCN {formatPct(PIT_RATE)}.
            </p>
          </div>
          <div className="bg-accent rounded-lg p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Kỳ kê khai
            </div>
            <div className="font-display mt-1 text-lg">Theo quý</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Hạn nộp: cuối tháng đầu của quý kế tiếp.
            </p>
          </div>
        </div>
      </DashboardCard>

      {/* Tình trạng + dự báo chính */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          className={`relative overflow-hidden lg:col-span-1 ${exempt ? "ring-2 ring-success/30" : "ring-2 ring-destructive/30"}`}
        >
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2.5">
              <Bullet variant={exempt ? "success" : "destructive"} />
              TÌNH TRẠNG THUẾ
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-accent flex-1 pt-2 md:pt-4">
            {exempt ? (
              <>
                <Badge variant="outline-success" className="text-sm">
                  Được miễn thuế
                </Badge>
                <p className="mt-3 text-sm text-muted-foreground">
                  Doanh thu {isScenario ? "giả định" : "dự báo cả năm"} chưa vượt
                  ngưỡng 500 triệu nên chưa phát sinh thuế.
                </p>
              </>
            ) : (
              <>
                <Badge variant="destructive" className="text-sm">
                  Phải nộp thuế
                </Badge>
                <div className="mt-3 flex flex-nowrap items-end gap-1 whitespace-nowrap">
                  <DashboardOdometer
                    value={Math.round(annualTax.total)}
                    className="text-3xl md:text-4xl"
                  />
                  <span className="shrink-0 text-sm">VND</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tổng thuế {isScenario ? "theo doanh thu giả định" : "dự báo cả năm"}
                  {" "}({formatPct(annualTax.effectiveRate)} doanh thu)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2.5">
              <Bullet />DOANH THU ĐẾN NAY
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-accent flex-1 pt-2 md:pt-4">
            <div className="flex flex-nowrap items-end gap-1 whitespace-nowrap">
              <DashboardOdometer
                value={Math.round(forecast.ytdRevenue)}
                className="text-3xl md:text-4xl"
              />
              <span className="shrink-0 text-sm">VND</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Lũy kế tới tháng {forecast.currentMonth}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2.5">
              <Bullet />DỰ BÁO CẢ NĂM
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-accent flex-1 pt-2 md:pt-4">
            <div className="flex flex-nowrap items-end gap-1 whitespace-nowrap">
              <DashboardOdometer
                value={Math.round(forecast.projectedAnnualRevenue)}
                className="text-3xl md:text-4xl"
              />
              <span className="shrink-0 text-sm">VND</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Theo nhịp ~{formatVnd(forecast.monthlyRunRate)}/tháng
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Thanh tiến độ tới ngưỡng */}
      <DashboardCard
        title="TIẾN ĐỘ TỚI NGƯỠNG 500 TRIỆU"
        addon={
          <InfoHint text="So sánh doanh thu thực tế và dự báo cả năm với ngưỡng miễn thuế 500 triệu." />
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Thực tế đến nay</span>
              <span className="font-display">
                {formatVnd(forecast.ytdRevenue)} / {formatVnd(TAX_FREE_THRESHOLD)}
              </span>
            </div>
            <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
              <div
                className={`h-full ${forecast.alreadyExceeded ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Dự báo cả năm</span>
              <span className="font-display">
                {formatVnd(forecast.projectedAnnualRevenue)} /{" "}
                {formatVnd(TAX_FREE_THRESHOLD)}
              </span>
            </div>
            <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
              <div
                className={`h-full ${forecast.willExceedThreshold ? "bg-destructive" : "bg-success"}`}
                style={{ width: `${projectedPct}%` }}
              />
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Khi nào phải đóng + đóng bao nhiêu */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardCard
          title="KHI NÀO PHẢI ĐÓNG THUẾ?"
          addon={
            <InfoHint text="Thời điểm doanh thu lũy kế chạm ngưỡng 500 triệu và mốc nộp tờ khai gần nhất." />
          }
        >
          <div className="space-y-4">
            <div className="bg-accent rounded-lg p-4">
              {forecast.alreadyExceeded ? (
                <p className="text-sm">
                  ⚠️ Doanh thu đã <b>vượt ngưỡng 500 triệu</b>
                  {forecast.crossingMonth
                    ? ` từ tháng ${forecast.crossingMonth}`
                    : ""}
                  . Đã phát sinh nghĩa vụ thuế — cần kê khai và nộp theo quý.
                </p>
              ) : forecast.willExceedThreshold && forecast.crossingMonth ? (
                <p className="text-sm">
                  Dự kiến doanh thu lũy kế sẽ <b>chạm ngưỡng vào tháng{" "}
                  {forecast.crossingMonth}</b>. Từ thời điểm đó bạn bắt đầu phát
                  sinh thuế và phải kê khai cho quý tương ứng.
                </p>
              ) : (
                <p className="text-sm">
                  ✅ Dự báo cả năm <b>không vượt ngưỡng 500 triệu</b> — chưa phải
                  nộp thuế. Còn khoảng{" "}
                  <b>{formatVnd(forecast.remainingToThreshold)}</b> doanh thu nữa
                  mới chạm ngưỡng.
                </p>
              )}
            </div>

            {nextDeadline && (
              <div className="bg-accent rounded-lg p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Mốc kê khai gần nhất
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {nextDeadline.title}
                  </span>
                  <Badge variant="outline-warning" className="text-[10px]">
                    {formatDeadlineDate(nextDeadline.dueDate)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {nextDeadline.description}
                </p>
              </div>
            )}
          </div>
        </DashboardCard>

        <DashboardCard
          title="ĐÓNG BAO NHIÊU?"
          addon={
            <InfoHint text="Chi tiết thuế GTGT, TNCN và tổng thuế theo doanh thu cả năm." />
          }
        >
          <div className="space-y-3">
            <div className="bg-accent grid grid-cols-3 gap-3 rounded-lg p-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  GTGT (1%)
                </div>
                <div className="font-display mt-1 text-lg">
                  {formatVnd(annualTax.vat)}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  TNCN (0,5%)
                </div>
                <div className="font-display mt-1 text-lg">
                  {formatVnd(annualTax.pit)}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tổng (1,5%)
                </div>
                <div className="font-display mt-1 text-lg text-primary">
                  {formatVnd(annualTax.total)}
                </div>
              </div>
            </div>

            <div className="bg-accent rounded-lg p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Đã phát sinh đến nay (lũy kế tháng {forecast.currentMonth})
              </div>
              <div className="font-display mt-1 text-xl">
                {formatVnd(forecast.ytdTax.total)}
              </div>
              {forecast.ytdTax.isExempt && (
                <Badge variant="outline-success" className="mt-2">
                  Chưa phát sinh thuế
                </Badge>
              )}
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Biểu đồ doanh thu lũy kế + ngưỡng */}
      <DashboardCard
        title="DOANH THU LŨY KẾ THEO THÁNG"
        addon={
          <InfoHint text="Đường liền là doanh thu thực tế, đường nét đứt là dự báo. Đường đỏ là ngưỡng 500 triệu." />
        }
      >
        <div className="mb-3 flex items-center gap-6">
          {Object.entries(chartConfig).map(([key, value]) => (
            <ChartLegend
              key={key}
              label={String(value.label)}
              color={String(value.color)}
            />
          ))}
        </div>
        <div className="bg-accent w-full rounded-lg p-3">
          <div className="h-72 w-full">
            <ChartContainer className="h-full w-full" config={chartConfig}>
              <AreaChart
                data={chartData}
                margin={{ left: -12, right: 12, top: 12, bottom: 12 }}
              >
                <CartesianGrid
                  horizontal={false}
                  strokeDasharray="8 8"
                  strokeWidth={2}
                  stroke="var(--muted-foreground)"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  className="fill-muted-foreground text-sm"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatVnd}
                  className="fill-muted-foreground text-sm"
                />
                <ReferenceLine
                  y={TAX_FREE_THRESHOLD}
                  stroke="var(--destructive)"
                  strokeDasharray="4 4"
                  label={{
                    value: "Ngưỡng 500tr",
                    position: "insideTopRight",
                    fill: "var(--destructive)",
                    fontSize: 11,
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      formatter={(value) => formatVndFull(Number(value))}
                    />
                  }
                />
                <Area
                  dataKey="actual"
                  type="linear"
                  fill="transparent"
                  stroke="var(--color-actual)"
                  strokeWidth={2.4}
                  connectNulls
                />
                <Area
                  dataKey="forecast"
                  type="linear"
                  fill="transparent"
                  stroke="var(--color-forecast)"
                  strokeWidth={2.4}
                  strokeDasharray="5 5"
                  connectNulls
                />
              </AreaChart>
            </ChartContainer>
          </div>
        </div>
      </DashboardCard>

      {/* Thử nghiệm: tự điều chỉnh doanh thu cả năm */}
      <DashboardCard
        title="THỬ TÍNH THUẾ THEO DOANH THU GIẢ ĐỊNH"
        intent="default"
        addon={
          <InfoHint text="Kéo thanh trượt để xem nếu doanh thu cả năm thay đổi thì thuế phải nộp là bao nhiêu." />
        }
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Doanh thu cả năm
              </span>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm">
                  {formatVndFull(annualRevenue)}
                </span>
                {isScenario && (
                  <button
                    type="button"
                    onClick={() => setScenarioRevenue(null)}
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Về dự báo
                  </button>
                )}
              </div>
            </div>
            <Slider
              value={[annualRevenue]}
              onValueChange={([value]) => setScenarioRevenue(value)}
              min={0}
              max={Math.max(2_000_000_000, forecast.projectedAnnualRevenue * 1.5)}
              step={10_000_000}
            />
          </div>

          <div className="bg-accent grid grid-cols-2 gap-3 rounded-lg p-4 lg:grid-cols-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tình trạng
              </div>
              <div className="mt-1">
                {annualTax.isExempt ? (
                  <Badge variant="outline-success">Miễn thuế</Badge>
                ) : (
                  <Badge variant="destructive">Phải nộp</Badge>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                GTGT
              </div>
              <div className="font-display text-lg">
                {formatVnd(annualTax.vat)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                TNCN
              </div>
              <div className="font-display text-lg">
                {formatVnd(annualTax.pit)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tổng thuế
              </div>
              <div className="font-display text-xl text-primary">
                {formatVnd(annualTax.total)}
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}

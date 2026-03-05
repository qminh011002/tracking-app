import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DashboardOdometer from "@/components/dashboard/odometer";
import {
  calculateFullTax,
  DEFAULT_TAX_CONFIG,
  type TaxConfig,
  type TaxSummary,
} from "@/src/lib/tax-calculator";
import type { SalesOverviewData } from "@/src/services/analytics";
import { CHART_COLORS, formatVnd, formatVndFull } from "./format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import InfoHint from "./info-hint";

type PitMode = "auto" | "method1" | "method2";

function getSelectedPit(tax: TaxSummary, pitMode: PitMode) {
  if (pitMode === "method2") return tax.pitMethod2.pitPayable;
  if (pitMode === "method1") {
    if (!tax.pitMethod1.applicable) return tax.pitMethod2.pitPayable;
    return tax.pitMethod1.pitPayable;
  }
  return tax.recommendedPit;
}

function getSelectedPitMethod(tax: TaxSummary, pitMode: PitMode): 1 | 2 {
  if (pitMode === "method2") return 2;
  if (pitMode === "method1") return tax.pitMethod1.applicable ? 1 : 2;
  return tax.recommendedPitMethod;
}

function ThresholdIndicator({
  label,
  current,
  threshold,
}: {
  label: string;
  current: number;
  threshold: number;
}) {
  const pct = Math.min((current / threshold) * 100, 100);
  const over = current >= threshold;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-display text-sm">{formatVnd(current)}</span>
          <span className="text-xs text-muted-foreground">/ {formatVnd(threshold)}</span>
          {over ? (
            <Badge variant="destructive" className="text-[10px] px-1.5">
              Threshold hit
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] px-1.5">
              Below threshold
            </Badge>
          )}
        </div>
      </div>
      <div className={`h-2.5 w-full rounded-full bg-muted overflow-hidden ${over ? "ring-1 ring-destructive" : ""}`}>
        <div
          className={`h-full ${over ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function TaxDashboard({
  salesData,
}: {
  salesData: SalesOverviewData | undefined;
}) {
  const actualRevenue = salesData?.totalRevenue ?? 0;
  const actualCost = salesData?.totalCost ?? 0;

  const platformRevenue = useMemo(() => {
    const txs = salesData?.transactions ?? [];
    return txs
      .filter((tx) => ["shopee", "lazada", "tiktok_shop"].includes(tx.channel))
      .reduce((sum, tx) => sum + tx.revenue, 0);
  }, [salesData]);

  const [scenarioRevenue, setScenarioRevenue] = useState<number | null>(null);
  const [deductibleExpenses, setDeductibleExpenses] = useState<number>(actualCost);
  const [bhxhEnabled, setBhxhEnabled] = useState(false);
  const [bhxhBaseSalary, setBhxhBaseSalary] = useState(4_960_000);
  const [vatDeductedByPlatform, setVatDeductedByPlatform] = useState(true);
  const [pitMode, setPitMode] = useState<PitMode>("auto");

  useEffect(() => {
    if (actualCost > 0) {
      setDeductibleExpenses((prev) => (prev === 0 ? actualCost : prev));
    }
  }, [actualCost]);

  const revenue = scenarioRevenue ?? actualRevenue;
  const platformRatio = actualRevenue > 0 ? platformRevenue / actualRevenue : 0;
  const platformVatDeductedAmount = vatDeductedByPlatform
    ? revenue * platformRatio * DEFAULT_TAX_CONFIG.vatRate
    : 0;

  const taxConfig: TaxConfig = useMemo(
    () => ({
      ...DEFAULT_TAX_CONFIG,
      bhxhEnabled,
      bhxhBaseSalary,
      platformVatDeducted: platformVatDeductedAmount,
    }),
    [bhxhEnabled, bhxhBaseSalary, platformVatDeductedAmount],
  );

  const baseTax: TaxSummary = useMemo(
    () => calculateFullTax(revenue, deductibleExpenses, taxConfig),
    [revenue, deductibleExpenses, taxConfig],
  );

  const selectedPit = getSelectedPit(baseTax, pitMode);
  const selectedPitMethod = getSelectedPitMethod(baseTax, pitMode);
  const totalObligation = baseTax.vat.vatPayable + selectedPit + baseTax.bhxh.annualAmount;
  const netIncomeAfterTax = revenue - deductibleExpenses - totalObligation;

  const monthlyData = useMemo(() => {
    const byDate = salesData?.revenueByDate ?? [];
    const monthRevenueMap = new Map<number, number>();

    byDate.forEach((item) => {
      const month = Number(item.date.slice(5, 7));
      monthRevenueMap.set(month, (monthRevenueMap.get(month) ?? 0) + item.revenue);
    });

    const currentMonth = Math.max(1, ...Array.from(monthRevenueMap.keys()));
    const recentMonths = [currentMonth - 2, currentMonth - 1, currentMonth]
      .filter((m) => m > 0)
      .map((m) => monthRevenueMap.get(m) ?? 0)
      .filter((v) => v > 0);
    const avgRecent = recentMonths.length > 0 ? recentMonths.reduce((a, b) => a + b, 0) / recentMonths.length : 0;

    const seasonality = [1.0, 0.95, 0.98, 1.0, 1.0, 1.02, 1.06, 1.12, 1.1, 1.08, 1.3, 1.42];

    const baseProjection = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const actual = monthRevenueMap.get(month);
      if (actual !== undefined) return actual;
      return avgRecent * seasonality[index];
    });

    const baseProjectedAnnual = baseProjection.reduce((sum, value) => sum + value, 0);
    const scaling = baseProjectedAnnual > 0 ? revenue / baseProjectedAnnual : 1;
    const expenseRatio = revenue > 0 ? deductibleExpenses / revenue : 0;

    let cumRevenue = 0;
    let cumExpense = 0;

    return baseProjection.map((value, index) => {
      const month = index + 1;
      const scaledRevenue = value * scaling;
      cumRevenue += scaledRevenue;
      cumExpense += scaledRevenue * expenseRatio;

      const configForMonth: TaxConfig = {
        ...taxConfig,
        platformVatDeducted: vatDeductedByPlatform
          ? cumRevenue * platformRatio * taxConfig.vatRate
          : 0,
      };

      const monthTax = calculateFullTax(cumRevenue, cumExpense, configForMonth);
      const pit = getSelectedPit(monthTax, pitMode);
      const totalTax = monthTax.vat.vatPayable + pit + monthTax.bhxh.annualAmount;

      const isActual = month <= currentMonth;
      return {
        month: `M${month}`,
        totalTax,
        totalTaxActual: isActual ? totalTax : null,
        totalTaxForecast: !isActual || month === currentMonth ? totalTax : null,
      };
    });
  }, [
    deductibleExpenses,
    pitMode,
    platformRatio,
    revenue,
    salesData?.revenueByDate,
    taxConfig,
    vatDeductedByPlatform,
  ]);

  const donutData = [
    { name: "VAT", value: baseTax.vat.vatPayable, fill: CHART_COLORS[0] },
    { name: `PIT (Method ${selectedPitMethod})`, value: selectedPit, fill: CHART_COLORS[1] },
    { name: "Social insurance", value: baseTax.bhxh.annualAmount, fill: CHART_COLORS[2] },
  ].filter((item) => item.value > 0);

  const pitCompareData = [
    {
      method: "Method 1 (% of excess revenue)",
      amount: baseTax.pitMethod1.pitPayable,
      recommended: baseTax.recommendedPitMethod === 1,
      selected: selectedPitMethod === 1,
    },
    {
      method: "Method 2 (taxable income)",
      amount: baseTax.pitMethod2.pitPayable,
      recommended: baseTax.recommendedPitMethod === 2,
      selected: selectedPitMethod === 2,
    },
  ];

  const otherCost = Math.max(0, deductibleExpenses - actualCost);
  const waterfallData = [
    { name: "Revenue", value: revenue },
    { name: "COGS", value: -actualCost },
    { name: "Other costs", value: -otherCost },
    { name: "VAT", value: -baseTax.vat.vatPayable },
    { name: `PIT M${selectedPitMethod}`, value: -selectedPit },
    { name: "Social insurance", value: -baseTax.bhxh.annualAmount },
    { name: "Net income", value: netIncomeAfterTax },
  ];

  const cumTaxConfig = {
    totalTaxActual: { label: "Cumulative tax (actual)", color: "var(--chart-5)" },
    totalTaxForecast: { label: "Cumulative tax (forecast)", color: "var(--chart-3)" },
  } satisfies ChartConfig;

  return (
    <div className="space-y-8">
      <DashboardCard
        title="2026 TAX THRESHOLDS"
        intent="default"
        addon={<InfoHint text="Revenue threshold indicators for VAT (200M) and PIT (500M)." />}
      >
        <div className="space-y-4">
          <ThresholdIndicator label="VAT threshold (200M)" current={revenue} threshold={200_000_000} />
          <ThresholdIndicator label="PIT threshold (500M)" current={revenue} threshold={500_000_000} />
        </div>
      </DashboardCard>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2.5"><Bullet />ANNUAL REVENUE</CardTitle>
          </CardHeader>
          <CardContent className="bg-accent relative flex-1 overflow-clip pt-2 md:pt-4">
            <DashboardOdometer value={Math.round(revenue)} />
            <span className="text-sm">VND</span>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2.5"><Bullet />VAT PAYABLE</CardTitle>
          </CardHeader>
          <CardContent className="bg-accent relative flex-1 overflow-clip pt-2 md:pt-4">
            <DashboardOdometer value={Math.round(baseTax.vat.vatPayable)} />
            <span className="text-sm">VND</span>
            {baseTax.vat.isExempt && <Badge variant="outline-success" className="mt-1">EXEMPT</Badge>}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2.5">
              <Bullet />PIT PAYABLE
              <Badge variant="outline" className="text-[9px]">METHOD {selectedPitMethod}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-accent relative flex-1 overflow-clip pt-2 md:pt-4">
            <DashboardOdometer value={Math.round(selectedPit)} />
            <span className="text-sm">VND</span>
            {revenue <= DEFAULT_TAX_CONFIG.pitThreshold && (
              <Badge variant="outline-success" className="mt-1">EXEMPT</Badge>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2.5"><Bullet />SOCIAL INSURANCE</CardTitle>
          </CardHeader>
          <CardContent className="bg-accent relative flex-1 overflow-clip pt-2 md:pt-4">
            <DashboardOdometer value={Math.round(baseTax.bhxh.annualAmount)} />
            <span className="text-sm">VND</span>
            {!bhxhEnabled && <Badge variant="secondary" className="mt-1">OFF</Badge>}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden ring-2 ring-primary/30">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2.5 text-primary"><Bullet variant="default" />TOTAL OBLIGATION</CardTitle>
          </CardHeader>
          <CardContent className="bg-accent relative flex-1 overflow-clip pt-2 md:pt-4">
            <DashboardOdometer value={Math.round(totalObligation)} />
            <span className="text-sm">VND</span>
            <p className="text-xs font-medium tracking-wide text-muted-foreground mt-1">
              {revenue > 0 ? ((totalObligation / revenue) * 100).toFixed(1) : 0}% of revenue
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard
          title="TAX COMPOSITION"
          addon={<InfoHint text="Breakdown of VAT, PIT, and social insurance in total obligations." />}
        >
          {donutData.length > 0 ? (
            <>
              <div className="bg-accent rounded-lg p-3 w-full">
                <div className="w-full h-64">
                  <ChartContainer className="w-full h-full" config={{}}>
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={({ payload }) => {
                          if (!payload?.length) return null;
                          const row = payload[0];
                          return (
                            <div className="border-border/50 bg-background rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                              <div className="font-medium">{row.name}</div>
                              <div className="text-muted-foreground">{formatVndFull(Number(row.value))}</div>
                            </div>
                          );
                        }}
                      />
                      <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={3}>
                        {donutData.map((row, index) => (
                          <Cell key={index} fill={row.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {donutData.map((row, index) => (
                  <div key={index} className="flex items-center gap-1.5 uppercase">
                    <Bullet style={{ backgroundColor: row.fill }} className="rotate-45" />
                    <span className="text-sm font-medium text-muted-foreground">{row.name}: {formatVnd(row.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-accent rounded-lg flex flex-col items-center justify-center h-64 text-muted-foreground uppercase">
              <Badge variant="outline-success" className="mb-2">No liabilities</Badge>
              <p className="text-sm">No tax generated in this scenario.</p>
            </div>
          )}
        </DashboardCard>

        <DashboardCard
          title="PIT METHOD COMPARISON"
          addon={<InfoHint text="Compares PIT payable between method 1 and method 2. Highlight shows recommendation and selected mode." />}
        >
          <div className="bg-accent rounded-lg p-3 w-full">
            <div className="w-full h-64">
              <ChartContainer
                className="w-full h-full"
                config={{
                  method1: { label: "Method 1", color: "var(--chart-1)" },
                  method2: { label: "Method 2", color: "var(--chart-4)" },
                }}
              >
                <BarChart data={pitCompareData} margin={{ left: -12, right: 12, top: 12, bottom: 12 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="8 8" strokeWidth={2} stroke="var(--muted-foreground)" opacity={0.3} />
                  <XAxis dataKey="method" tickLine={false} className="text-sm fill-muted-foreground" />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={formatVnd} className="text-sm fill-muted-foreground" />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" formatter={(value) => formatVndFull(Number(value))} />}
                  />
                  <Bar dataKey="amount" radius={4}>
                    {pitCompareData.map((row, index) => (
                      <Cell
                        key={index}
                        fill={row.recommended ? CHART_COLORS[1] : CHART_COLORS[3]}
                        stroke={row.selected ? "var(--foreground)" : "transparent"}
                        strokeWidth={row.selected ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </div>
          <div className="text-center mt-2">
            <Badge variant="secondary" className="mr-2">Recommended: Method {baseTax.recommendedPitMethod}</Badge>
            <Badge variant="default">Selected: Method {selectedPitMethod}</Badge>
          </div>
        </DashboardCard>

        <DashboardCard
          title="CUMULATIVE TAX BY MONTH (WITH FORECAST)"
          addon={<InfoHint text="Solid line is realized cumulative tax, dashed line extends projected cumulative tax to year end." />}
        >
          <div className="flex items-center gap-6 mb-3">
            {Object.entries(cumTaxConfig).map(([key, value]) => (
              <ChartLegend key={key} label={String(value.label)} color={String(value.color)} />
            ))}
          </div>
          <div className="bg-accent rounded-lg p-3 w-full">
            <div className="w-full h-64">
              <ChartContainer className="w-full h-full" config={cumTaxConfig}>
                <AreaChart data={monthlyData} margin={{ left: -12, right: 12, top: 12, bottom: 12 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="8 8" strokeWidth={2} stroke="var(--muted-foreground)" opacity={0.3} />
                  <XAxis dataKey="month" tickLine={false} className="text-sm fill-muted-foreground" />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={formatVnd} className="text-sm fill-muted-foreground" />
                  <ReferenceLine y={200_000_000} stroke="var(--destructive)" strokeDasharray="4 4" />
                  <ReferenceLine y={500_000_000} stroke="var(--warning)" strokeDasharray="4 4" />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" formatter={(value) => formatVndFull(Number(value))} />} />
                  <Area dataKey="totalTaxActual" type="linear" fill="transparent" stroke="var(--color-totalTaxActual)" strokeWidth={2.4} />
                  <Area dataKey="totalTaxForecast" type="linear" fill="transparent" stroke="var(--color-totalTaxForecast)" strokeWidth={2.4} strokeDasharray="5 5" />
                </AreaChart>
              </ChartContainer>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="REVENUE -> TAX -> NET INCOME WATERFALL"
          addon={<InfoHint text="Shows the path from revenue through costs and taxes to final net income." />}
        >
          <div className="bg-accent rounded-lg p-3 w-full">
            <div className="w-full h-64">
              <ChartContainer className="w-full h-full" config={{ value: { label: "VND", color: "var(--chart-1)" } }}>
                <BarChart data={waterfallData} margin={{ left: -12, right: 12, top: 12, bottom: 12 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="8 8" strokeWidth={2} stroke="var(--muted-foreground)" opacity={0.3} />
                  <XAxis dataKey="name" tickLine={false} className="text-sm fill-muted-foreground" />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={formatVnd} className="text-sm fill-muted-foreground" />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" formatter={(value) => formatVndFull(Math.abs(Number(value)))} />}
                  />
                  <Bar dataKey="value" radius={4}>
                    {waterfallData.map((row, index) => (
                      <Cell key={index} fill={row.value >= 0 ? CHART_COLORS[1] : CHART_COLORS[4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </DashboardCard>
      </div>

      <DashboardCard
        title="SCENARIO SIMULATOR (WHAT-IF)"
        intent="default"
        addon={<InfoHint text="Adjust revenue and deductible costs to instantly recalculate tax liabilities and net income." />}
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Projected revenue</span>
              <span className="font-display text-sm">{formatVndFull(revenue)}</span>
            </div>
            <Slider
              value={[revenue]}
              onValueChange={([value]) => setScenarioRevenue(value)}
              min={200_000_000}
              max={5_000_000_000}
              step={10_000_000}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Deductible expenses</span>
              <span className="font-display text-sm">{formatVndFull(deductibleExpenses)}</span>
            </div>
            <Slider
              value={[deductibleExpenses]}
              onValueChange={([value]) => setDeductibleExpenses(value)}
              min={0}
              max={Math.max(revenue, 500_000_000)}
              step={10_000_000}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">PIT mode</label>
              <Select value={pitMode} onValueChange={(value) => setPitMode(value as PitMode)}>
                <SelectTrigger className="bg-card border-border/60 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (best recommended)</SelectItem>
                  <SelectItem value="method1">Method 1 (% excess revenue)</SelectItem>
                  <SelectItem value="method2">Method 2 (taxable income x rate)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Platform VAT deducted</label>
              <div className="flex items-center gap-2 h-9">
                <Switch checked={vatDeductedByPlatform} onCheckedChange={setVatDeductedByPlatform} />
                <span className="text-sm font-medium">{vatDeductedByPlatform ? "ON" : "OFF"}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Social insurance</label>
              <div className="flex items-center gap-2 h-9">
                <Switch checked={bhxhEnabled} onCheckedChange={setBhxhEnabled} />
                <span className="text-sm font-medium">{bhxhEnabled ? "ON" : "OFF"}</span>
              </div>
            </div>

            {bhxhEnabled && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Social insurance base salary</label>
                <Input
                  type="number"
                  value={bhxhBaseSalary}
                  onChange={(event) => setBhxhBaseSalary(Number(event.target.value) || 0)}
                  className="bg-card border-border/60"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-accent rounded-lg mt-4">
          <div>
            <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">VAT</div>
            <div className="font-display text-lg">{formatVnd(baseTax.vat.vatPayable)}</div>
          </div>
          <div>
            <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">PIT (M{selectedPitMethod})</div>
            <div className="font-display text-lg">{formatVnd(selectedPit)}</div>
          </div>
          <div>
            <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Social insurance</div>
            <div className="font-display text-lg">{formatVnd(baseTax.bhxh.annualAmount)}</div>
          </div>
          <div>
            <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Net income</div>
            <div className={`font-display text-xl ${netIncomeAfterTax >= 0 ? "text-success" : "text-destructive"}`}>
              {formatVnd(netIncomeAfterTax)}
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}


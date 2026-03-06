import { useSearchParams } from "react-router-dom";
import DashboardPageLayout from "@/components/dashboard/layout";
import { ChartArea } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStoreId } from "@/src/hooks/use-store-id";
import {
  useAnalyticsSalesQuery,
  useAnalyticsProductsQuery,
  useAnalyticsGeoQuery,
  useAnalyticsCustomersQuery,
  useAnalyticsInventoryMarginQuery,
  useProvincesQuery,
} from "@/src/queries/hooks";
import SalesOverview from "@/src/components/analytics/sales-overview";
import ProductAnalytics from "@/src/components/analytics/product-analytics";
import GeoAnalytics from "@/src/components/analytics/geo-analytics";
import CustomerAnalytics from "@/src/components/analytics/customer-analytics";
import InventoryMargin from "@/src/components/analytics/inventory-margin";
import TaxDashboard from "@/src/components/analytics/tax-dashboard";
import TaxCalendar from "@/src/components/analytics/tax-calendar";

type DatePreset = "this_month" | "this_quarter" | "this_year" | "custom";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "this_month", label: "This month" },
  { value: "this_quarter", label: "This quarter" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom" },
];

function formatDateParam(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getPresetRange(preset: Exclude<DatePreset, "custom">) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === "this_month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: formatDateParam(start), to: formatDateParam(today) };
  }

  if (preset === "this_quarter") {
    const qMonth = Math.floor(today.getMonth() / 3) * 3;
    const start = new Date(today.getFullYear(), qMonth, 1);
    return { from: formatDateParam(start), to: formatDateParam(today) };
  }

  // this_year
  const start = new Date(today.getFullYear(), 0, 1);
  return { from: formatDateParam(start), to: formatDateParam(today) };
}

function getPreviousPeriodRange(from: string, to: string) {
  const fromDate = new Date(from + "T00:00:00");
  const toDate = new Date(to + "T00:00:00");
  const diff = toDate.getTime() - fromDate.getTime();
  const prevTo = new Date(fromDate.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - diff);
  return {
    prevFrom: formatDateParam(prevFrom),
    prevTo: formatDateParam(prevTo),
  };
}

export default function AnalyticPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { storeId } = useStoreId();

  const presetParam = searchParams.get("preset") as DatePreset | null;
  const preset: DatePreset =
    presetParam && DATE_PRESETS.some((p) => p.value === presetParam)
      ? presetParam
      : "this_year";

  const tab = searchParams.get("tab") ?? "sales";

  const fallbackRange = getPresetRange("this_year");
  const customFrom = searchParams.get("from") ?? fallbackRange.from;
  const customTo = searchParams.get("to") ?? fallbackRange.to;

  const range =
    preset === "custom"
      ? { from: customFrom, to: customTo }
      : getPresetRange(preset);

  const { prevFrom, prevTo } = getPreviousPeriodRange(range.from, range.to);

  // Queries
  const { data: salesData } = useAnalyticsSalesQuery({
    storeId,
    fromDate: range.from,
    toDate: range.to,
    prevFromDate: prevFrom,
    prevToDate: prevTo,
  });

  const { data: productsData } = useAnalyticsProductsQuery({
    storeId,
    fromDate: range.from,
    toDate: range.to,
  });

  const { data: provinces } = useProvincesQuery();

  const { data: geoData } = useAnalyticsGeoQuery({
    storeId,
    fromDate: range.from,
    toDate: range.to,
    provinces: provinces ?? [],
  });

  const { data: customersData } = useAnalyticsCustomersQuery({
    storeId,
    fromDate: range.from,
    toDate: range.to,
  });

  const { data: inventoryData } = useAnalyticsInventoryMarginQuery({
    storeId,
    fromDate: range.from,
    toDate: range.to,
  });

  // For tax: always use YTD
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const today = formatDateParam(new Date());
  const { data: ytdSalesData } = useAnalyticsSalesQuery({
    storeId,
    fromDate: yearStart,
    toDate: today,
  });

  const setParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, val] of Object.entries(updates)) {
      if (val) params.set(key, val);
      else params.delete(key);
    }
    setSearchParams(params, { replace: true });
  };

  return (
    <DashboardPageLayout
      header={{
        title: "Analytics",
        description: "Business analytics and 2026 tax estimator",
        icon: ChartArea,
      }}
    >
      {/* Date Filter */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Date range
          </div>
          <Select
            value={preset}
            onValueChange={(v) => {
              if (v === "custom") {
                setParams({ preset: "custom", from: range.from, to: range.to });
              } else {
                const r = getPresetRange(v as Exclude<DatePreset, "custom">);
                setParams({ preset: v, from: r.from, to: r.to });
              }
            }}
          >
            <SelectTrigger className="w-36 bg-card border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {preset === "custom" && (
          <>
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                From
              </div>
              <Input
                type="date"
                value={range.from}
                max={range.to}
                onChange={(e) => setParams({ preset: "custom", from: e.target.value })}
                className="w-40 bg-card border-border/60"
              />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                To
              </div>
              <Input
                type="date"
                value={range.to}
                min={range.from}
                max={today}
                onChange={(e) => setParams({ preset: "custom", to: e.target.value })}
                className="w-40 bg-card border-border/60"
              />
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ tab: v })}
        className="w-full"
      >
        <TabsList className="w-full flex flex-wrap h-auto gap-1">
          <TabsTrigger value="sales" className="flex-1 min-w-25">
            Sales
          </TabsTrigger>
          <TabsTrigger value="products" className="flex-1 min-w-25">
            Products
          </TabsTrigger>
          <TabsTrigger value="geo" className="flex-1 min-w-25">
            Geography
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex-1 min-w-25">
            Customers
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex-1 min-w-25">
            Inventory
          </TabsTrigger>
          <TabsTrigger value="tax" className="flex-1 min-w-25">
            Tax 2026
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex-1 min-w-25">
            Tax calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-6">
          {tab === "sales" ? <SalesOverview data={salesData} /> : null}
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          {tab === "products" ? <ProductAnalytics data={productsData} salesData={salesData} /> : null}
        </TabsContent>

        <TabsContent value="geo" className="mt-6">
          {tab === "geo" ? <GeoAnalytics data={geoData} /> : null}
        </TabsContent>

        <TabsContent value="customers" className="mt-6">
          {tab === "customers" ? <CustomerAnalytics data={customersData} /> : null}
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          {tab === "inventory" ? <InventoryMargin data={inventoryData} /> : null}
        </TabsContent>

        <TabsContent value="tax" className="mt-6">
          {tab === "tax" ? <TaxDashboard salesData={ytdSalesData} /> : null}
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          {tab === "calendar" ? <TaxCalendar /> : null}
        </TabsContent>
      </Tabs>
    </DashboardPageLayout>
  );
}

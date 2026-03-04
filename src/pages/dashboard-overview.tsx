import DashboardPageLayout from "@/components/dashboard/layout";
import DashboardStat from "@/components/dashboard/stat";
import DashboardChart from "@/components/dashboard/chart";
import RebelsRanking from "@/components/dashboard/rebels-ranking";
import SecurityStatus from "@/components/dashboard/security-status";
import BracketsIcon from "@/components/icons/brackets";
import GearIcon from "@/components/icons/gear";
import ProcessorIcon from "@/components/icons/proccesor";
import BoomIcon from "@/components/icons/boom";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStoreId } from "@/src/hooks/use-store-id";
import { useDashboardKpiQuery } from "@/src/queries/hooks";
import mockDataJson from "@/mock.json";
import type { MockData } from "@/types/dashboard";
import { useSearchParams } from "react-router-dom";
import type { ComponentProps } from "react";

const mockData = mockDataJson as MockData;

const iconMap = {
  gear: GearIcon,
  proccesor: ProcessorIcon,
  boom: BoomIcon,
};

type DashboardDatePreset =
  | "today"
  | "this_week"
  | "this_month"
  | "this_year"
  | "custom";

const DASHBOARD_DATE_PRESETS: DashboardDatePreset[] = [
  "today",
  "this_week",
  "this_month",
  "this_year",
  "custom",
];

function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateParam(value: string | null) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return value;
}

function getDatePresetRange(preset: Exclude<DashboardDatePreset, "custom">) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === "today") {
    const value = formatDateParam(today);
    return { fromDate: value, toDate: value };
  }

  if (preset === "this_week") {
    const day = today.getDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysFromMonday);
    return { fromDate: formatDateParam(weekStart), toDate: formatDateParam(today) };
  }

  if (preset === "this_year") {
    const yearStart = new Date(today.getFullYear(), 0, 1);
    return { fromDate: formatDateParam(yearStart), toDate: formatDateParam(today) };
  }

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  return { fromDate: formatDateParam(monthStart), toDate: formatDateParam(today) };
}

function getPresetLabel(preset: DashboardDatePreset) {
  switch (preset) {
    case "today":
      return "Today";
    case "this_week":
      return "This Week";
    case "this_month":
      return "This Month";
    case "this_year":
      return "This Year";
    case "custom":
      return "Custom";
    default:
      return "This Month";
  }
}

function formatDateForCaption(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatGrowthRate(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

export default function DashboardOverview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { storeId } = useStoreId();

  const presetParam = searchParams.get("preset");
  const preset: DashboardDatePreset = DASHBOARD_DATE_PRESETS.includes(
    presetParam as DashboardDatePreset,
  )
    ? (presetParam as DashboardDatePreset)
    : "this_month";

  const fallbackRange = getDatePresetRange("this_month");
  const customFromParam = parseDateParam(searchParams.get("from"));
  const customToParam = parseDateParam(searchParams.get("to"));

  const derivedRange =
    preset === "custom"
      ? {
        fromDate: customFromParam ?? fallbackRange.fromDate,
        toDate: customToParam ?? fallbackRange.toDate,
      }
      : getDatePresetRange(preset);

  const effectiveFromDate =
    derivedRange.fromDate <= derivedRange.toDate
      ? derivedRange.fromDate
      : derivedRange.toDate;
  const effectiveToDate =
    derivedRange.fromDate <= derivedRange.toDate
      ? derivedRange.toDate
      : derivedRange.fromDate;

  const { data: kpi, isLoading } = useDashboardKpiQuery({
    storeId,
    fromDate: effectiveFromDate,
    toDate: effectiveToDate,
  });

  const rangeCaption = `${formatDateForCaption(effectiveFromDate)} - ${formatDateForCaption(
    effectiveToDate,
  )}`;

  const setParams = (next: {
    preset: DashboardDatePreset;
    fromDate?: string;
    toDate?: string;
  }) => {
    const params = new URLSearchParams(searchParams);
    params.set("preset", next.preset);

    if (next.fromDate) params.set("from", next.fromDate);
    else params.delete("from");

    if (next.toDate) params.set("to", next.toDate);
    else params.delete("to");

    setSearchParams(params, { replace: true });
  };

  const handlePresetChange = (nextPreset: DashboardDatePreset) => {
    if (nextPreset === "custom") {
      setParams({
        preset: "custom",
        fromDate: effectiveFromDate,
        toDate: effectiveToDate,
      });
      return;
    }

    const range = getDatePresetRange(nextPreset);
    setParams({
      preset: nextPreset,
      fromDate: range.fromDate,
      toDate: range.toDate,
    });
  };

  const handleCustomDateChange = (field: "from" | "to", value: string) => {
    const nextFrom = field === "from" ? value : effectiveFromDate;
    const nextTo = field === "to" ? value : effectiveToDate;

    setParams({
      preset: "custom",
      fromDate: nextFrom || effectiveFromDate,
      toDate: nextTo || effectiveToDate,
    });
  };

  const dashboardStats: Array<ComponentProps<typeof DashboardStat>> = [
    {
      label: "TOTAL SALES",
      value: isLoading ? "0" : String(Math.round(kpi?.totalSales ?? 0)),
      odometerValue: isLoading ? 0 : Math.round(kpi?.totalSales ?? 0),
      unitLabel: "VND",
      description: "ALL SOLD ORDERS",
      icon: iconMap.gear,
      intent: (kpi?.totalSales ?? 0) > 0 ? "positive" : "neutral",
      direction: (kpi?.totalSales ?? 0) > 0 ? "up" : undefined,
    },
    {
      label: "TOTAL PROFIT",
      value: isLoading ? "0" : String(Math.round(kpi?.totalProfit ?? 0)),
      odometerValue: isLoading ? 0 : Math.round(kpi?.totalProfit ?? 0),
      unitLabel: "VND",
      description: "REALIZED PROFIT",
      icon: iconMap.proccesor,
      intent:
        (kpi?.totalProfit ?? 0) > 0
          ? "positive"
          : (kpi?.totalProfit ?? 0) < 0
            ? "negative"
            : "neutral",
      direction:
        (kpi?.totalProfit ?? 0) > 0
          ? "up"
          : (kpi?.totalProfit ?? 0) < 0
            ? "down"
            : undefined,
    },
    {
      label: "GROWTH RATE",
      value: isLoading ? "0%" : formatGrowthRate(kpi?.growthRate ?? 0),
      odometerValue: isLoading ? 0 : Number((kpi?.growthRate ?? 0).toFixed(1)),
      odometerFormat: "(,ddd).d",
      unitLabel: undefined,
      description: "VS LAST MONTH",
      icon: iconMap.boom,
      intent:
        (kpi?.growthRate ?? 0) > 0
          ? "positive"
          : (kpi?.growthRate ?? 0) < 0
            ? "negative"
            : "neutral",
      direction:
        (kpi?.growthRate ?? 0) > 0
          ? "up"
          : (kpi?.growthRate ?? 0) < 0
            ? "down"
            : undefined,
    },
  ];

  return (
    <DashboardPageLayout
      header={{
        title: "Overview",
        description: `Range: ${rangeCaption}`,
        icon: BracketsIcon,
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Filter
          </div>
          <Select
            value={preset}
            onValueChange={(value) => handlePresetChange(value as DashboardDatePreset)}
          >
            <SelectTrigger className="w-40 bg-card border-border/60">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {DASHBOARD_DATE_PRESETS.map((item) => (
                <SelectItem key={item} value={item}>
                  {getPresetLabel(item)}
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
                value={effectiveFromDate}
                max={effectiveToDate}
                onChange={(event) => handleCustomDateChange("from", event.target.value)}
                className="w-44 bg-card border-border/60"
              />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                To
              </div>
              <Input
                type="date"
                value={effectiveToDate}
                min={effectiveFromDate}
                max={formatDateParam(new Date())}
                onChange={(event) => handleCustomDateChange("to", event.target.value)}
                className="w-44 bg-card border-border/60"
              />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {dashboardStats.map((stat, index) => (
          <DashboardStat
            key={index}
            label={stat.label}
            value={stat.value}
            odometerValue={stat.odometerValue}
            odometerFormat={stat.odometerFormat}
            unitLabel={stat.unitLabel}
            description={stat.description}
            icon={stat.icon}
            intent={stat.intent}
            direction={stat.direction}
          />
        ))}
      </div>

      <div className="mb-6">
        <DashboardChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RebelsRanking rebels={mockData.rebelsRanking} />
        <SecurityStatus statuses={mockData.securityStatus} />
      </div>
    </DashboardPageLayout>
  );
}

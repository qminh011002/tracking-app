import DashboardPageLayout from "@/components/dashboard/layout";
import DashboardStat from "@/components/dashboard/stat";
import DashboardChart from "@/components/dashboard/chart";
import RebelsRanking from "@/components/dashboard/rebels-ranking";
import SecurityStatus from "@/components/dashboard/security-status";
import BracketsIcon from "@/components/icons/brackets";
import GearIcon from "@/components/icons/gear";
import ProcessorIcon from "@/components/icons/proccesor";
import BoomIcon from "@/components/icons/boom";
import { useStoreId } from "@/src/hooks/use-store-id";
import { useDashboardKpiQuery } from "@/src/queries/hooks";
import mockDataJson from "@/mock.json";
import type { MockData } from "@/types/dashboard";

const mockData = mockDataJson as MockData;

const iconMap = {
  gear: GearIcon,
  proccesor: ProcessorIcon,
  boom: BoomIcon,
};

function formatGrowthRate(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

export default function DashboardOverview() {
  const { storeId } = useStoreId();
  const { data: kpi, isLoading } = useDashboardKpiQuery({ storeId });

  const dashboardStats = [
    {
      label: "TOTAL SALES",
      value: isLoading ? "0" : String(Math.round(kpi?.totalSales ?? 0)),
      unitLabel: "VND",
      description: "ALL SOLD ORDERS",
      icon: iconMap.gear,
      intent: (kpi?.totalSales ?? 0) > 0 ? "positive" : "neutral",
      direction: (kpi?.totalSales ?? 0) > 0 ? "up" : undefined,
    },
    {
      label: "TOTAL PROFIT",
      value: isLoading ? "0" : String(Math.round(kpi?.totalProfit ?? 0)),
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
      description: "PROFIT ON COST",
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
  ] as const;

  return (
    <DashboardPageLayout
      header={{
        title: "Overview",
        description: "Last updated 12:05",
        icon: BracketsIcon,
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {dashboardStats.map((stat, index) => (
          <DashboardStat
            key={index}
            label={stat.label}
            value={stat.value}
            unitLabel={stat.unitLabel}
            animationDelayMs={index * 120}
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

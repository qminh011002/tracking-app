import DashboardPageLayout from "@/components/dashboard/layout";
import DashboardOdometer from "@/components/dashboard/odometer";
import { ChartArea } from "lucide-react";

export default function AnalyticPage() {
  return (
    <DashboardPageLayout
      header={{
        title: "Analytic",
        description: "Dashboard insights and trends",
        icon: ChartArea,
      }}
    >
      <div className="rounded-lg border border-border/60 bg-card px-4 py-10 text-center text-muted-foreground uppercase">
        Analytics page is ready. Add charts/widgets here.
      </div>
      <DashboardOdometer value={161050000} className="mt-4" />
    </DashboardPageLayout>
  );
}

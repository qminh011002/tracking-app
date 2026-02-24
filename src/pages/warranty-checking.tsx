import DashboardPageLayout from "@/components/dashboard/layout";
import GearIcon from "@/components/icons/gear";

export default function WarrantyCheckingPage() {
  return (
    <DashboardPageLayout
      header={{
        title: "Warranty Checking",
        description: "Warranty status and expiration",
        icon: GearIcon,
      }}
    >
      <div className="text-muted-foreground uppercase text-sm">
        Warranty checking page is ready.
      </div>
    </DashboardPageLayout>
  );
}

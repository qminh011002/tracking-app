import DashboardPageLayout from "@/components/dashboard/layout";
import CuteRobotIcon from "@/components/icons/cute-robot";
import { assetPath } from "@/lib/asset-path";

export default function NotFoundPage() {
  return (
    <DashboardPageLayout
      header={{
        title: "Not found",
        description: "page under construction",
        icon: CuteRobotIcon,
      }}
    >
      <div className="flex flex-col items-center justify-center gap-10 flex-1">
        <picture className="w-1/4 aspect-square grayscale opacity-50">
          <img
            src={assetPath("/assets/bot_greenprint.gif")}
            alt="Security Status"
            className="size-full object-contain"
          />
        </picture>

        <div className="flex flex-col items-center justify-center gap-2">
          <h1 className="text-xl font-bold uppercase text-muted-foreground">
            Not found, yet
          </h1>
          <p className="text-sm max-w-sm text-center text-muted-foreground text-balance">
            Fork on v0 and start promoting your way to new pages.
          </p>
        </div>
      </div>
    </DashboardPageLayout>
  );
}

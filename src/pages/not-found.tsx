import DashboardPageLayout from "@/components/dashboard/layout";
import CuteRobotIcon from "@/components/icons/cute-robot";
import { assetPath } from "@/lib/asset-path";

export default function NotFoundPage() {
  return (
    <DashboardPageLayout
      header={{
        title: "Không tìm thấy",
        description: "trang đang được xây dựng",
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
            Chưa tìm thấy
          </h1>
          <p className="text-sm max-w-sm text-center text-muted-foreground text-balance">
            Fork trên v0 và bắt đầu xây dựng các trang mới của bạn.
          </p>
        </div>
      </div>
    </DashboardPageLayout>
  );
}

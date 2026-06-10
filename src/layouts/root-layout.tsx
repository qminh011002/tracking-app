import { Outlet } from "react-router-dom";
import { V0Provider } from "@/lib/v0-context";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import mockDataJson from "@/mock.json";
import type { MockData } from "@/types/dashboard";
import Widget from "@/components/dashboard/widget";
import Notifications from "@/components/dashboard/notifications";

const mockData = mockDataJson as MockData;
const isV0 = window.location.hostname.includes("vusercontent.net");

export function RootLayout() {
  return (
    <V0Provider isV0={isV0}>
      <SidebarProvider>
        <DashboardSidebar />
        <SidebarInset className="h-svh overflow-hidden">
          <MobileHeader mockData={mockData} />
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-2 lg:p-4 lg:pl-0 xl:flex-row">
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth [scrollbar-gutter:stable]">
              <Outlet />
            </div>
            <div className="hidden h-full w-90 shrink-0 overflow-hidden xl:block">
              <div className="space-y-gap h-full overflow-hidden py-2">
                <Widget widgetData={mockData.widgetData} />
                <Notifications initialNotifications={mockData.notifications} />
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </V0Provider>
  );
}

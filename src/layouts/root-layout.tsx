import { Outlet } from "react-router-dom";
import { V0Provider } from "@/lib/v0-context";
import { SidebarProvider } from "@/components/ui/sidebar";
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
    <div className="min-h-screen">
    <V0Provider isV0={isV0}>
        <SidebarProvider>
          <MobileHeader mockData={mockData} />
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 lg:px-4">
            <div className="hidden lg:block lg:col-span-2 top-0 relative">
              <DashboardSidebar />
            </div>
            <div className="col-span-1 lg:col-span-8">
              <Outlet />
            </div>
            <div className="hidden lg:block lg:col-span-2">
              <div className="space-y-gap py-sides min-h-screen max-h-screen sticky top-0 overflow-clip">
                <Widget widgetData={mockData.widgetData} />
                <Notifications initialNotifications={mockData.notifications} />
              </div>
            </div>
          </div>
        </SidebarProvider>
      </V0Provider>
    </div>
  );
}

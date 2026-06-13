import * as React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import MonkeyIcon from "@/components/icons/monkey";

export function MobileHeader() {
  return (
    <div className="lg:hidden sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border pt-[env(safe-area-inset-top)]">
      <div className="flex h-header-mobile items-center justify-between px-4 py-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        {/* Left: Sidebar Menu */}
        <SidebarTrigger />

        {/* Center: Monkey Logo */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-16 bg-primary rounded flex items-center justify-center">
            <MonkeyIcon className="size-6 text-primary-foreground" />
          </div>
        </div>

        {/* Right: spacer to keep the logo centered */}
        <div className="size-9 shrink-0" aria-hidden />
      </div>
    </div>
  );
}

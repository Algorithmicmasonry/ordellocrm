"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { NotificationBell } from "@/app/_components/notification-bell";

interface DashboardHeaderProps {
  heading: string;
  text?: string;
}

export function DashboardHeader({ heading, text }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-6 sm:pb-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
            {heading}
          </h2>
          {text && <p className="text-xs sm:text-sm text-foreground/90 mt-1">{text}</p>}
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Search */}
          {/* <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/80" />
            <Input placeholder="Search data..." className="pl-10" />
          </div> */}

          <NotificationBell />

          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
            <HelpCircle className="size-4 sm:size-5" />
          </Button>

          <ModeToggle />
        </div>
      </div>
    </div>
  );
}

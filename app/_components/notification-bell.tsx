"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getUnreadCount } from "@/app/actions/notifications";
import { NotificationDropdown } from "./notification-dropdown";
import { usePathname, useRouter } from "next/navigation";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Fetch unread count on mount and periodically
  useEffect(() => {
    // Define the function inside useEffect
    async function fetchUnreadCount() {
      const result = await getUnreadCount();
      if (result.success && typeof result.count === "number") {
        setUnreadCount(result.count);
      }
    }

    fetchUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Separate function for manual refresh (outside useEffect)
  const refreshUnreadCount = async () => {
    const result = await getUnreadCount();
    if (result.success && typeof result.count === "number") {
      setUnreadCount(result.count);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Refresh unread count when dropdown opens
      refreshUnreadCount();
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    if (pathname.startsWith("/dashboard/sales-rep")) {
      router.push("/dashboard/sales-rep/notifications");
      return;
    }

    if (pathname.startsWith("/dashboard/admin")) {
      router.push("/dashboard/admin/notifications");
      return;
    }

    router.push("/dashboard/notifications");
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <NotificationDropdown
          onViewAll={handleViewAll}
          onUpdate={refreshUnreadCount}
        />
      </PopoverContent>
    </Popover>
  );
}

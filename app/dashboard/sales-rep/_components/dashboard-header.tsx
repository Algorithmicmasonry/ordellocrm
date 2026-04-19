"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HelpCircle, Search } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect, useRef } from "react";
import { NotificationBell } from "@/app/_components/notification-bell";

interface DashboardHeaderProps {
  heading: string;
  text?: string;
  showSearch?: boolean;
}

export function DashboardHeader({
  heading,
  text,
  showSearch = true,
}: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  );
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSearch = (value: string) => {
    setSearchQuery(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for debounced search
    debounceTimerRef.current = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value.trim() === "") {
          params.delete("search");
        } else {
          params.set("search", value);
        }
        params.delete("page"); // Reset to page 1 on search
        router.push(`${pathname}?${params.toString()}`);
      });
    }, 500); // 500ms debounce delay
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-4 sm:pb-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
            {heading}
          </h2>
          {text && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{text}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          {/* Search */}
          {showSearch && (
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search customer phone or name..."
                className="pl-10 text-sm"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                disabled={isPending}
              />
            </div>
          )}

          <div className="flex items-center gap-1 sm:gap-2">
            <NotificationBell />

            <Button variant="ghost" size="icon" title="Help" className="h-9 w-9 sm:h-10 sm:w-10">
              <HelpCircle className="size-4 sm:size-5" />
              <span className="sr-only">Help</span>
            </Button>

            <ModeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

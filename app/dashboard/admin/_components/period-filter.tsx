"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { TimePeriod } from "@/lib/types";

interface PeriodFilterProps {
  currentPeriod: TimePeriod;
}

const periods: { value: TimePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

export function PeriodFilter({ currentPeriod }: PeriodFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (period: TimePeriod) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", period);
      params.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone);
      params.delete("startDate");
      params.delete("endDate");
      params.delete("date");
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="flex h-10 items-center justify-center rounded-lg bg-card p-1 min-w-75 gap-2 relative">
      {/* Loading Overlay */}
      {isPending && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] rounded-lg flex items-center justify-center z-10">
          <Loader2 className="size-4 animate-spin text-primary" />
        </div>
      )}
      
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => handlePeriodChange(period.value)}
          disabled={isPending}
          className={cn(
            "flex h-full grow items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors cursor-pointer",
            isPending && "pointer-events-none opacity-50",
            currentPeriod === period.value
              ? "bg-primary dark:bg-foreground shadow-sm text-primary-foreground dark:text-primary font-semibold"
              : "text-foreground hover:bg-background dark:hover:bg-foreground/80 dark:hover:text-primary hover:shadow-sm"
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
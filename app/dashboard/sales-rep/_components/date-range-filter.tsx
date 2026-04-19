"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { TimePeriod } from "@/lib/types";

const PRESETS: { value: TimePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

interface DateRangeFilterProps {
  currentPeriod: TimePeriod;
  currentStartDate?: string; // YYYY-MM-DD
  currentEndDate?: string;   // YYYY-MM-DD
}

function toDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function DateRangeFilter({
  currentPeriod,
  currentStartDate,
  currentEndDate,
}: DateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Local state for the calendar while the user is picking
  const [range, setRange] = useState<DateRange | undefined>(
    currentStartDate && currentEndDate
      ? {
          from: new Date(currentStartDate + "T12:00:00"),
          to: new Date(currentEndDate + "T12:00:00"),
        }
      : undefined
  );

  const isCustomRange = !!(currentStartDate && currentEndDate);

  const applyPreset = (period: TimePeriod) => {
    setCalendarOpen(false);
    setRange(undefined);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", period);
      params.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone);
      params.delete("startDate");
      params.delete("endDate");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const applyRange = (selected: DateRange | undefined) => {
    setRange(selected);
    // Only navigate once both ends of the range are chosen
    if (!selected?.from || !selected?.to) return;
    setCalendarOpen(false);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("startDate", toDateStr(selected.from!));
      params.set("endDate", toDateStr(selected.to!));
      params.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone);
      params.delete("period");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const clearRange = () => {
    setRange(undefined);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("startDate");
      params.delete("endDate");
      params.set("period", "month");
      params.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone);
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const rangeLabel =
    currentStartDate && currentEndDate
      ? `${format(new Date(currentStartDate + "T12:00:00"), "MMM d, yyyy")} – ${format(new Date(currentEndDate + "T12:00:00"), "MMM d, yyyy")}`
      : "Custom Range";

  return (
    <div className="flex flex-col sm:flex-row gap-2 relative">
      {/* Loading overlay */}
      {isPending && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] rounded-lg flex items-center justify-center z-10">
          <Loader2 className="size-4 animate-spin text-primary" />
        </div>
      )}

      {/* Preset buttons */}
      <div className="flex h-10 items-center rounded-lg bg-card border border-border p-1 gap-1 overflow-x-auto shrink-0">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => applyPreset(preset.value)}
            disabled={isPending}
            className={cn(
              "flex h-full items-center justify-center rounded-lg px-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap disabled:pointer-events-none disabled:opacity-50",
              !isCustomRange && currentPeriod === preset.value
                ? "bg-primary dark:bg-foreground shadow-sm text-primary-foreground dark:text-primary font-semibold"
                : "text-foreground hover:bg-muted dark:hover:bg-foreground/80 dark:hover:text-primary hover:shadow-sm"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Date range picker */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={isPending}
            className={cn(
              "h-10 gap-2 justify-start font-normal",
              isCustomRange
                ? "border-primary text-primary bg-primary/5"
                : "text-muted-foreground"
            )}
          >
            <CalendarIcon className="size-4 shrink-0" />
            <span className="truncate">{rangeLabel}</span>
            {isCustomRange && (
              <X
                className="size-3 ml-auto shrink-0 opacity-70 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  clearRange();
                }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={range}
            onSelect={applyRange}
            disabled={(day) => day > new Date()}
            numberOfMonths={2}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

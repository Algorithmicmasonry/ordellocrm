"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { DateRange } from "react-day-picker";

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  // Parse date range from URL params
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  // Applied date range (from URL)
  const [appliedDate, setAppliedDate] = useState<DateRange | undefined>(() => {
    if (startDateParam && endDateParam) {
      return {
        from: new Date(startDateParam),
        to: new Date(endDateParam),
      };
    }
    return undefined;
  });

  // Temporary date selection (before applying)
  const [tempDate, setTempDate] = useState<DateRange | undefined>(appliedDate);

  const handleDateSelect = (range: DateRange | undefined) => {
    setTempDate(range);
  };

  const handleApply = () => {
    if (tempDate?.from && tempDate?.to) {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());

        // Remove period param when using custom date range
        params.delete("period");
        params.delete("date");

        // Start of the selected start day
        const startOfDay = new Date(tempDate.from!);
        startOfDay.setHours(0, 0, 0, 0);

        // End of the selected end day — ensures single-date picks cover the full day
        const endOfDay = new Date(tempDate.to!);
        endOfDay.setHours(23, 59, 59, 999);

        params.set("startDate", startOfDay.toISOString());
        params.set("endDate", endOfDay.toISOString());

        router.push(`${pathname}?${params.toString()}`);
        setAppliedDate(tempDate);
        setIsOpen(false);
      });
    }
  };

  const handleClearRange = () => {
    setTempDate(undefined);
    setAppliedDate(undefined);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("startDate");
      params.delete("endDate");
      // Reset to default period
      params.set("period", "month");
      params.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone);
      router.push(`${pathname}?${params.toString()}`);
    });
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempDate(appliedDate);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "justify-start text-left font-normal",
              !appliedDate && "text-muted-foreground"
            )}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CalendarIcon className="mr-2 h-4 w-4" />
            )}
            {appliedDate?.from ? (
              appliedDate.to ? (
                <>
                  {format(appliedDate.from, "MMM dd, yyyy")} -{" "}
                  {format(appliedDate.to, "MMM dd, yyyy")}
                </>
              ) : (
                format(appliedDate.from, "MMM dd, yyyy")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={tempDate?.from}
              selected={tempDate}
              onSelect={handleDateSelect}
              numberOfMonths={2}
            />
            <div className="flex items-center justify-end gap-2 pt-3 border-t mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={!tempDate?.from || !tempDate?.to}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {appliedDate?.from && appliedDate?.to && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearRange}
          disabled={isPending}
        >
          Clear
        </Button>
      )}

      {isPending && (
        <span className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading data...
        </span>
      )}
    </div>
  );
}

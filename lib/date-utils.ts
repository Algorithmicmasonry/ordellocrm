/**
 * Date utility functions for dashboard filtering
 */

import { TimePeriod } from "./types";



export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Get the current date/time parts in the given timezone.
 * Returns components needed to build timezone-aware Date boundaries.
 */
function getNowInTimezone(timezone?: string): {
  year: number;
  month: number;
  day: number;
  now: Date;
} {
  const now = new Date();
  if (!timezone) {
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      now,
    };
  }

  // Format current time in the target timezone to extract date parts
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parseInt(parts.find((p) => p.type === "year")!.value);
  const month = parseInt(parts.find((p) => p.type === "month")!.value) - 1; // 0-indexed
  const day = parseInt(parts.find((p) => p.type === "day")!.value);

  return { year, month, day, now };
}

/**
 * Create a Date representing midnight (00:00:00.000) of a given date in the
 * specified timezone. This returns a UTC Date that corresponds to that
 * timezone's midnight.
 */
function midnightInTimezone(
  year: number,
  month: number,
  day: number,
  timezone?: string,
): Date {
  if (!timezone) {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Build an approximate UTC date, then adjust for timezone offset
  // Start with a rough guess
  const guess = new Date(Date.UTC(year, month, day, 12, 0, 0));

  // Get what time it is in the target timezone at our guess
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const guessParts = formatter.formatToParts(guess);
  const guessHour = parseInt(
    guessParts.find((p) => p.type === "hour")!.value,
  );
  const guessMinute = parseInt(
    guessParts.find((p) => p.type === "minute")!.value,
  );

  // The offset from UTC noon to timezone's displayed time tells us the tz offset
  // At guess (UTC noon), the timezone shows guessHour:guessMinute
  // So tz offset = guessHour*60 + guessMinute - 12*60
  const offsetMinutes = guessHour * 60 + guessMinute - 12 * 60;

  // Midnight in that timezone = UTC midnight minus the offset
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - offsetMinutes * 60 * 1000);
}

/**
 * Create a Date representing end-of-day (23:59:59.999) of a given date in the
 * specified timezone.
 */
function endOfDayInTimezone(
  year: number,
  month: number,
  day: number,
  timezone?: string,
): Date {
  const midnight = midnightInTimezone(year, month, day, timezone);
  return new Date(midnight.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Get date range based on time period, relative to the client's timezone.
 */
export function getDateRange(period: TimePeriod, timezone?: string): DateRange {
  const { year, month, day, now } = getNowInTimezone(timezone);
  const endDate = now;

  let startDate: Date;

  switch (period) {
    case "today":
      startDate = midnightInTimezone(year, month, day, timezone);
      break;

    case "week": {
      const todayMidnight = midnightInTimezone(year, month, day, timezone);
      // Week starts on Sunday. year/month/day are already timezone-aware so
      // getUTCDay() on a UTC date built from them gives the correct local weekday.
      const dayOfWeek = new Date(Date.UTC(year, month, day)).getUTCDay(); // 0=Sun … 6=Sat
      startDate = new Date(todayMidnight.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
      break;
    }

    case "month": {
      // Start of the current calendar month in the client's timezone
      startDate = midnightInTimezone(year, month, 1, timezone);
      break;
    }

    case "year":
      startDate = midnightInTimezone(year, 0, 1, timezone);
      break;

    default:
      startDate = midnightInTimezone(year, month, day, timezone);
  }

  return { startDate, endDate };
}

/**
 * Get the previous period's date range for comparison, relative to the client's timezone.
 */
export function getPreviousPeriodRange(period: TimePeriod, timezone?: string): DateRange {
  const { year, month, day } = getNowInTimezone(timezone);

  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case "today": {
      // Yesterday in the client's timezone
      const yesterdayMidnight = new Date(
        midnightInTimezone(year, month, day, timezone).getTime() - 24 * 60 * 60 * 1000,
      );
      startDate = yesterdayMidnight;
      endDate = new Date(yesterdayMidnight.getTime() + 24 * 60 * 60 * 1000 - 1);
      break;
    }

    case "week": {
      // Previous calendar week (Sun–Sat before the current week)
      const todayMidnight = midnightInTimezone(year, month, day, timezone);
      const dayOfWeek = new Date(Date.UTC(year, month, day)).getUTCDay();
      const thisWeekStart = new Date(todayMidnight.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
      endDate = new Date(thisWeekStart.getTime() - 1); // end of last Saturday (23:59:59.999)
      startDate = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000); // previous Sunday midnight
      break;
    }

    case "month": {
      // Previous calendar month: 1st to last day of the month before the current one
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      startDate = midnightInTimezone(prevYear, prevMonth, 1, timezone);
      // End = one millisecond before the start of the current month
      endDate = new Date(midnightInTimezone(year, month, 1, timezone).getTime() - 1);
      break;
    }

    case "year": {
      // Previous year (January 1 to December 31 of last year)
      const lastYear = year - 1;
      startDate = midnightInTimezone(lastYear, 0, 1, timezone);
      endDate = endOfDayInTimezone(lastYear, 11, 31, timezone);
      break;
    }

    default: {
      const yesterdayMidnight = new Date(
        midnightInTimezone(year, month, day, timezone).getTime() - 24 * 60 * 60 * 1000,
      );
      startDate = yesterdayMidnight;
      endDate = new Date(yesterdayMidnight.getTime() + 24 * 60 * 60 * 1000 - 1);
    }
  }

  return { startDate, endDate };
}

/**
 * Get the start and end of a specific calendar day (YYYY-MM-DD) in the given timezone.
 */
export function getSpecificDayRange(dateStr: string, timezone?: string): DateRange {
  const [year, month, day] = dateStr.split("-").map(Number);
  const startDate = midnightInTimezone(year, month - 1, day, timezone);
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { startDate, endDate };
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

/**
 * Get day labels based on period (for charts)
 */
export function getDayLabels(period: TimePeriod): string[] {
  switch (period) {
    case "today":
      // Hourly labels (24 hours)
      return Array.from({ length: 24 }, (_, i) => {
        const hour = i.toString().padStart(2, "0");
        return `${hour}:00`;
      });

    case "week":
      // 7 days — week starts Sunday
      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    case "month":
      // 30 days - show every 5th day
      return Array.from({ length: 7 }, (_, i) => {
        const dayNum = i * 5 + 1;
        return `Day ${dayNum}`;
      });

    case "year":
      // 12 months
      return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    default:
      return [];
  }
}

/**
 * Get time buckets for grouping data (for charts).
 * startDate should already be timezone-adjusted (from getDateRange).
 */
export function getTimeBuckets(period: TimePeriod, startDate: Date, timezone?: string): Date[] {
  const buckets: Date[] = [];
  const MS_PER_HOUR = 60 * 60 * 1000;
  const MS_PER_DAY = 24 * MS_PER_HOUR;

  switch (period) {
    case "today":
      // 24 hourly buckets starting from startDate (which is already midnight in tz)
      for (let i = 0; i < 24; i++) {
        buckets.push(new Date(startDate.getTime() + i * MS_PER_HOUR));
      }
      break;

    case "week":
      // 7 daily buckets
      for (let i = 0; i < 7; i++) {
        buckets.push(new Date(startDate.getTime() + i * MS_PER_DAY));
      }
      break;

    case "month":
      // 30 daily buckets
      for (let i = 0; i < 30; i++) {
        buckets.push(new Date(startDate.getTime() + i * MS_PER_DAY));
      }
      break;

    case "year": {
      // 12 monthly buckets (first day of each month)
      const { year } = getNowInTimezone(timezone);
      for (let i = 0; i < 12; i++) {
        buckets.push(midnightInTimezone(year, i, 1, timezone));
      }
      break;
    }
  }

  return buckets;
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

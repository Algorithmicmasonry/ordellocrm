import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardHeader } from "../_components/dashboard-header";
import { DateRangeFilter } from "../_components/date-range-filter";
import { LeaderboardTable } from "./_components";
import { getLeaderboardData } from "./actions";
import type { TimePeriod } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{
    period?: string;
    startDate?: string;
    endDate?: string;
    tz?: string;
  }>;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function LeaderboardPage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "SALES_REP") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const period = (params.period || "week") as TimePeriod;
  const timezone = params.tz;

  const startDate =
    params.startDate && DATE_RE.test(params.startDate)
      ? params.startDate
      : undefined;
  const endDate =
    params.endDate && DATE_RE.test(params.endDate) ? params.endDate : undefined;
  const isCustomRange = !!(startDate && endDate);

  const result = await getLeaderboardData(
    period,
    timezone,
    isCustomRange ? startDate : undefined,
    isCustomRange ? endDate : undefined
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardHeader
        heading="Leaderboard"
        text="Sales rep rankings by conversion rate for the selected period"
      />

      <DateRangeFilter
        currentPeriod={period}
        currentStartDate={startDate}
        currentEndDate={endDate}
      />

      {result.success && result.data ? (
        <LeaderboardTable
          reps={result.data.reps}
          currentHoH={result.data.currentHoH}
        />
      ) : (
        <div className="py-12 text-center text-muted-foreground text-sm">
          {result.error ?? "Failed to load leaderboard."}
        </div>
      )}
    </div>
  );
}

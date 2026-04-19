import { auth } from "@/lib/auth";
import type { TimePeriod } from "@/lib/types";
import type { Currency } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardHeader, CurrencyFilter, PeriodFilter } from "../_components";
import { DateRangePicker } from "./_components";
import { ReportsTabs } from "./_components/reports-tabs";
import { getFinancialOverview } from "./actions";

interface PageProps {
  searchParams: Promise<{ period?: string; startDate?: string; endDate?: string; currency?: Currency; tz?: string }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const period = (query.period || "month") as TimePeriod;
  const startDate = query.startDate ? new Date(query.startDate) : undefined;
  const endDate = query.endDate ? new Date(query.endDate) : undefined;
  const currency = query.currency;
  const timezone = query.tz;

  // Only fetch overview data server-side — other tabs load on demand
  const financialData = await getFinancialOverview(period, startDate, endDate, currency, timezone);

  if (!financialData.success || !financialData.data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground">
            Failed to Load Reports
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {financialData.error || "Unable to fetch financial data"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      <DashboardHeader
        heading="Financial Reports"
        text="Comprehensive financial analytics and performance tracking"
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <CurrencyFilter />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            <PeriodFilter currentPeriod={period} />
            <DateRangePicker />
          </div>
        </div>
      </div>

      <ReportsTabs
        overviewData={financialData.data}
        period={period}
        currency={currency}
        startDate={query.startDate}
        endDate={query.endDate}
        timezone={timezone}
      />
    </div>
  );
}

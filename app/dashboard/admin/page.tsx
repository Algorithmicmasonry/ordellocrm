import {
  getDashboardStats,
  getRecentOrders,
  getRevenueTrend,
  getTopProducts,
} from "@/app/actions/dashboard-stats";
import { Button } from "@/components/ui/button";
import { requireOrgContext } from "@/lib/org-context";
import type { TimePeriod } from "@/lib/types";
import type { Currency } from "@prisma/client";
import { Download } from "lucide-react";
import { redirect } from "next/navigation";
import {
  CurrencyFilter,
  DashboardHeader,
  DateRangePicker,
  PeriodFilter,
  RecentOrders,
  RevenueChart,
  StatsCards,
  TopProducts,
} from "./_components";
import { InstallPrompt } from "@/app/_components/install-prompt";
import { ConversionOpportunitySimulator } from "@/app/_components/conversion-opportunity-simulator";

interface AdminDashboardPageProps {
  searchParams: Promise<{ period?: string; currency?: string; tz?: string; startDate?: string; endDate?: string }>;
}

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  const ctx = await requireOrgContext();
  if (ctx.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Get period and currency from search params
  const params = await searchParams;
  const period = (params?.period || "today") as TimePeriod;
  const currency = (params?.currency as Currency) || "NGN"; // Default to NGN, never show mixed currencies
  // Default to WAT (Nigeria/Ghana business hours) when the browser hasn't sent tz yet
  const timezone = params?.tz || "Africa/Lagos";

  // Custom date range — takes priority over period when both present
  const startDate = params?.startDate;
  const endDate = params?.endDate;

  // Validate period
  const validPeriods: TimePeriod[] = ["today", "week", "month", "year"];
  const currentPeriod = validPeriods.includes(period) ? period : "today";

  // Fetch all dashboard data in parallel
  const [statsResult, revenueResult, productsResult, ordersResult] =
    await Promise.all([
      getDashboardStats(currentPeriod, currency, timezone, startDate, endDate),
      getRevenueTrend(currentPeriod, currency, timezone, startDate, endDate),
      getTopProducts(currentPeriod, 3, currency, timezone, startDate, endDate),
      getRecentOrders(5),
    ]);

  return (
    <div>
      <DashboardHeader
        heading="Administrator Dashboard"
        text="Monitor your business performance in real-time"
      />

      {/* PWA Components */}
      <div className="grid gap-4 grid-cols-1 mb-6">
        <InstallPrompt />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <PeriodFilter currentPeriod={currentPeriod} />
          <DateRangePicker />
          <CurrencyFilter />
        </div>

        <Button className="w-full sm:w-auto">
          <Download className="size-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="space-y-8">
        <StatsCards
          stats={statsResult.success ? statsResult.data : null}
          currency={currency}
        />

        {statsResult.success && statsResult.data && (
          <ConversionOpportunitySimulator
            title="Revenue Opportunity Simulator"
            description="Estimate how much additional revenue is possible if conversion improves."
            valueLabel="Revenue"
            audienceLabel="The business"
            currency={currency}
            totalOrders={statsResult.data.ordersCount}
            currentConversionRate={statsResult.data.fulfillmentRate}
            currentDeliveredOrders={statsResult.data.deliveredCount}
            currentValue={statsResult.data.revenue}
          />
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <RevenueChart
            data={revenueResult.success ? revenueResult.data : null}
            className="md:col-span-2"
          />
          <TopProducts
            products={productsResult.success ? productsResult.data : null}
          />
        </div>

        <RecentOrders
          orders={ordersResult.success ? ordersResult.data : null}
        />
      </div>
    </div>
  );
}

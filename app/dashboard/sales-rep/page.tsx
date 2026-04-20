import { redirect } from "next/navigation";
import { requireOrgContext } from "@/lib/org-context";
import { getSalesRepDashboardStats, getAssignedOrders, getRepEarnings } from "./actions";
import {
  DashboardStats,
  EarningsCard,
  FollowUpReminder,
  AssignedOrdersTable,
  DashboardHeader,
  DateRangeFilter,
  CreateOrderDialog,
} from "./_components";
import type { OrderStatus } from "@prisma/client";
import type { TimePeriod } from "@/lib/types";
import { InstallPrompt } from "@/app/_components/install-prompt";
import { ConversionOpportunitySimulator } from "@/app/_components/conversion-opportunity-simulator";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
    period?: string;
    tz?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function SalesRepDashboardPage({
  searchParams,
}: PageProps) {
  const ctx = await requireOrgContext();
  if (ctx.role !== "SALES_REP") {
    redirect("/dashboard");
  }

  // Parse search params
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const status = (params.status || "ALL") as OrderStatus | "ALL" | "FOLLOW_UP";
  const search = params.search || "";
  const period = (params.period || "month") as TimePeriod;
  const timezone = params.tz;

  // Custom date range — only used when both params are present and valid
  const startDate =
    params.startDate && DATE_RE.test(params.startDate)
      ? params.startDate
      : undefined;
  const endDate =
    params.endDate && DATE_RE.test(params.endDate)
      ? params.endDate
      : undefined;
  const isCustomRange = !!(startDate && endDate);

  // Fetch dashboard data in parallel
  const [statsResult, ordersResult, earningsResult] = await Promise.all([
    getSalesRepDashboardStats(
      period,
      timezone,
      isCustomRange ? startDate : undefined,
      isCustomRange ? endDate : undefined
    ),
    getAssignedOrders({
      page,
      status,
      search,
      period,
      startDate: isCustomRange ? startDate : undefined,
      endDate: isCustomRange ? endDate : undefined,
      timezone,
    }),
    getRepEarnings(
      period,
      timezone,
      isCustomRange ? startDate : undefined,
      isCustomRange ? endDate : undefined
    ),
  ]);

  if (!statsResult.success || !statsResult.data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground">
            Failed to Load Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {statsResult.error || "Unable to fetch dashboard data"}
          </p>
        </div>
      </div>
    );
  }

  if (!ordersResult.success || !ordersResult.data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground">
            Failed to Load Orders
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {ordersResult.error || "Unable to fetch orders"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Dashboard Header */}
      <div>
        <DashboardHeader
          heading="Dashboard Overview"
          text="Track your orders, performance, and customer interactions"
        />
      </div>

      {/* PWA Install Prompt */}
      <div className="max-w-xl">
        <InstallPrompt />
      </div>

      {/* Period / Date Range Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 sm:justify-between">
        <DateRangeFilter
          currentPeriod={period}
          currentStartDate={startDate}
          currentEndDate={endDate}
        />
        <div className="w-full sm:w-auto">
          <CreateOrderDialog />
        </div>
      </div>

      {/* Stats Cards */}
      <DashboardStats stats={statsResult.data} period={period} />

      {/* Potential Commission Simulator */}
      {earningsResult.success &&
        earningsResult.data &&
        earningsResult.data.ratePerOrder !== null && (
          <ConversionOpportunitySimulator
            title="Commission Opportunity Simulator"
            description="See how much more commission you could earn by improving your conversion rate."
            valueLabel="Commission"
            audienceLabel="You"
            currency="NGN"
            totalOrders={statsResult.data.totalOrders}
            currentConversionRate={statsResult.data.conversionRate}
            currentDeliveredOrders={statsResult.data.deliveredFromCohort}
            currentValue={
              statsResult.data.deliveredFromCohort *
              earningsResult.data.ratePerOrder
            }
          />
        )}

      {/* Earnings Card */}
      {earningsResult.success && earningsResult.data && (
        <EarningsCard data={earningsResult.data} />
      )}

      {/* Follow-up Reminder */}
      {statsResult.data.followUpOrders > 0 && (
        <FollowUpReminder count={statsResult.data.followUpOrders} />
      )}

      {/* Assigned Orders Table */}
      <AssignedOrdersTable
        orders={ordersResult.data.orders}
        pagination={ordersResult.data.pagination}
        currentStatus={status}
        currentSearch={search}
      />
    </div>
  );
}

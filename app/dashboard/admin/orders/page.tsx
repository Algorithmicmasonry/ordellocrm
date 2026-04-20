import { redirect } from "next/navigation";
import { requireOrgContext } from "@/lib/org-context";
import { OrdersStats, ExportOrdersButton, OrdersByProduct } from "./_components";
import { OrdersTable } from "./_components";
import { getOrders, getOrderStats, getUniqueLocations, getOrdersByProduct } from "./actions";
import { OrderStatus, OrderSource, Currency } from "@prisma/client";
import { DashboardHeader, CurrencyFilter, PeriodFilter, DateRangePicker } from "../_components";
import type { TimePeriod } from "@/lib/types";
import { ConversionOpportunitySimulator } from "@/app/_components/conversion-opportunity-simulator";

type SearchParams = {
  page?: string;
  status?: OrderStatus;
  source?: OrderSource;
  location?: string;
  search?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  currency?: Currency;
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireOrgContext();
  if (ctx.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const searchParameter = await searchParams;
  const searchParamsPage = searchParameter.page || "1";

  // Get and validate period
  const period = (searchParameter.period || "month") as TimePeriod;
  const validPeriods: TimePeriod[] = ["today", "week", "month", "year"];
  const currentPeriod = validPeriods.includes(period) ? period : "month";

  // Custom date range — takes priority over period when both present
  const startDate = searchParameter.startDate;
  const endDate = searchParameter.endDate;

  // Parse search params
  const page = parseInt(searchParamsPage);
  const filters = {
    status: searchParameter.status,
    source: searchParameter.source,
    location: searchParameter.location,
    search: searchParameter.search,
    currency: searchParameter.currency,
  };

  // Fetch data with period/date range and currency
  const [ordersResponse, statsResponse, locationsResponse, productOrdersResponse] = await Promise.all([
    getOrders(filters, { page, perPage: 10 }, currentPeriod, startDate, endDate),
    getOrderStats(currentPeriod, filters.currency, startDate, endDate),
    getUniqueLocations(),
    getOrdersByProduct(currentPeriod, startDate, endDate, filters.currency),
  ]);

  // Handle errors - show empty state or error message
  if (!ordersResponse.success || !ordersResponse.data) {
    return (
      <div className="space-y-6">
        <DashboardHeader
          heading="Orders Management"
          text="Track and manage your assigned customer orders in real-time"
        />
        <div className="text-center py-12">
          <p className="text-muted-foreground">{ordersResponse.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardHeader
        heading="Orders Management"
        text="Track and manage your assigned customer orders in real-time"
      />

      {/* Period / Date Range and Currency Filters with Export Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <PeriodFilter currentPeriod={currentPeriod} />
          <DateRangePicker />
          <CurrencyFilter />
        </div>
        <div className="w-full sm:w-auto shrink-0">
          <ExportOrdersButton
            orders={ordersResponse.data.orders}
            currency={filters.currency}
          />
        </div>
      </div>

      {statsResponse.success && statsResponse.data && (
        <>
          <OrdersStats stats={statsResponse.data} period={currentPeriod} currency={filters.currency} />
          <ConversionOpportunitySimulator
            title="Orders Revenue Opportunity"
            description="Model the revenue impact of higher delivery conversion for this filtered orders view."
            valueLabel="Revenue"
            audienceLabel="The business"
            currency={filters.currency || "NGN"}
            totalOrders={statsResponse.data.totalHandled}
            currentConversionRate={statsResponse.data.deliveryRate}
            currentDeliveredOrders={statsResponse.data.deliveredOrders}
            currentValue={statsResponse.data.revenue}
          />
        </>
      )}

      {productOrdersResponse.success && productOrdersResponse.data && (
        <OrdersByProduct data={productOrdersResponse.data} />
      )}

      <OrdersTable
        orders={ordersResponse.data.orders}
        pagination={ordersResponse.data.pagination}
        locations={locationsResponse.data || []}
      />
    </div>
  );
}

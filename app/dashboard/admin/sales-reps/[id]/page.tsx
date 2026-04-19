import { Suspense } from "react";
import { notFound } from "next/navigation";
import SalesRepDetailsClient from "./_components/sales-rep-details-client";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import type { OrderStatus, OrderSource, Currency } from "@prisma/client";
import type { Metadata } from "next";
import { TimePeriod } from "@/lib/types";
import {
  getDateRange,
  getPreviousPeriodRange,
  calculatePercentageChange,
} from "@/lib/date-utils";

async function getSalesRepDetails(repId: string, period: TimePeriod = "month", timezone?: string, startDateParam?: string, endDateParam?: string) {
  const { startDate, endDate } = (startDateParam && endDateParam)
    ? { startDate: new Date(startDateParam), endDate: new Date(endDateParam) }
    : getDateRange(period, timezone);
  const previousRange = (startDateParam && endDateParam)
    ? null
    : getPreviousPeriodRange(period, timezone);

  // Fetch sales rep with orders in BOTH periods
  const salesRep = await db.user.findUnique({
    where: {
      id: repId,
      role: "SALES_REP",
    },
    include: {
      orders: {
        where: {
          createdAt: {
            gte: previousRange ? previousRange.startDate : startDate,
            lte: endDate,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!salesRep) {
    notFound();
  }

  // Split orders into current and previous periods
  const currentOrders = salesRep.orders.filter(
    (o) => o.createdAt >= startDate && o.createdAt <= endDate,
  );
  const previousOrders = previousRange
    ? salesRep.orders.filter(
        (o) =>
          o.createdAt >= previousRange.startDate &&
          o.createdAt <= previousRange.endDate,
      )
    : [];

  // Calculate current period stats
  const totalOrders = currentOrders.length;
  const deliveredOrders = currentOrders.filter(
    (o) => o.status === "DELIVERED",
  ).length;

  // Calculate revenue by currency (current period)
  const revenueByCurrency = currentOrders
    .filter((o) => o.status === "DELIVERED")
    .reduce(
      (acc, order) => {
        const orderRevenue = order.items.reduce(
          (itemSum, item) => itemSum + item.price * item.quantity,
          0,
        );
        const currency = order.currency || "NGN";
        acc[currency] = (acc[currency] || 0) + orderRevenue;
        return acc;
      },
      {} as Record<Currency, number>,
    );

  // Calculate total revenue (sum of all currencies)
  const revenue = Object.values(revenueByCurrency).reduce(
    (sum, amount) => sum + amount,
    0,
  );

  // Calculate cost by currency (current period)
  const costByCurrency = currentOrders
    .filter((o) => o.status === "DELIVERED")
    .reduce(
      (acc, order) => {
        const orderCost = order.items.reduce(
          (itemSum, item) => itemSum + item.cost * item.quantity,
          0,
        );
        const currency = order.currency || "NGN";
        acc[currency] = (acc[currency] || 0) + orderCost;
        return acc;
      },
      {} as Record<Currency, number>,
    );

  // Calculate total cost
  const cost = Object.values(costByCurrency).reduce(
    (sum, amount) => sum + amount,
    0,
  );

  // Calculate profit by currency
  const profitByCurrency = Object.keys({
    ...revenueByCurrency,
    ...costByCurrency,
  }).reduce(
    (acc, currency) => {
      const rev = revenueByCurrency[currency as Currency] || 0;
      const cst = costByCurrency[currency as Currency] || 0;
      acc[currency as Currency] = rev - cst;
      return acc;
    },
    {} as Record<Currency, number>,
  );

  // For individual sales reps, show Gross Profit (Revenue - Cost)
  const profit = revenue - cost;

  const conversionRate =
    totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

  // Average response time: mean of (confirmedAt - createdAt) for orders that were confirmed
  const respondedOrders = currentOrders.filter((o) => o.confirmedAt);
  const avgResponseTimeHours =
    respondedOrders.length > 0
      ? respondedOrders.reduce(
          (sum, o) =>
            sum +
            (new Date(o.confirmedAt!).getTime() -
              new Date(o.createdAt).getTime()),
          0,
        ) /
        respondedOrders.length /
        3600000
      : null;

  // Calculate previous period stats for trends
  const prevTotalOrders = previousOrders.length;
  const prevDeliveredOrders = previousOrders.filter(
    (o) => o.status === "DELIVERED",
  ).length;

  // Calculate previous revenue by currency
  const prevRevenueByCurrency = previousOrders
    .filter((o) => o.status === "DELIVERED")
    .reduce(
      (acc, order) => {
        const orderRevenue = order.items.reduce(
          (itemSum, item) => itemSum + item.price * item.quantity,
          0,
        );
        const currency = order.currency || "NGN";
        acc[currency] = (acc[currency] || 0) + orderRevenue;
        return acc;
      },
      {} as Record<Currency, number>,
    );

  const prevRevenue = Object.values(prevRevenueByCurrency).reduce(
    (sum, amount) => sum + amount,
    0,
  );

  // Calculate previous cost by currency
  const prevCostByCurrency = previousOrders
    .filter((o) => o.status === "DELIVERED")
    .reduce(
      (acc, order) => {
        const orderCost = order.items.reduce(
          (itemSum, item) => itemSum + item.cost * item.quantity,
          0,
        );
        const currency = order.currency || "NGN";
        acc[currency] = (acc[currency] || 0) + orderCost;
        return acc;
      },
      {} as Record<Currency, number>,
    );

  const prevCost = Object.values(prevCostByCurrency).reduce(
    (sum, amount) => sum + amount,
    0,
  );

  // Previous period gross profit (Revenue - Cost)
  const prevProfit = prevRevenue - prevCost;

  const prevConversionRate =
    prevTotalOrders > 0
      ? Math.round((prevDeliveredOrders / prevTotalOrders) * 100)
      : 0;

  // Calculate real trends (null when custom range — no comparison available)
  const trends = previousRange ? {
    orders: calculatePercentageChange(totalOrders, prevTotalOrders),
    delivered: calculatePercentageChange(deliveredOrders, prevDeliveredOrders),
    revenue: calculatePercentageChange(revenue, prevRevenue),
    profit: calculatePercentageChange(profit, prevProfit),
    conversion: calculatePercentageChange(conversionRate, prevConversionRate),
  } : {
    orders: null,
    delivered: null,
    revenue: null,
    profit: null,
    conversion: null,
  };

  // Orders by status (current period only)
  const ordersByStatus = currentOrders.reduce(
    (acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    },
    {} as Record<OrderStatus, number>,
  );

  // Orders by source (current period only)
  const ordersBySource = currentOrders.reduce(
    (acc, order) => {
      acc[order.source] = (acc[order.source] || 0) + 1;
      return acc;
    },
    {} as Record<OrderSource, number>,
  );

  return {
    ...salesRep,
    orders: currentOrders, // Only return current period orders for display
    stats: {
      totalOrders,
      deliveredOrders,
      revenue,
      revenueByCurrency,
      profit,
      profitByCurrency,
      conversionRate,
      avgResponseTimeHours,
      ordersByStatus,
      ordersBySource,
      trends,
    },
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; tz?: string; startDate?: string; endDate?: string }>;
}

export default async function SalesRepDetailsPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const period = (query?.period || "month") as TimePeriod;
  const timezone = query?.tz;
  const startDate = query?.startDate;
  const endDate = query?.endDate;

  const salesRep = await getSalesRepDetails(id, period, timezone, startDate, endDate);

  return (
    <Suspense fallback={<SalesRepDetailsSkeleton />}>
      <SalesRepDetailsClient salesRep={salesRep} currentPeriod={period} />
    </Suspense>
  );
}

function SalesRepDetailsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      <Skeleton className="h-5 w-48" />

      {/* Profile Header */}
      <Skeleton className="h-40" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>

      {/* Table */}
      <Skeleton className="h-96" />
    </div>
  );
}
// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const salesRep = await db.user.findUnique({
    where: { id },
    select: { name: true },
  });

  return {
    title: salesRep
      ? `${salesRep.name} - Sales Rep Details`
      : "Sales Rep Details",
    description: `Performance details and statistics for ${salesRep?.name || "sales representative"}`,
  };
}

import { Suspense } from "react";
import { SalesRepsClient } from "./_components";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";
import { TimePeriod } from "@/lib/types";
import type { Currency } from "@prisma/client";
import {
  getDateRange,
  getPreviousPeriodRange,
  calculatePercentageChange,
} from "@/lib/date-utils";
import { getCurrentHoH } from "@/lib/head-of-house";

async function getSalesRepsData(organizationId: string, period: TimePeriod = "month", timezone?: string, startDateParam?: string, endDateParam?: string) {
  const { startDate, endDate } = (startDateParam && endDateParam)
    ? { startDate: new Date(startDateParam), endDate: new Date(endDateParam) }
    : getDateRange(period, timezone);
  const previousRange = (startDateParam && endDateParam)
    ? null
    : getPreviousPeriodRange(period, timezone);

  // Fetch all sales rep members for this org
  const members = await db.organizationMember.findMany({
    where: { organizationId, role: "SALES_REP", isActive: true, isAiAgent: false },
    include: { user: { select: { id: true, name: true, email: true, image: true, createdAt: true, isActive: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const repIds = members.map((m) => m.userId);

  // Fetch orders for all reps in this org across both periods
  const allOrders = await db.order.findMany({
    where: {
      organizationId,
      assignedToId: { in: repIds },
      createdAt: {
        gte: previousRange ? previousRange.startDate : startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      assignedToId: true,
      status: true,
      totalAmount: true,
      currency: true,
      createdAt: true,
      deliveredAt: true,
    },
  });

  // Group orders by rep
  const ordersByRep = new Map<string, typeof allOrders>();
  for (const m of members) ordersByRep.set(m.userId, []);
  for (const o of allOrders) {
    if (o.assignedToId) ordersByRep.get(o.assignedToId)?.push(o);
  }

  // Build salesReps shape matching the original (user + orders)
  const salesReps = members.map((m) => ({
    ...m.user,
    orders: ordersByRep.get(m.userId) ?? [],
  }));

  // Calculate stats for each rep with trends
  const salesRepsWithStats = salesReps.map((rep) => {
    // Split orders into current and previous periods
    const currentOrders = rep.orders.filter(
      (o) => o.createdAt >= startDate && o.createdAt <= endDate,
    );
    const previousOrders = previousRange
      ? rep.orders.filter(
          (o) =>
            o.createdAt >= previousRange.startDate &&
            o.createdAt <= previousRange.endDate,
        )
      : [];

    // Calculate current period stats (exclude cancelled — matches leaderboard logic)
    const totalOrders = currentOrders.filter((o) => o.status !== "CANCELLED").length;
    const deliveredOrders = currentOrders.filter(
      (o) =>
        o.status === "DELIVERED" &&
        o.deliveredAt !== null &&
        o.deliveredAt >= startDate &&
        o.deliveredAt <= endDate,
    ).length;
    const conversionRate =
      totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

    // Calculate revenue by currency for current period (same deliveredAt gate as deliveredOrders)
    const revenueByCurrency = currentOrders
      .filter(
        (o) =>
          o.status === "DELIVERED" &&
          o.deliveredAt !== null &&
          o.deliveredAt >= startDate &&
          o.deliveredAt <= endDate,
      )
      .reduce(
        (acc, order) => {
          const currency = order.currency || "NGN"; // Default to NGN if no currency
          acc[currency] = (acc[currency] || 0) + order.totalAmount;
          return acc;
        },
        {} as Record<Currency, number>,
      );

    // Calculate total revenue (sum of all currencies)
    const totalRevenue = Object.values(revenueByCurrency).reduce(
      (sum, amount) => sum + amount,
      0,
    );

    // Calculate previous period stats
    const prevTotalOrders = previousOrders.filter((o) => o.status !== "CANCELLED").length;
    const prevDeliveredOrders = previousOrders.filter(
      (o) =>
        o.status === "DELIVERED" &&
        o.deliveredAt !== null &&
        previousRange !== null &&
        o.deliveredAt >= previousRange.startDate &&
        o.deliveredAt <= previousRange.endDate,
    ).length;

    // Calculate previous revenue by currency
    const prevRevenueByCurrency = previousOrders
      .filter(
        (o) =>
          o.status === "DELIVERED" &&
          o.deliveredAt !== null &&
          previousRange !== null &&
          o.deliveredAt >= previousRange.startDate &&
          o.deliveredAt <= previousRange.endDate,
      )
      .reduce(
        (acc, order) => {
          const currency = order.currency || "NGN";
          acc[currency] = (acc[currency] || 0) + order.totalAmount;
          return acc;
        },
        {} as Record<Currency, number>,
      );

    const prevTotalRevenue = Object.values(prevRevenueByCurrency).reduce(
      (sum, amount) => sum + amount,
      0,
    );

    // Calculate percentage changes (null when custom range)
    const ordersChange = previousRange
      ? calculatePercentageChange(totalOrders, prevTotalOrders)
      : null;
    const deliveredChange = previousRange
      ? calculatePercentageChange(deliveredOrders, prevDeliveredOrders)
      : null;
    const revenueChange = previousRange
      ? calculatePercentageChange(totalRevenue, prevTotalRevenue)
      : null;

    return {
      ...rep,
      stats: {
        totalOrders,
        deliveredOrders,
        conversionRate,
        revenue: totalRevenue,
        revenueByCurrency,
        trends: {
          orders: ordersChange,
          delivered: deliveredChange,
          revenue: revenueChange,
        },
      },
    };
  });

  // Calculate overall stats with trends
  const totalReps = salesReps.length;
  const activeReps = salesReps.filter((rep) => rep.isActive).length;

  // Current period totals
  const totalOrders = salesRepsWithStats.reduce(
    (sum, rep) => sum + rep.stats.totalOrders,
    0,
  );
  const avgConversion =
    salesRepsWithStats.length > 0
      ? Math.round(
          salesRepsWithStats.reduce(
            (sum, rep) => sum + rep.stats.conversionRate,
            0,
          ) / salesRepsWithStats.length,
        )
      : 0;

  // Previous period totals for trends (null when custom range)
  const prevTotalOrders = previousRange
    ? salesRepsWithStats.reduce((sum, rep) => {
        const prevOrders = rep.orders.filter(
          (o) =>
            o.createdAt >= previousRange!.startDate &&
            o.createdAt <= previousRange!.endDate &&
            o.status !== "CANCELLED",
        );
        return sum + prevOrders.length;
      }, 0)
    : null;

  const prevAvgConversion =
    previousRange && salesRepsWithStats.length > 0
      ? Math.round(
          salesRepsWithStats.reduce((sum, rep) => {
            const prevOrders = rep.orders.filter(
              (o) =>
                o.createdAt >= previousRange!.startDate &&
                o.createdAt <= previousRange!.endDate,
            );
            const prevDelivered = prevOrders.filter(
              (o) => o.status === "DELIVERED",
            ).length;
            const prevConv =
              prevOrders.length > 0
                ? (prevDelivered / prevOrders.length) * 100
                : 0;
            return sum + prevConv;
          }, 0) / salesRepsWithStats.length,
        )
      : null;

  return {
    salesReps: salesRepsWithStats,
    stats: {
      totalReps,
      activeReps,
      totalOrders,
      avgConversion,
      trends: {
        totalReps: 0, // Rep count doesn't change with period
        orders: prevTotalOrders !== null ? calculatePercentageChange(totalOrders, prevTotalOrders) : null,
        avgConversion: prevAvgConversion !== null ? calculatePercentageChange(avgConversion, prevAvgConversion) : null,
      },
    },
  };
}

interface SalesRepsPageProps {
  searchParams: Promise<{ period?: string; tz?: string; startDate?: string; endDate?: string }>;
}

export default async function SalesRepsPage({
  searchParams,
}: SalesRepsPageProps) {
  const ctx = await requireOrgContext();
  const params = await searchParams;
  const period = (params?.period || "month") as TimePeriod;
  const timezone = params?.tz;
  const startDate = params?.startDate;
  const endDate = params?.endDate;

  const [data, hoh] = await Promise.all([
    getSalesRepsData(ctx.organizationId, period, timezone, startDate, endDate),
    getCurrentHoH(ctx.organizationId),
  ]);

  return (
    <Suspense fallback={<SalesRepsPageSkeleton />}>
      <SalesRepsClient
        salesReps={data.salesReps}
        stats={data.stats}
        currentPeriod={period}
        hohUserId={hoh?.userId ?? null}
      />
    </Suspense>
  );
}

function SalesRepsPageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      {/* Search */}
      <Skeleton className="h-10 w-96" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      {/* Leaderboard */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>

      {/* Table */}
      <Skeleton className="h-96" />
    </div>
  );
}

"use server";

import { db } from "@/lib/db";
import { OrderStatus, Currency } from "@prisma/client";
import { calculateRevenue, calculateProfit } from "@/lib/calculations";
import {
  getDateRange,
  getPreviousPeriodRange,
  calculatePercentageChange,
  getTimeBuckets,
  getDayLabels,
} from "@/lib/date-utils";
import { requireOrgContext } from "@/lib/org-context";
import type {
  TimePeriod,
  DashboardStats,
  RevenueTrendData,
  TopProduct,
  OrderWithRelations,
} from "@/lib/types";

/**
 * Get comprehensive dashboard statistics with period comparison
 */
export async function getDashboardStats(
  period: TimePeriod = "today",
  currency?: Currency,
  timezone?: string,
  startDateParam?: string,
  endDateParam?: string,
) {
  try {
    const ctx = await requireOrgContext();
    const { organizationId } = ctx;

    let startDate: Date, endDate: Date, previousRange: { startDate: Date; endDate: Date } | null;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      previousRange = null;
    } else {
      ({ startDate, endDate } = getDateRange(period, timezone));
      previousRange = getPreviousPeriodRange(period, timezone);
    }

    const [
      currentRevenue,
      currentProfit,
      currentOrdersCount,
      currentDelivered,
      currentCancelled,
      previousRevenue,
      previousProfit,
      previousOrdersCount,
    ] = await Promise.all([
      calculateRevenue(startDate, endDate, undefined, currency, organizationId),
      calculateProfit(startDate, endDate, undefined, currency, organizationId),
      db.order.count({
        where: {
          organizationId,
          createdAt: { gte: startDate, lte: endDate },
          ...(currency && { currency }),
        },
      }),
      db.order.count({
        where: {
          organizationId,
          status: OrderStatus.DELIVERED,
          createdAt: { gte: startDate, lte: endDate },
          ...(currency && { currency }),
        },
      }),
      db.order.count({
        where: {
          organizationId,
          status: OrderStatus.CANCELLED,
          createdAt: { gte: startDate, lte: endDate },
          ...(currency && { currency }),
        },
      }),
      previousRange
        ? calculateRevenue(previousRange.startDate, previousRange.endDate, undefined, currency, organizationId)
        : Promise.resolve(0),
      previousRange
        ? calculateProfit(previousRange.startDate, previousRange.endDate, undefined, currency, organizationId)
        : Promise.resolve(0),
      previousRange
        ? db.order.count({
            where: {
              organizationId,
              createdAt: { gte: previousRange.startDate, lte: previousRange.endDate },
              ...(currency && { currency }),
            },
          })
        : Promise.resolve(0),
    ]);

    const fulfillmentRate =
      currentOrdersCount > 0
        ? Number(((currentDelivered / currentOrdersCount) * 100).toFixed(1))
        : 0;

    const cancelledRate =
      currentOrdersCount > 0
        ? Number(((currentCancelled / currentOrdersCount) * 100).toFixed(1))
        : 0;

    const revenueChange = previousRange ? calculatePercentageChange(currentRevenue, previousRevenue) : null;
    const profitChange = previousRange ? calculatePercentageChange(currentProfit, previousProfit) : null;
    const ordersChange = previousRange ? calculatePercentageChange(currentOrdersCount, previousOrdersCount) : null;

    const stats: DashboardStats = {
      revenue: currentRevenue,
      revenueChange,
      profit: currentProfit,
      profitChange,
      ordersCount: currentOrdersCount,
      ordersChange,
      deliveredCount: currentDelivered,
      fulfillmentRate,
      cancelledRate,
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return { success: false, error: "Failed to fetch dashboard statistics", data: null };
  }
}

/**
 * Get revenue trend data for charts (current vs previous period)
 */
export async function getRevenueTrend(
  period: TimePeriod = "today",
  currency?: Currency,
  timezone?: string,
  startDateParam?: string,
  endDateParam?: string,
) {
  try {
    const ctx = await requireOrgContext();
    const { organizationId } = ctx;

    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);
      const MS_PER_DAY = 24 * 60 * 60 * 1000;
      const numDays = Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1;

      const buckets: Date[] = Array.from({ length: numDays }, (_, i) =>
        new Date(startDate.getTime() + i * MS_PER_DAY)
      );

      const orders = await db.order.findMany({
        where: {
          organizationId,
          status: OrderStatus.DELIVERED,
          deliveredAt: { gte: startDate, lte: endDate },
          ...(currency && { currency }),
        },
        select: { deliveredAt: true, totalAmount: true },
      });

      const trendData: RevenueTrendData[] = buckets.map((bucket, index) => {
        const nextBucket = index < buckets.length - 1
          ? buckets[index + 1]
          : new Date(endDate.getTime() + 1);

        const revenue = orders
          .filter((o) => o.deliveredAt && o.deliveredAt >= bucket && o.deliveredAt < nextBucket)
          .reduce((sum, o) => sum + o.totalAmount, 0);

        const label = bucket.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return { label, current: revenue, previous: 0 };
      });

      return { success: true, data: trendData };
    }

    const { startDate, endDate } = getDateRange(period, timezone);
    const previousRange = getPreviousPeriodRange(period, timezone);

    const currentBuckets = getTimeBuckets(period, startDate, timezone);
    const previousBuckets = previousRange ? getTimeBuckets(period, previousRange.startDate, timezone) : [];
    const labels = getDayLabels(period);

    const [currentOrders, previousOrders] = await Promise.all([
      db.order.findMany({
        where: {
          organizationId,
          status: OrderStatus.DELIVERED,
          deliveredAt: { gte: startDate, lte: endDate },
          ...(currency && { currency }),
        },
        select: { deliveredAt: true, totalAmount: true },
      }),
      previousRange
        ? db.order.findMany({
            where: {
              organizationId,
              status: OrderStatus.DELIVERED,
              deliveredAt: { gte: previousRange.startDate, lte: previousRange.endDate },
              ...(currency && { currency }),
            },
            select: { deliveredAt: true, totalAmount: true },
          })
        : Promise.resolve([]),
    ]);

    const groupOrdersByBucket = (orders: typeof currentOrders, buckets: Date[]) =>
      buckets.map((bucket, index) => {
        const nextBucket = index < buckets.length - 1
          ? buckets[index + 1]
          : new Date(bucket.getTime() + 24 * 60 * 60 * 1000);

        return orders
          .filter((o) => o.deliveredAt && o.deliveredAt >= bucket && o.deliveredAt < nextBucket)
          .reduce((sum, o) => sum + o.totalAmount, 0);
      });

    const currentRevenues = groupOrdersByBucket(currentOrders, currentBuckets);
    const previousRevenues = previousBuckets.length > 0
      ? groupOrdersByBucket(previousOrders, previousBuckets)
      : [];

    const trendData: RevenueTrendData[] = labels.map((label, index) => ({
      label,
      current: currentRevenues[index] || 0,
      previous: previousRevenues[index] || 0,
    }));

    return { success: true, data: trendData };
  } catch (error) {
    console.error("Error fetching revenue trend:", error);
    return { success: false, error: "Failed to fetch revenue trend", data: null };
  }
}

/**
 * Get top selling products by revenue (scoped to org)
 */
export async function getTopProducts(
  period: TimePeriod = "today",
  limit: number = 3,
  currency?: Currency,
  timezone?: string,
  startDateParam?: string,
  endDateParam?: string,
) {
  try {
    const ctx = await requireOrgContext();
    const { organizationId } = ctx;

    let startDate: Date, endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      ({ startDate, endDate } = getDateRange(period, timezone));
    }

    const orders = await db.order.findMany({
      where: {
        organizationId,
        status: OrderStatus.DELIVERED,
        deliveredAt: { gte: startDate, lte: endDate },
        ...(currency && { currency }),
      },
      select: {
        items: {
          select: {
            productId: true,
            price: true,
            quantity: true,
            product: { select: { id: true, name: true, description: true } },
          },
        },
      },
    });

    const productMap = new Map<string, { id: string; name: string; description: string | null; revenue: number; ordersCount: number }>();

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const revenue = item.price * item.quantity;
        if (productMap.has(item.productId)) {
          const existing = productMap.get(item.productId)!;
          existing.revenue += revenue;
          existing.ordersCount += 1;
        } else {
          productMap.set(item.productId, {
            id: item.product.id,
            name: item.product.name,
            description: item.product.description,
            revenue,
            ordersCount: 1,
          });
        }
      });
    });

    const topProducts: TopProduct[] = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    return { success: true, data: topProducts };
  } catch (error) {
    console.error("Error fetching top products:", error);
    return { success: false, error: "Failed to fetch top products", data: null };
  }
}

/**
 * Get recent orders for display (scoped to org)
 */
export async function getRecentOrders(limit: number = 5) {
  const ctx = await requireOrgContext();

  const orders = await db.order.findMany({
    where: { organizationId: ctx.organizationId },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      agent: { select: { id: true, name: true, location: true } },
      items: {
        include: { product: { select: { id: true, name: true, price: true } } },
      },
      notes: true,
    },
  });

  return { success: true, data: orders as OrderWithRelations[] };
}

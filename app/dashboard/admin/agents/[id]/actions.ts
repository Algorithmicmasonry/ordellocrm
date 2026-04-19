"use server";

import { db } from "@/lib/db";
import { getDateRange, getPreviousPeriodRange } from "@/lib/date-utils";
import { revalidatePath } from "next/cache";
import type { Currency } from "@prisma/client";

type TimePeriod = "week" | "month" | "year";

/**
 * Get detailed agent information with performance metrics
 */
export async function getAgentDetails(agentId: string, period: TimePeriod = "month", currency?: Currency, timezone?: string) {
  try {
    const { startDate, endDate } = getDateRange(period, timezone);
    const previousRange = getPreviousPeriodRange(period, timezone);

    // Fetch agent with all relationships
    const agent = await db.agent.findUnique({
      where: { id: agentId },
      include: {
        stock: {
          include: {
            product: {
              include: {
                productPrices: true,
              },
            },
          },
        },
        orders: {
          where: {
            createdAt: { gte: previousRange.startDate, lte: endDate },
          },
          include: {
            items: { include: { product: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
            agent: { select: { id: true, name: true, location: true } },
            notes: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!agent) {
      return { success: false, error: "Agent not found" };
    }

    // Split current vs previous period orders
    const currentOrders = agent.orders.filter(
      (o) => o.createdAt >= startDate && o.createdAt <= endDate
    );
    const previousOrders = agent.orders.filter(
      (o) => o.createdAt >= previousRange.startDate && o.createdAt < startDate
    );

    // Calculate metrics
    const currentStats = calculateOrderStats(currentOrders);
    const previousStats = calculateOrderStats(previousOrders);

    // Calculate stock value using ProductPrice table
    const stockValue = agent.stock.reduce((sum, s) => {
      // Filter by currency if provided
      if (currency && s.product.currency !== currency) return sum;

      // Get the cost for the product's primary currency
      const productPrice = s.product.productPrices.find(
        (p) => p.currency === (currency || s.product.currency)
      );
      const cost = productPrice?.cost || 0;
      return sum + s.quantity * cost;
    }, 0);

    // Generate chart data
    const chartData = generateDeliveryChartData(currentOrders, period);

    return {
      success: true,
      data: {
        agent,
        currentStats,
        previousStats,
        stockValue,
        chartData,
        recentOrders: currentOrders,
        totalOrders: currentOrders.length,
      },
    };
  } catch (error) {
    console.error("Error fetching agent details:", error);
    return { success: false, error: "Failed to fetch agent details" };
  }
}

/**
 * Calculate order statistics for a set of orders
 */
function calculateOrderStats(orders: any[]) {
  const total = orders.length;
  const delivered = orders.filter((o) => o.status === "DELIVERED").length;
  const cancelled = orders.filter((o) => o.status === "CANCELLED").length;
  const inTransit = orders.filter(
    (o) => o.status === "DISPATCHED" || o.status === "CONFIRMED"
  ).length;
  const successRate = total > 0 ? (delivered / total) * 100 : 0;

  // Calculate revenue from delivered orders
  const revenue = orders
    .filter((o) => o.status === "DELIVERED")
    .reduce((sum, order) => {
      const orderTotal = order.items.reduce(
        (itemSum: number, item: any) => itemSum + item.price * item.quantity,
        0
      );
      return sum + orderTotal;
    }, 0);

  return {
    total,
    delivered,
    cancelled,
    inTransit,
    successRate: Math.round(successRate),
    revenue,
  };
}

/**
 * Generate chart data for delivery performance
 */
function generateDeliveryChartData(orders: any[], period: TimePeriod) {
  const days = period === "week" ? 7 : period === "month" ? 30 : 365;
  const chartData: { date: string; delivered: number; failed: number }[] = [];

  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const dayOrders = orders.filter((o) => {
      const orderDate = new Date(o.createdAt).toISOString().split("T")[0];
      return orderDate === dateStr;
    });

    const delivered = dayOrders.filter((o) => o.status === "DELIVERED").length;
    const failed = dayOrders.filter((o) => o.status === "CANCELLED").length;

    chartData.push({
      date: dateStr,
      delivered,
      failed,
    });
  }

  return chartData;
}

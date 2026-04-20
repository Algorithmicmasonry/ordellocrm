"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";
import { getDateRange, getPreviousPeriodRange } from "@/lib/date-utils";
import type { Currency } from "@prisma/client";

type TimePeriod = "week" | "month" | "year";

function requireAdmin(role: string) {
  if (role !== "ADMIN" && role !== "OWNER") throw new Error("Unauthorized");
}

export async function getAgentDetails(
  agentId: string,
  period: TimePeriod = "month",
  currency?: Currency,
  timezone?: string,
) {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    const { startDate, endDate } = getDateRange(period, timezone);
    const previousRange = getPreviousPeriodRange(period, timezone);

    const agent = await db.agent.findFirst({
      where: { id: agentId, organizationId: ctx.organizationId },
      include: {
        stock: {
          include: {
            product: { include: { productPrices: true } },
          },
        },
        orders: {
          where: {
            organizationId: ctx.organizationId,
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

    if (!agent) return { success: false, error: "Agent not found" };

    const currentOrders = agent.orders.filter(
      (o) => o.createdAt >= startDate && o.createdAt <= endDate
    );
    const previousOrders = agent.orders.filter(
      (o) => o.createdAt >= previousRange.startDate && o.createdAt < startDate
    );

    const currentStats = calculateOrderStats(currentOrders);
    const previousStats = calculateOrderStats(previousOrders);

    const stockValue = agent.stock.reduce((sum, s) => {
      if (currency && s.product.currency !== currency) return sum;
      const productPrice = s.product.productPrices.find(
        (p) => p.currency === (currency || s.product.currency)
      );
      const cost = productPrice?.cost || 0;
      return sum + s.quantity * cost;
    }, 0);

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

function calculateOrderStats(orders: any[]) {
  const total = orders.length;
  const delivered = orders.filter((o) => o.status === "DELIVERED").length;
  const cancelled = orders.filter((o) => o.status === "CANCELLED").length;
  const inTransit = orders.filter(
    (o) => o.status === "DISPATCHED" || o.status === "CONFIRMED"
  ).length;
  const successRate = total > 0 ? (delivered / total) * 100 : 0;

  const revenue = orders
    .filter((o) => o.status === "DELIVERED")
    .reduce((sum, order) => {
      const orderTotal = order.items.reduce(
        (itemSum: number, item: any) => itemSum + item.price * item.quantity,
        0
      );
      return sum + orderTotal;
    }, 0);

  return { total, delivered, cancelled, inTransit, successRate: Math.round(successRate), revenue };
}

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

    chartData.push({
      date: dateStr,
      delivered: dayOrders.filter((o) => o.status === "DELIVERED").length,
      failed: dayOrders.filter((o) => o.status === "CANCELLED").length,
    });
  }

  return chartData;
}

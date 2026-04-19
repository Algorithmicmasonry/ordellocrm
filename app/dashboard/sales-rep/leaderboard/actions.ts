"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { OrderStatus } from "@prisma/client";
import { getDateRange, getSpecificDayRange } from "@/lib/date-utils";
import type { TimePeriod } from "@/lib/types";
import { getCurrentHoH } from "@/lib/head-of-house";

export async function getLeaderboardData(
  period: TimePeriod = "week",
  timezone?: string,
  startDate?: string,
  endDate?: string
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "SALES_REP") {
      return { success: false, error: "Unauthorized" };
    }
    const currentUserId = session.user.id;

    const isCustomRange = !!(startDate && endDate);
    let start: Date;
    let end: Date;
    if (isCustomRange) {
      start = getSpecificDayRange(startDate!, timezone).startDate;
      end = getSpecificDayRange(endDate!, timezone).endDate;
    } else {
      const range = getDateRange(period, timezone);
      start = range.startDate;
      end = range.endDate;
    }

    // Get all active sales reps
    const reps = await db.user.findMany({
      where: { role: "SALES_REP", isActive: true },
      select: { id: true, name: true, email: true, image: true },
      orderBy: { name: "asc" },
    });

    if (reps.length === 0) {
      return { success: true, data: { reps: [], currentHoH: null, currentUserId } };
    }

    // Get orders for the period (non-cancelled only)
    const orders = await db.order.findMany({
      where: {
        assignedToId: { in: reps.map((r) => r.id) },
        createdAt: { gte: start, lte: end },
        status: { not: OrderStatus.CANCELLED },
      },
      select: { assignedToId: true, status: true, deliveredAt: true },
    });

    // Build per-rep stats
    const statsMap = new Map<
      string,
      { total: number; delivered: number }
    >();
    for (const rep of reps) {
      statsMap.set(rep.id, { total: 0, delivered: 0 });
    }
    for (const order of orders) {
      if (!order.assignedToId) continue;
      const s = statsMap.get(order.assignedToId);
      if (!s) continue;
      s.total += 1;
      if (
        order.status === OrderStatus.DELIVERED &&
        order.deliveredAt &&
        order.deliveredAt >= start &&
        order.deliveredAt <= end
      ) {
        s.delivered += 1;
      }
    }

    // Get current HoH
    const currentHoH = await getCurrentHoH();

    // Build ranked list
    const rankedReps = reps
      .map((rep) => {
        const stats = statsMap.get(rep.id) ?? { total: 0, delivered: 0 };
        const conversionRate =
          stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0;
        return {
          id: rep.id,
          name: rep.name,
          image: rep.image,
          totalOrders: stats.total,
          deliveredOrders: stats.delivered,
          conversionRate: Math.round(conversionRate * 10) / 10,
          isCurrentHoH: currentHoH?.userId === rep.id,
          isCurrentUser: rep.id === currentUserId,
        };
      })
      .sort((a, b) => {
        if (b.conversionRate !== a.conversionRate)
          return b.conversionRate - a.conversionRate;
        return b.deliveredOrders - a.deliveredOrders;
      })
      .map((rep, idx) => ({ ...rep, rank: idx + 1 }));

    return {
      success: true,
      data: {
        reps: rankedReps,
        currentHoH: currentHoH
          ? {
              userId: currentHoH.userId,
              name: currentHoH.user.name,
              titleWeekStart: currentHoH.titleWeekStart,
              titleWeekEnd: currentHoH.titleWeekEnd,
            }
          : null,
        currentUserId,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

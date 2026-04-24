"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";
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
    const ctx = await requireOrgContext();
    if (ctx.role !== "SALES_REP") return { success: false, error: "Unauthorized" };

    const currentUserId = ctx.userId;

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

    // Use OrganizationMember — role lives there in multi-tenant
    const members = await db.organizationMember.findMany({
      where: {
        organizationId: ctx.organizationId,
        role: "SALES_REP",
        isActive: true,
        isAiAgent: false,
      },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { user: { name: "asc" } },
    });

    if (members.length === 0) {
      return { success: true, data: { reps: [], currentHoH: null, currentUserId } };
    }

    const repIds = members.map((m) => m.userId);

    const orders = await db.order.findMany({
      where: {
        organizationId: ctx.organizationId,
        assignedToId: { in: repIds },
        createdAt: { gte: start, lte: end },
      },
      select: { assignedToId: true, status: true },
    });

    const statsMap = new Map<string, { total: number; delivered: number }>();
    for (const m of members) statsMap.set(m.userId, { total: 0, delivered: 0 });

    for (const order of orders) {
      if (!order.assignedToId) continue;
      const s = statsMap.get(order.assignedToId);
      if (!s) continue;
      s.total += 1;
      if (order.status === OrderStatus.DELIVERED) {
        s.delivered += 1;
      }
    }

    const currentHoH = await getCurrentHoH(ctx.organizationId);

    const rankedReps = members
      .map((m) => {
        const stats = statsMap.get(m.userId) ?? { total: 0, delivered: 0 };
        const conversionRate = stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0;
        return {
          id: m.userId,
          name: m.user.name,
          image: m.user.image,
          totalOrders: stats.total,
          deliveredOrders: stats.delivered,
          conversionRate: Math.round(conversionRate),
          isCurrentHoH: currentHoH?.userId === m.userId,
          isCurrentUser: m.userId === currentUserId,
        };
      })
      .sort((a, b) => {
        if (b.conversionRate !== a.conversionRate) return b.conversionRate - a.conversionRate;
        return b.deliveredOrders - a.deliveredOrders;
      })
      .map((rep, idx) => ({ ...rep, rank: idx + 1 }));

    return {
      success: true,
      data: {
        reps: rankedReps,
        currentHoH: currentHoH
          ? { userId: currentHoH.userId, name: currentHoH.user.name, titleWeekStart: currentHoH.titleWeekStart, titleWeekEnd: currentHoH.titleWeekEnd }
          : null,
        currentUserId,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

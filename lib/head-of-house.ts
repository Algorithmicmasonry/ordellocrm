import { db } from "./db";
import { OrderStatus } from "@prisma/client";

const WAT_OFFSET_MS = 1 * 60 * 60 * 1000;

export const HOH_POLICY_START = new Date("2026-03-01T00:00:00+01:00");

export function getWATWeekBounds(date: Date): { start: Date; end: Date } {
  const watMs = date.getTime() + WAT_OFFSET_MS;
  const watDate = new Date(watMs);
  const dow = watDate.getUTCDay();

  const sundayWat = new Date(watMs - dow * 86400000);
  sundayWat.setUTCHours(0, 0, 0, 0);

  const saturdayWat = new Date(sundayWat.getTime() + 6 * 86400000);
  saturdayWat.setUTCHours(23, 59, 59, 999);

  return {
    start: new Date(sundayWat.getTime() - WAT_OFFSET_MS),
    end: new Date(saturdayWat.getTime() - WAT_OFFSET_MS),
  };
}

/**
 * Computes the Head of House for an org's performance week.
 * All queries are scoped to organizationId.
 */
export async function computeHoH(weekDate: Date, organizationId: string) {
  const { start: perfStart, end: perfEnd } = getWATWeekBounds(weekDate);
  const titleStart = new Date(perfStart.getTime() + 7 * 86400000);
  const titleEnd = new Date(perfEnd.getTime() + 7 * 86400000);

  // Get active SALES_REP members of this org (excluding AI agents)
  const members = await db.organizationMember.findMany({
    where: { organizationId, role: "SALES_REP", isActive: true, isAiAgent: false },
    select: { userId: true },
  });

  if (members.length === 0) return null;
  const repIds = members.map((m) => m.userId);

  const weekOrders = await db.order.findMany({
    where: {
      organizationId,
      assignedToId: { in: repIds },
      createdAt: { gte: perfStart, lte: perfEnd },
      status: { not: OrderStatus.CANCELLED },
    },
    select: { id: true, assignedToId: true, status: true, deliveredAt: true },
  });

  const repStats = new Map<string, { total: number; delivered: number }>();
  for (const id of repIds) repStats.set(id, { total: 0, delivered: 0 });

  for (const order of weekOrders) {
    if (!order.assignedToId) continue;
    const s = repStats.get(order.assignedToId);
    if (!s) continue;
    s.total += 1;
    if (
      order.status === OrderStatus.DELIVERED &&
      order.deliveredAt &&
      order.deliveredAt >= perfStart &&
      order.deliveredAt <= perfEnd
    ) {
      s.delivered += 1;
    }
  }

  let winnerId: string | null = null;
  let winnerDelivered = -1;
  let winnerWeekRate = -1;

  for (const [repId, stats] of repStats) {
    if (stats.delivered === 0) continue;
    const weekRate = stats.total > 0 ? stats.delivered / stats.total : 0;

    if (weekRate > winnerWeekRate) {
      winnerId = repId;
      winnerDelivered = stats.delivered;
      winnerWeekRate = weekRate;
    } else if (weekRate === winnerWeekRate && stats.delivered > winnerDelivered) {
      winnerId = repId;
      winnerDelivered = stats.delivered;
    }
  }

  if (!winnerId) return null;

  // Resolve ties by all-time conversion rate
  const tiedReps = [...repStats.entries()].filter(([, s]) => {
    const r = s.total > 0 ? s.delivered / s.total : 0;
    return s.delivered === winnerDelivered && r === winnerWeekRate;
  });

  if (tiedReps.length > 1) {
    const allTimeOrders = await db.order.findMany({
      where: {
        organizationId,
        assignedToId: { in: tiedReps.map(([id]) => id) },
        status: { not: OrderStatus.CANCELLED },
      },
      select: { assignedToId: true, status: true },
    });

    const allTime = new Map<string, { total: number; delivered: number }>();
    for (const [id] of tiedReps) allTime.set(id, { total: 0, delivered: 0 });
    for (const o of allTimeOrders) {
      if (!o.assignedToId) continue;
      const s = allTime.get(o.assignedToId);
      if (!s) continue;
      s.total += 1;
      if (o.status === OrderStatus.DELIVERED) s.delivered += 1;
    }

    let bestRate = -1;
    for (const [id, s] of allTime) {
      const rate = s.total > 0 ? s.delivered / s.total : 0;
      if (rate > bestRate) { bestRate = rate; winnerId = id; }
    }
  }

  const finalStats = repStats.get(winnerId)!;
  const conversionRate = finalStats.total > 0 ? finalStats.delivered / finalStats.total : 0;

  // Upsert uses compound key (organizationId + performanceWeekStart)
  await db.headOfHouse.upsert({
    where: { organizationId_performanceWeekStart: { organizationId, performanceWeekStart: perfStart } },
    create: {
      organizationId,
      userId: winnerId,
      performanceWeekStart: perfStart,
      performanceWeekEnd: perfEnd,
      titleWeekStart: titleStart,
      titleWeekEnd: titleEnd,
      ordersDelivered: finalStats.delivered,
      conversionRate,
    },
    update: {
      userId: winnerId,
      performanceWeekEnd: perfEnd,
      titleWeekStart: titleStart,
      titleWeekEnd: titleEnd,
      ordersDelivered: finalStats.delivered,
      conversionRate,
    },
  });

  return db.headOfHouse.findUnique({
    where: { organizationId_performanceWeekStart: { organizationId, performanceWeekStart: perfStart } },
    include: { user: { select: { id: true, name: true } } },
  });
}

/**
 * Returns the current HoH for an org — the rep whose title week includes today.
 */
export async function getCurrentHoH(organizationId: string) {
  const now = new Date();
  return db.headOfHouse.findFirst({
    where: {
      organizationId,
      titleWeekStart: { lte: now },
      titleWeekEnd: { gte: now },
    },
    include: { user: { select: { id: true, name: true, image: true } } },
  });
}

/**
 * Returns all HoH title weeks that overlap the given range for an org.
 */
export async function getHoHWeeksInRange(
  start: Date,
  end: Date,
  organizationId: string,
): Promise<{ userId: string; titleWeekStart: Date; titleWeekEnd: Date }[]> {
  const now = new Date();
  return db.headOfHouse.findMany({
    where: {
      organizationId,
      titleWeekStart: { gte: start, lte: end },
      AND: { titleWeekStart: { lte: now } },
    },
    select: { userId: true, titleWeekStart: true, titleWeekEnd: true },
  });
}

/**
 * Computes HoH for all weeks in a date range that don't already have a record.
 */
export async function computeHoHForRange(start: Date, end: Date, organizationId: string) {
  const results = [];
  const current = new Date(Math.max(start.getTime(), HOH_POLICY_START.getTime()));
  const now = new Date();

  while (current <= end) {
    const { start: weekStart, end: weekEnd } = getWATWeekBounds(current);
    if (weekEnd >= now) break;

    const existing = await db.headOfHouse.findUnique({
      where: { organizationId_performanceWeekStart: { organizationId, performanceWeekStart: weekStart } },
    });
    if (!existing) {
      const result = await computeHoH(current, organizationId);
      if (result) results.push(result);
    }
    current.setDate(current.getDate() + 7);
  }

  return results;
}

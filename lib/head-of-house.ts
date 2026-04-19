import { db } from "./db";
import { OrderStatus } from "@prisma/client";

/** West African Time offset in milliseconds (UTC+1) */
const WAT_OFFSET_MS = 1 * 60 * 60 * 1000;

/**
 * HoH policy start date — the first Sunday-Saturday performance week
 * that is eligible for the Head of House competition (March 1, 2026).
 * No HoH records should be computed for weeks before this date.
 */
export const HOH_POLICY_START = new Date("2026-03-01T00:00:00+01:00"); // Mar 1 00:00 WAT

/**
 * Returns the Sunday 00:00:00 and Saturday 23:59:59 boundaries in WAT
 * for the calendar week that contains `date`.
 */
export function getWATWeekBounds(date: Date): { start: Date; end: Date } {
  // Convert to WAT by adding offset
  const watMs = date.getTime() + WAT_OFFSET_MS;
  const watDate = new Date(watMs);

  // Day of week: 0=Sun, 1=Mon, ..., 6=Sat
  const dow = watDate.getUTCDay(); // Sun=0

  const sundayWat = new Date(watMs - dow * 86400000);
  sundayWat.setUTCHours(0, 0, 0, 0);

  const saturdayWat = new Date(sundayWat.getTime() + 6 * 86400000);
  saturdayWat.setUTCHours(23, 59, 59, 999);

  // Convert back to UTC for storage
  return {
    start: new Date(sundayWat.getTime() - WAT_OFFSET_MS),
    end: new Date(saturdayWat.getTime() - WAT_OFFSET_MS),
  };
}

/**
 * Computes the Head of House for the performance week containing `weekDate`.
 *
 * Tie-breaking order:
 *   1. Most delivered orders that week
 *   2. Highest conversion rate (delivered / total non-cancelled) that week
 *   3. Highest all-time conversion rate
 *
 * The winner holds the HoH TITLE the following week.
 * Idempotent — upserts by performanceWeekStart.
 */
export async function computeHoH(weekDate: Date) {
  const { start: perfStart, end: perfEnd } = getWATWeekBounds(weekDate);

  // Title week = performance week + 7 days
  const titleStart = new Date(perfStart.getTime() + 7 * 86400000);
  const titleEnd = new Date(perfEnd.getTime() + 7 * 86400000);

  // Get all active sales reps
  const reps = await db.user.findMany({
    where: { role: "SALES_REP", isActive: true },
    select: { id: true },
  });

  if (reps.length === 0) return null;

  // Get all orders in the performance week for these reps
  const weekOrders = await db.order.findMany({
    where: {
      assignedToId: { in: reps.map((r) => r.id) },
      createdAt: { gte: perfStart, lte: perfEnd },
      status: { not: OrderStatus.CANCELLED },
    },
    select: { id: true, assignedToId: true, status: true, deliveredAt: true },
  });

  // Per-rep stats for this week
  const repStats = new Map<string, { total: number; delivered: number }>();
  for (const rep of reps) {
    repStats.set(rep.id, { total: 0, delivered: 0 });
  }
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

  // Find the winner: conversion rate first, delivered orders second
  let winnerId: string | null = null;
  let winnerDelivered = -1;
  let winnerWeekRate = -1;

  for (const [repId, stats] of repStats) {
    if (stats.delivered === 0) continue; // must have at least one delivery
    const weekRate = stats.total > 0 ? stats.delivered / stats.total : 0;

    if (weekRate > winnerWeekRate) {
      winnerId = repId;
      winnerDelivered = stats.delivered;
      winnerWeekRate = weekRate;
    } else if (weekRate === winnerWeekRate) {
      if (stats.delivered > winnerDelivered) {
        winnerId = repId;
        winnerDelivered = stats.delivered;
      }
      // exact tie on both → resolved below via all-time conversion rate
    }
  }

  if (!winnerId) return null;

  // Resolve remaining ties by all-time conversion rate
  const tiedReps = [...repStats.entries()].filter(([, s]) => {
    const r = s.total > 0 ? s.delivered / s.total : 0;
    return s.delivered === winnerDelivered && r === winnerWeekRate;
  });

  if (tiedReps.length > 1) {
    // Fetch all-time stats for tied reps
    const allTimeOrders = await db.order.findMany({
      where: {
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
      if (rate > bestRate) {
        bestRate = rate;
        winnerId = id;
      }
    }
  }

  const finalStats = repStats.get(winnerId)!;
  const conversionRate =
    finalStats.total > 0 ? finalStats.delivered / finalStats.total : 0;

  // Upsert the HoH record
  await db.headOfHouse.upsert({
    where: { performanceWeekStart: perfStart },
    create: {
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

  return await db.headOfHouse.findUnique({
    where: { performanceWeekStart: perfStart },
    include: { user: { select: { id: true, name: true } } },
  });
}

/**
 * Returns the current Head of House — the rep whose title week includes today.
 */
export async function getCurrentHoH() {
  const now = new Date();
  return db.headOfHouse.findFirst({
    where: {
      titleWeekStart: { lte: now },
      titleWeekEnd: { gte: now },
    },
    include: { user: { select: { id: true, name: true, image: true } } },
  });
}

/**
 * Returns all HoH records whose TITLE week overlaps the given range.
 * Used by payroll to calculate HoH bonuses for a month.
 */
export async function getHoHWeeksInRange(
  start: Date,
  end: Date
): Promise<{ userId: string; titleWeekStart: Date; titleWeekEnd: Date }[]> {
  const now = new Date();
  return db.headOfHouse.findMany({
    where: {
      // Payroll policy: pay HoH in the month the TITLE week starts.
      // So a week that starts in March and overlaps April is paid in March only.
      titleWeekStart: { gte: start, lte: end },
      // Exclude future title weeks — only count weeks that have already started.
      AND: { titleWeekStart: { lte: now } },
    },
    select: { userId: true, titleWeekStart: true, titleWeekEnd: true },
  });
}

/**
 * Computes HoH for every Monday-starting week within a date range
 * that doesn't already have a record. Idempotent.
 */
export async function computeHoHForRange(start: Date, end: Date) {
  const results = [];
  // Never go before the policy start date
  const current = new Date(Math.max(start.getTime(), HOH_POLICY_START.getTime()));
  const now = new Date();

  while (current <= end) {
    const { start: weekStart, end: weekEnd } = getWATWeekBounds(current);

    // Never compute HoH for a performance week that hasn't fully ended yet —
    // the winner can only be determined once all orders for the week are in.
    if (weekEnd >= now) break;

    const existing = await db.headOfHouse.findUnique({
      where: { performanceWeekStart: weekStart },
    });
    if (!existing) {
      const result = await computeHoH(current);
      if (result) results.push(result);
    }
    // Advance by 7 days
    current.setDate(current.getDate() + 7);
  }

  return results;
}

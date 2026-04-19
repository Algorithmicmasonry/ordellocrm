"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { OrderStatus } from "@prisma/client";
import { getHoHWeeksInRange, computeHoHForRange, HOH_POLICY_START } from "@/lib/head-of-house";

const HOH_DAILY_BONUS = 1500;
const HOH_BONUS_DAYS = 7;
const HOH_WEEK_BONUS = HOH_DAILY_BONUS * HOH_BONUS_DAYS; // ₦10,500

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

/** All users (SALES_REP + ADMIN) that have a pay rate set, plus all active SALES_REPs */
export async function getSalesRepsWithRates() {
  try {
    await requireAdmin();

    const [users, rates] = await Promise.all([
      db.user.findMany({
        where: { isActive: true, role: { in: ["SALES_REP", "ADMIN"] } },
        select: { id: true, name: true, email: true, role: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      }),
      db.salesRepRate.findMany({
        select: { userId: true, ratePerOrder: true, updatedAt: true },
      }),
    ]);

    const rateMap = new Map(rates.map((r) => [r.userId, r]));

    return {
      success: true,
      data: users.map((u) => ({
        ...u,
        rate: rateMap.get(u.id) ?? null,
      })),
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Set or update the pay rate for a user */
export async function setRepRate(userId: string, ratePerOrder: number) {
  try {
    const admin = await requireAdmin();

    await db.salesRepRate.upsert({
      where: { userId },
      create: { userId, ratePerOrder, createdById: admin.id },
      update: { ratePerOrder },
    });

    revalidatePath("/dashboard/admin/payroll");
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Parse "YYYY-MM" and return start/end Date objects in WAT (UTC+1).
 * Start = first day of month 00:00 WAT, End = last day 23:59:59 WAT.
 */
function parseMonthYear(monthYear: string): { start: Date; end: Date } {
  const [year, month] = monthYear.split("-").map(Number);
  // WAT = UTC+1, so midnight WAT = 23:00 prev day UTC
  const startWAT = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const startUTC = new Date(startWAT.getTime() - 60 * 60 * 1000);

  const endWAT = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const endUTC = new Date(endWAT.getTime() - 60 * 60 * 1000);

  return { start: startUTC, end: endUTC };
}

/**
 * Preview payroll for a given month without writing to DB.
 * Also computes missing HoH records for the period.
 */
export async function previewPayroll(monthYear: string) {
  try {
    await requireAdmin();

    const { start, end } = parseMonthYear(monthYear);

    // Compute any missing HoH weeks in the period
    await computeHoHForRange(start, end);

    // Get all users with rates
    const [rates, hohWeeks] = await Promise.all([
      db.salesRepRate.findMany({
        include: { user: { select: { id: true, name: true, role: true } } },
      }),
      getHoHWeeksInRange(start > HOH_POLICY_START ? start : HOH_POLICY_START, end),
    ]);

    // Count HoH title weeks per user in this month.
    // getHoHWeeksInRange already returns only weeks whose titleWeekStart is in [start, end].
    const hohWeeksPerUser = new Map<string, number>();
    for (const w of hohWeeks) {
      hohWeeksPerUser.set(w.userId, (hohWeeksPerUser.get(w.userId) ?? 0) + 1);
    }

    const items = await Promise.all(
      rates.map(async (rate) => {
        // SALES_REP: count their own delivered orders
        // ADMIN: count all delivered orders system-wide
        const deliveryWhere =
          rate.user.role === "SALES_REP"
            ? {
                assignedToId: rate.userId,
                status: OrderStatus.DELIVERED,
                deliveredAt: { gte: start, lte: end },
              }
            : {
                status: OrderStatus.DELIVERED,
                deliveredAt: { gte: start, lte: end },
              };

        const ordersDelivered = await db.order.count({ where: deliveryWhere });
        const hohWeeksCount = hohWeeksPerUser.get(rate.userId) ?? 0;
        const baseAmount = ordersDelivered * rate.ratePerOrder;
        const hohBonus = hohWeeksCount * HOH_WEEK_BONUS;

        return {
          userId: rate.userId,
          userName: rate.user.name,
          userRole: rate.user.role,
          ordersDelivered,
          ratePerOrder: rate.ratePerOrder,
          baseAmount,
          hohWeeks: hohWeeksCount,
          hohBonus,
          totalAmount: baseAmount + hohBonus,
        };
      })
    );

    const totalAmount = items.reduce((sum, i) => sum + i.totalAmount, 0);

    return { success: true, data: { items, totalAmount, start, end } };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Generate a payroll as DRAFT */
export async function generatePayroll(
  monthYear: string,
  label: string,
  notes?: string
) {
  try {
    const admin = await requireAdmin();

    // Check for duplicate
    const existing = await db.payroll.findUnique({ where: { monthYear } });
    if (existing) {
      return {
        success: false,
        error: "A payroll already exists for this month.",
      };
    }

    const preview = await previewPayroll(monthYear);
    if (!preview.success || !preview.data) {
      return { success: false, error: preview.error };
    }

    const { items, totalAmount, start, end } = preview.data;

    await db.payroll.create({
      data: {
        label,
        monthYear,
        startDate: start,
        endDate: end,
        status: "DRAFT",
        totalAmount,
        notes,
        createdById: admin.id,
        items: {
          create: items.map((i) => ({
            userId: i.userId,
            ordersDelivered: i.ordersDelivered,
            ratePerOrder: i.ratePerOrder,
            baseAmount: i.baseAmount,
            hohBonus: i.hohBonus,
            hohWeeks: i.hohWeeks,
            totalAmount: i.totalAmount,
          })),
        },
      },
    });

    revalidatePath("/dashboard/admin/payroll");
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Mark a payroll as PAID and create an Expense record */
export async function markPayrollPaid(payrollId: string) {
  try {
    await requireAdmin();

    const payroll = await db.payroll.findUnique({ where: { id: payrollId } });
    if (!payroll) return { success: false, error: "Payroll not found." };
    if (payroll.status === "PAID")
      return { success: false, error: "Already paid." };

    const now = new Date();

    await db.$transaction([
      db.payroll.update({
        where: { id: payrollId },
        data: { status: "PAID", paidAt: now },
      }),
      db.expense.create({
        data: {
          type: "payroll",
          amount: payroll.totalAmount,
          currency: "NGN",
          description: `Payroll: ${payroll.label}`,
          date: now,
          productId: null,
          batchQuantity: null,
        },
      }),
    ]);

    revalidatePath("/dashboard/admin/payroll");
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Delete a DRAFT payroll */
export async function deletePayroll(payrollId: string) {
  try {
    await requireAdmin();

    const payroll = await db.payroll.findUnique({ where: { id: payrollId } });
    if (!payroll) return { success: false, error: "Payroll not found." };
    if (payroll.status === "PAID")
      return { success: false, error: "Cannot delete a paid payroll." };

    await db.payroll.delete({ where: { id: payrollId } });
    revalidatePath("/dashboard/admin/payroll");
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Get all payrolls with their items */
export async function getPayrollHistory() {
  try {
    await requireAdmin();

    const payrolls = await db.payroll.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
          orderBy: { totalAmount: "desc" },
        },
        createdBy: { select: { name: true } },
      },
    });

    return { success: true, data: payrolls };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Get a single payroll draft for a given month (if exists) */
export async function getPayrollByMonth(monthYear: string) {
  try {
    await requireAdmin();

    const payroll = await db.payroll.findUnique({
      where: { monthYear },
      include: {
        items: {
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
          orderBy: { totalAmount: "desc" },
        },
      },
    });

    return { success: true, data: payroll };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

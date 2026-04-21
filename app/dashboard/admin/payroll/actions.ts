"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { OrderStatus } from "@prisma/client";
import { getHoHWeeksInRange, computeHoHForRange, HOH_POLICY_START } from "@/lib/head-of-house";
import { requireOrgContext } from "@/lib/org-context";

const HOH_DAILY_BONUS = 1500;
const HOH_BONUS_DAYS = 7;
const HOH_WEEK_BONUS = HOH_DAILY_BONUS * HOH_BONUS_DAYS; // ₦10,500

function requireAdmin(role: string) {
  if (role !== "ADMIN" && role !== "OWNER") throw new Error("Unauthorized");
}

/** All org members with pay rates + all active SALES_REPs */
export async function getSalesRepsWithRates() {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    const [members, rates] = await Promise.all([
      db.organizationMember.findMany({
        where: {
          organizationId: ctx.organizationId,
          isActive: true,
          role: { in: ["SALES_REP", "ADMIN", "OWNER"] },
        },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
      }),
      db.salesRepRate.findMany({
        where: { organizationId: ctx.organizationId },
        select: { userId: true, ratePerOrder: true, updatedAt: true },
      }),
    ]);

    const rateMap = new Map(rates.map((r) => [r.userId, r]));

    return {
      success: true,
      data: members.map((m) => ({
        id: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        rate: rateMap.get(m.userId) ?? null,
      })),
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Set or update the pay rate for a member of this org */
export async function setRepRate(userId: string, ratePerOrder: number) {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    // SalesRepRate unique is (organizationId, userId)
    await db.salesRepRate.upsert({
      where: { organizationId_userId: { organizationId: ctx.organizationId, userId } },
      create: { organizationId: ctx.organizationId, userId, ratePerOrder, createdById: ctx.userId },
      update: { ratePerOrder },
    });

    revalidatePath("/dashboard/admin/payroll");
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

function parseMonthYear(monthYear: string): { start: Date; end: Date } {
  const [year, month] = monthYear.split("-").map(Number);
  const startWAT = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const startUTC = new Date(startWAT.getTime() - 60 * 60 * 1000);
  const endWAT = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const endUTC = new Date(endWAT.getTime() - 60 * 60 * 1000);
  return { start: startUTC, end: endUTC };
}

/** Preview payroll for a given month without writing to DB */
export async function previewPayroll(monthYear: string) {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    const { start, end } = parseMonthYear(monthYear);

    await computeHoHForRange(start, end, ctx.organizationId);

    const [rates, hohWeeks] = await Promise.all([
      db.salesRepRate.findMany({
        where: { organizationId: ctx.organizationId },
        include: { user: { select: { id: true, name: true } } },
      }),
      getHoHWeeksInRange(
        start > HOH_POLICY_START ? start : HOH_POLICY_START,
        end,
        ctx.organizationId,
      ),
    ]);

    const hohWeeksPerUser = new Map<string, number>();
    for (const w of hohWeeks) {
      hohWeeksPerUser.set(w.userId, (hohWeeksPerUser.get(w.userId) ?? 0) + 1);
    }

    const items = await Promise.all(
      rates.map(async (rate) => {
        // Get their membership role to decide counting logic
        const member = await db.organizationMember.findUnique({
          where: { organizationId_userId: { organizationId: ctx.organizationId, userId: rate.userId } },
          select: { role: true },
        });

        const isAdmin = member?.role === "ADMIN" || member?.role === "OWNER";

        const deliveryWhere = isAdmin
          ? { organizationId: ctx.organizationId, status: OrderStatus.DELIVERED, deliveredAt: { gte: start, lte: end } }
          : { organizationId: ctx.organizationId, assignedToId: rate.userId, status: OrderStatus.DELIVERED, deliveredAt: { gte: start, lte: end } };

        const ordersDelivered = await db.order.count({ where: deliveryWhere });
        const hohWeeksCount = hohWeeksPerUser.get(rate.userId) ?? 0;
        const baseAmount = ordersDelivered * rate.ratePerOrder;
        const hohBonus = hohWeeksCount * HOH_WEEK_BONUS;

        return {
          userId: rate.userId,
          userName: rate.user.name,
          userRole: member?.role ?? "SALES_REP",
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
export async function generatePayroll(monthYear: string, label: string, notes?: string) {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    // Payroll unique is (organizationId, monthYear)
    const existing = await db.payroll.findUnique({
      where: { organizationId_monthYear: { organizationId: ctx.organizationId, monthYear } },
    });
    if (existing) return { success: false, error: "A payroll already exists for this month." };

    const preview = await previewPayroll(monthYear);
    if (!preview.success || !preview.data) return { success: false, error: preview.error };

    const { items, totalAmount, start, end } = preview.data;

    await db.payroll.create({
      data: {
        organizationId: ctx.organizationId,
        label,
        monthYear,
        startDate: start,
        endDate: end,
        status: "DRAFT",
        totalAmount,
        notes,
        createdById: ctx.userId,
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
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    const payroll = await db.payroll.findUnique({
      where: { id: payrollId, organizationId: ctx.organizationId },
    });
    if (!payroll) return { success: false, error: "Payroll not found." };
    if (payroll.status === "PAID") return { success: false, error: "Already paid." };

    const now = new Date();

    await db.$transaction([
      db.payroll.update({ where: { id: payrollId, organizationId: ctx.organizationId }, data: { status: "PAID", paidAt: now } }),
      db.expense.create({
        data: {
          organizationId: ctx.organizationId,
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
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    const payroll = await db.payroll.findUnique({
      where: { id: payrollId, organizationId: ctx.organizationId },
    });
    if (!payroll) return { success: false, error: "Payroll not found." };
    if (payroll.status === "PAID") return { success: false, error: "Cannot delete a paid payroll." };

    await db.payroll.delete({ where: { id: payrollId, organizationId: ctx.organizationId } });
    revalidatePath("/dashboard/admin/payroll");
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Get all payrolls for this org */
export async function getPayrollHistory() {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    const payrolls = await db.payroll.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { totalAmount: "desc" },
        },
      },
    });

    return { success: true, data: payrolls };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/** Get a single payroll for a given month in this org */
export async function getPayrollByMonth(monthYear: string) {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    const payroll = await db.payroll.findUnique({
      where: { organizationId_monthYear: { organizationId: ctx.organizationId, monthYear } },
      include: {
        items: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { totalAmount: "desc" },
        },
      },
    });

    return { success: true, data: payroll };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

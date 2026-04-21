"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";
import { revalidatePath } from "next/cache";
import type { AiCallStatus, AiCallOutcome } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AiDashboardStats {
  totalCallsMade: number;
  answeredCalls: number;
  answerRate: number;
  avgDurationSecs: number;
  ordersInPipeline: number;
  ordersReached: number;
  ordersUnreachable: number;
  ordersCompleted: number;
  outcomeBreakdown: { outcome: AiCallOutcome; count: number }[];
  statusBreakdown: { status: AiCallStatus; count: number }[];
}

export interface AiCallLogRow {
  id: string;
  orderId: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  attemptNumber: number;
  cycleNumber: number;
  outcome: AiCallOutcome | null;
  durationSecs: number | null;
  transcript: string | null;
  createdAt: Date;
}

export interface AiPipelineOrder {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  status: string;
  totalAmount: number;
  currency: string;
  aiCallStatus: AiCallStatus | null;
  aiCallAttempts: number;
  aiCycleNumber: number;
  aiNextCallAt: Date | null;
  createdAt: Date;
  lastCallOutcome: AiCallOutcome | null;
  lastCallAt: Date | null;
}

export interface SalesRepOption {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Get all dashboard data in one call
// ---------------------------------------------------------------------------

export async function getAiDashboardData(): Promise<
  | { success: true; stats: AiDashboardStats; recentCalls: AiCallLogRow[]; pipelineOrders: AiPipelineOrder[] }
  | { success: false; error: string }
> {
  try {
    const ctx = await requireOrgContext();
    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") throw new Error("Unauthorized");

    const orgOrderFilter = { organizationId: ctx.organizationId };

    const [
      callLogs,
      outcomeAgg,
      statusAgg,
      pipelineOrdersRaw,
      totalCallsMade,
      reachedCount,
      unreachableCount,
      completedCount,
    ] = await Promise.all([
      db.aiCallLog.findMany({
        where: { order: orgOrderFilter },
        include: {
          order: {
            select: { orderNumber: true, customerName: true, customerPhone: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.aiCallLog.groupBy({
        by: ["outcome"],
        _count: { outcome: true },
        where: { outcome: { not: null }, order: orgOrderFilter },
      }),
      db.order.groupBy({
        by: ["aiCallStatus"],
        _count: { aiCallStatus: true },
        where: { ...orgOrderFilter, aiCallStatus: { not: null }, isSandbox: false },
      }),
      db.order.findMany({
        where: {
          ...orgOrderFilter,
          aiCallStatus: { in: ["PENDING", "IN_PROGRESS", "REACHED", "UNREACHABLE"] },
          isSandbox: false,
        },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerPhone: true,
          status: true,
          totalAmount: true,
          currency: true,
          aiCallStatus: true,
          aiCallAttempts: true,
          aiCycleNumber: true,
          aiNextCallAt: true,
          createdAt: true,
          aiCallLogs: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { outcome: true, createdAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.aiCallLog.count({ where: { order: orgOrderFilter } }),
      db.order.count({ where: { ...orgOrderFilter, aiCallStatus: "REACHED", isSandbox: false } }),
      db.order.count({ where: { ...orgOrderFilter, aiCallStatus: "UNREACHABLE", isSandbox: false } }),
      db.order.count({ where: { ...orgOrderFilter, aiCallStatus: "COMPLETED", isSandbox: false } }),
    ]);

    const answeredTotal = outcomeAgg.find((o) => o.outcome === "ANSWERED")?._count.outcome ?? 0;
    const durations = callLogs.filter((l) => l.durationSecs != null);
    const avgDurationSecs =
      durations.length > 0
        ? Math.round(durations.reduce((sum, l) => sum + (l.durationSecs ?? 0), 0) / durations.length)
        : 0;
    const totalWithOutcome = outcomeAgg.reduce((sum, o) => sum + o._count.outcome, 0);

    const stats: AiDashboardStats = {
      totalCallsMade,
      answeredCalls: answeredTotal,
      answerRate: totalWithOutcome > 0 ? Math.round((answeredTotal / totalWithOutcome) * 100) : 0,
      avgDurationSecs,
      ordersInPipeline: pipelineOrdersRaw.length,
      ordersReached: reachedCount,
      ordersUnreachable: unreachableCount,
      ordersCompleted: completedCount,
      outcomeBreakdown: outcomeAgg.map((o) => ({ outcome: o.outcome!, count: o._count.outcome })),
      statusBreakdown: statusAgg.map((s) => ({ status: s.aiCallStatus!, count: s._count.aiCallStatus })),
    };

    const recentCalls: AiCallLogRow[] = callLogs.map((log) => ({
      id: log.id,
      orderId: log.orderId,
      orderNumber: log.order.orderNumber,
      customerName: log.order.customerName,
      customerPhone: log.order.customerPhone,
      attemptNumber: log.attemptNumber,
      cycleNumber: log.cycleNumber,
      outcome: log.outcome,
      durationSecs: log.durationSecs,
      transcript: log.transcript,
      createdAt: log.createdAt,
    }));

    const pipelineOrders: AiPipelineOrder[] = pipelineOrdersRaw.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      status: o.status,
      totalAmount: o.totalAmount,
      currency: o.currency,
      aiCallStatus: o.aiCallStatus,
      aiCallAttempts: o.aiCallAttempts,
      aiCycleNumber: o.aiCycleNumber,
      aiNextCallAt: o.aiNextCallAt,
      createdAt: o.createdAt,
      lastCallOutcome: o.aiCallLogs[0]?.outcome ?? null,
      lastCallAt: o.aiCallLogs[0]?.createdAt ?? null,
    }));

    return { success: true, stats, recentCalls, pipelineOrders };
  } catch (err) {
    console.error("[ai-agent/actions] getAiDashboardData error:", err);
    return { success: false, error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Retry a specific order's AI call
// ---------------------------------------------------------------------------

export async function retryAiCall(orderId: string) {
  try {
    const ctx = await requireOrgContext();
    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") throw new Error("Unauthorized");

    const order = await db.order.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!order) return { success: false as const, error: "Order not found" };

    await db.order.update({
      where: { id: orderId, organizationId: ctx.organizationId },
      data: { aiCallStatus: "PENDING", aiNextCallAt: new Date() },
    });

    revalidatePath("/dashboard/admin/ai-agent");
    return { success: true as const };
  } catch (err) {
    return { success: false as const, error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Cancel AI calls for an order (remove from pipeline)
// ---------------------------------------------------------------------------

export async function cancelAiCalls(orderId: string) {
  try {
    const ctx = await requireOrgContext();
    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") throw new Error("Unauthorized");

    const order = await db.order.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!order) return { success: false as const, error: "Order not found" };

    await db.order.update({
      where: { id: orderId, organizationId: ctx.organizationId },
      data: { aiCallStatus: "COMPLETED", aiNextCallAt: null },
    });

    revalidatePath("/dashboard/admin/ai-agent");
    return { success: true as const };
  } catch (err) {
    return { success: false as const, error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Get human sales reps for assignment dropdown
// ---------------------------------------------------------------------------

export async function getHumanSalesReps(): Promise<SalesRepOption[]> {
  const ctx = await requireOrgContext();
  if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") throw new Error("Unauthorized");

  // Use OrganizationMember — role lives on the member, not the User in multi-tenant
  const members = await db.organizationMember.findMany({
    where: {
      organizationId: ctx.organizationId,
      role: "SALES_REP",
      isActive: true,
      isAiAgent: false,
    },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return members.map((m) => ({ id: m.userId, name: m.user.name ?? "" }));
}

// ---------------------------------------------------------------------------
// Assign order from AI to a human sales rep
// ---------------------------------------------------------------------------

export async function assignToHuman(orderId: string, salesRepId: string) {
  try {
    const ctx = await requireOrgContext();
    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") throw new Error("Unauthorized");

    const [order, member] = await Promise.all([
      db.order.findFirst({
        where: { id: orderId, organizationId: ctx.organizationId },
        select: { id: true, orderNumber: true, customerName: true },
      }),
      db.organizationMember.findFirst({
        where: {
          userId: salesRepId,
          organizationId: ctx.organizationId,
          role: "SALES_REP",
        },
        include: { user: { select: { id: true, name: true } } },
      }),
    ]);

    if (!order) return { success: false as const, error: "Order not found" };
    if (!member) return { success: false as const, error: "Sales rep not found in this org" };
    if (!member.isActive) return { success: false as const, error: "Sales rep is not active" };
    if (member.isAiAgent) return { success: false as const, error: "Cannot assign to AI agent" };

    const repName = member.user.name ?? "Unknown";

    await db.$transaction([
      db.order.update({
        where: { id: orderId, organizationId: ctx.organizationId },
        data: {
          assignedToId: salesRepId,
          aiCallStatus: "COMPLETED",
          aiNextCallAt: null,
        },
      }),
      db.orderNote.create({
        data: {
          orderId,
          note: `Order reassigned from AI agent to ${repName} (manual handoff by admin)`,
        },
      }),
    ]);

    await db.notification.create({
      data: {
        organizationId: ctx.organizationId,
        userId: salesRepId,
        type: "ORDER_ASSIGNED",
        title: `Order #${order.orderNumber} assigned to you`,
        message: `${order.customerName} — reassigned from AI agent. Please follow up manually.`,
        link: `/dashboard/admin/orders/${orderId}`,
        orderId,
      },
    });

    revalidatePath("/dashboard/admin/ai-agent");
    revalidatePath("/dashboard");
    return { success: true as const, repName };
  } catch (err) {
    return { success: false as const, error: (err as Error).message };
  }
}

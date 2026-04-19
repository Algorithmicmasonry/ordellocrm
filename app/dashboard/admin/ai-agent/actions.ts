"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { AiCallStatus, AiCallOutcome } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AiDashboardStats {
  totalCallsMade: number;
  answeredCalls: number;
  answerRate: number; // percentage
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// ---------------------------------------------------------------------------
// Get all dashboard data in one call
// ---------------------------------------------------------------------------

export async function getAiDashboardData(): Promise<{
  success: true;
  stats: AiDashboardStats;
  recentCalls: AiCallLogRow[];
  pipelineOrders: AiPipelineOrder[];
} | { success: false; error: string }> {
  try {
    await requireAdmin();

    const [
      callLogs,
      outcomeAgg,
      statusAgg,
      pipelineOrdersRaw,
      reachedCount,
      unreachableCount,
      completedCount,
    ] = await Promise.all([
      // Recent call logs with order info
      db.aiCallLog.findMany({
        include: {
          order: {
            select: {
              orderNumber: true,
              customerName: true,
              customerPhone: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),

      // Outcome breakdown
      db.aiCallLog.groupBy({
        by: ["outcome"],
        _count: { outcome: true },
        where: { outcome: { not: null } },
      }),

      // Status breakdown (orders with AI status)
      db.order.groupBy({
        by: ["aiCallStatus"],
        _count: { aiCallStatus: true },
        where: { aiCallStatus: { not: null }, isSandbox: false },
      }),

      // Orders currently in the AI pipeline
      db.order.findMany({
        where: {
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

      // Counts by AI status
      db.order.count({ where: { aiCallStatus: "REACHED", isSandbox: false } }),
      db.order.count({ where: { aiCallStatus: "UNREACHABLE", isSandbox: false } }),
      db.order.count({ where: { aiCallStatus: "COMPLETED", isSandbox: false } }),
    ]);

    // Calculate stats
    const totalCallsMade = callLogs.length > 0
      ? await db.aiCallLog.count()
      : 0;

    const answeredLogs = callLogs.filter((l) => l.outcome === "ANSWERED");
    const answeredTotal = outcomeAgg.find((o) => o.outcome === "ANSWERED")?._count.outcome ?? 0;

    const durations = callLogs.filter((l) => l.durationSecs != null);
    const avgDurationSecs = durations.length > 0
      ? Math.round(durations.reduce((sum, l) => sum + (l.durationSecs ?? 0), 0) / durations.length)
      : 0;

    const totalWithOutcome = outcomeAgg.reduce((sum, o) => sum + o._count.outcome, 0);

    const stats: AiDashboardStats = {
      totalCallsMade: totalCallsMade || callLogs.length,
      answeredCalls: answeredTotal,
      answerRate: totalWithOutcome > 0 ? Math.round((answeredTotal / totalWithOutcome) * 100) : 0,
      avgDurationSecs,
      ordersInPipeline: pipelineOrdersRaw.length,
      ordersReached: reachedCount,
      ordersUnreachable: unreachableCount,
      ordersCompleted: completedCount,
      outcomeBreakdown: outcomeAgg.map((o) => ({
        outcome: o.outcome!,
        count: o._count.outcome,
      })),
      statusBreakdown: statusAgg.map((s) => ({
        status: s.aiCallStatus!,
        count: s._count.aiCallStatus,
      })),
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
    await requireAdmin();

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, aiCallStatus: true, isSandbox: true },
    });

    if (!order) return { success: false as const, error: "Order not found" };

    // Reset to PENDING with next call at now
    await db.order.update({
      where: { id: orderId },
      data: {
        aiCallStatus: "PENDING",
        aiNextCallAt: new Date(),
      },
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
    await requireAdmin();

    await db.order.update({
      where: { id: orderId },
      data: {
        aiCallStatus: "COMPLETED",
        aiNextCallAt: null,
      },
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

export interface SalesRepOption {
  id: string;
  name: string;
}

export async function getHumanSalesReps(): Promise<SalesRepOption[]> {
  await requireAdmin();

  const reps = await db.user.findMany({
    where: {
      role: "SALES_REP",
      isActive: true,
      isAiAgent: false,
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return reps;
}

// ---------------------------------------------------------------------------
// Assign order from AI to a human sales rep
// ---------------------------------------------------------------------------

export async function assignToHuman(orderId: string, salesRepId: string) {
  try {
    await requireAdmin();

    const [order, rep] = await Promise.all([
      db.order.findUnique({
        where: { id: orderId },
        select: { id: true, orderNumber: true, customerName: true },
      }),
      db.user.findUnique({
        where: { id: salesRepId },
        select: { id: true, name: true, isActive: true, isAiAgent: true },
      }),
    ]);

    if (!order) return { success: false as const, error: "Order not found" };
    if (!rep) return { success: false as const, error: "Sales rep not found" };
    if (!rep.isActive) return { success: false as const, error: "Sales rep is not active" };
    if (rep.isAiAgent) return { success: false as const, error: "Cannot assign to AI agent" };

    await db.$transaction([
      // Reassign the order and remove from AI pipeline
      db.order.update({
        where: { id: orderId },
        data: {
          assignedToId: salesRepId,
          aiCallStatus: "COMPLETED",
          aiNextCallAt: null,
        },
      }),
      // Add a note documenting the handoff
      db.orderNote.create({
        data: {
          orderId,
          note: `Order reassigned from AI agent to ${rep.name} (manual handoff by admin)`,
        },
      }),
    ]);

    // Notify the sales rep
    await db.notification.create({
      data: {
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
    return { success: true as const, repName: rep.name };
  } catch (err) {
    return { success: false as const, error: (err as Error).message };
  }
}

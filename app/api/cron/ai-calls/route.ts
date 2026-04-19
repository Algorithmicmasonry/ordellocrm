/**
 * Cron: AI Call Scheduler
 *
 * Runs every 15 minutes (configured in vercel.json).
 * Picks up orders where aiNextCallAt <= now and aiCallStatus is PENDING or UNREACHABLE,
 * then fires the next outbound call via Vapi.
 *
 * Protected by CRON_SECRET to prevent unauthorized invocations.
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import { triggerOutboundCall } from "@/lib/vapi";
import type { OrderContext } from "@/lib/ai-agent";

export const maxDuration = 60; // Allow up to 60s for processing multiple calls

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if Vapi is enabled
  if (process.env.VAPI_ENABLED !== "true") {
    return NextResponse.json({ skipped: true, reason: "VAPI_ENABLED is not true" });
  }

  try {
    const now = new Date();

    // Find orders due for a call
    const dueOrders = await db.order.findMany({
      where: {
        aiNextCallAt: { lte: now },
        aiCallStatus: { in: ["PENDING", "UNREACHABLE"] },
        status: { notIn: ["CANCELLED", "DELIVERED"] },
        isSandbox: false,
      },
      include: {
        items: { include: { product: true } },
      },
      take: 10, // Process max 10 per invocation to stay within timeout
      orderBy: { aiNextCallAt: "asc" },
    });

    if (dueOrders.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    console.log(`[cron/ai-calls] Found ${dueOrders.length} orders due for calls`);

    const results: { orderId: string; orderNumber: number; status: string }[] = [];

    for (const order of dueOrders) {
      try {
        const attemptNumber = order.aiCallAttempts + 1;
        const cycleNumber = order.aiCycleNumber;

        // Determine call stage based on order status
        let stage: "confirmation" | "dispatch" | "delivery" = "confirmation";
        if (order.status === "DISPATCHED") stage = "dispatch";
        if (order.status === "DELIVERED") stage = "delivery";

        // Build OrderContext
        const productName = order.items[0]?.product.name ?? "your product";
        const packageDesc = order.items
          .map((item) => `${item.quantity}x ${item.product.name}`)
          .join(", ");

        const ctx: OrderContext = {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerWhatsapp: order.customerWhatsapp ?? null,
          deliveryAddress: order.deliveryAddress,
          city: order.city,
          state: order.state,
          currency: order.currency,
          totalAmount: order.totalAmount,
          productName,
          packageName: packageDesc,
          aiCallAttempts: attemptNumber,
          aiCycleNumber: cycleNumber,
        };

        const vapiCallId = await triggerOutboundCall(ctx, attemptNumber, cycleNumber, stage);

        console.log(
          `[cron/ai-calls] Fired call for order #${order.orderNumber} attempt=${attemptNumber} cycle=${cycleNumber} vapiCallId=${vapiCallId}`,
        );

        results.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: "called",
        });
      } catch (err) {
        Sentry.captureException(err, {
          extra: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            attemptNumber: order.aiCallAttempts + 1,
          },
        });
        console.error(
          `[cron/ai-calls] Failed to call order #${order.orderNumber}:`,
          err,
        );

        // Schedule retry in 5 minutes so the cron picks it up next time
        try {
          await db.order.update({
            where: { id: order.id },
            data: { aiNextCallAt: new Date(now.getTime() + 5 * 60 * 1000) },
          });
        } catch {
          // If even this fails, Sentry has the original error
        }

        results.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: "failed",
        });
      }
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    Sentry.captureException(error);
    console.error("[cron/ai-calls] Fatal error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

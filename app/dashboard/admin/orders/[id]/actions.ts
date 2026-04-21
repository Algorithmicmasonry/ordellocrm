"use server";

import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";
import { revalidatePath } from "next/cache";
import { restoreInventoryFromDelivery } from "@/lib/calculations";

function requireAdmin(role: string) {
  if (role !== "ADMIN" && role !== "OWNER") throw new Error("Unauthorized");
}

export async function getOrderDetails(orderId: string) {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    const order = await db.order.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId },
      include: {
        items: { include: { product: true } },
        notes: { orderBy: { createdAt: "desc" } },
        agent: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    if (!order) return { success: false, error: "Order not found" };

    return { success: true, data: order };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to fetch order details" };
  }
}

export async function deleteOrder(orderId: string) {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    const order = await db.order.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId },
      select: { status: true },
    });

    if (!order) return { success: false, error: "Order not found" };

    if (order.status === "DELIVERED") {
      await restoreInventoryFromDelivery(orderId, ctx.organizationId, ctx.userId);
    }

    await db.order.delete({ where: { id: orderId, organizationId: ctx.organizationId } });

    revalidatePath("/dashboard/admin/orders");
    revalidatePath("/dashboard/admin/inventory");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to delete order" };
  }
}

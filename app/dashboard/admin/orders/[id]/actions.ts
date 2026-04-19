"use server";

import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { restoreInventoryFromDelivery } from "@/lib/calculations";

export async function getOrderDetails(orderId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    // Fetch order with all relations
    const order = await db.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        notes: {
          orderBy: {
            createdAt: "desc",
          },
        },
        agent: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    return { success: true, data: order };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to fetch order details" };
  }
}

export async function deleteOrder(orderId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    // If the order was delivered, restore inventory before deleting
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    if (order?.status === "DELIVERED") {
      await restoreInventoryFromDelivery(orderId, session.user.id);
    }

    await db.order.delete({ where: { id: orderId } });

    revalidatePath("/dashboard/admin/orders");
    revalidatePath("/dashboard/admin/inventory");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to delete order" };
  }
}

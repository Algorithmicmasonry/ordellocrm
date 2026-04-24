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

export async function getPackagesForProducts(productIds: string[]) {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    const packages = await db.productPackage.findMany({
      where: { productId: { in: productIds }, isActive: true },
      orderBy: [{ productId: "asc" }, { displayOrder: "asc" }],
    });

    const data: Record<string, typeof packages> = {};
    for (const pkg of packages) {
      if (!data[pkg.productId]) data[pkg.productId] = [];
      data[pkg.productId].push(pkg);
    }

    return { success: true as const, data };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false as const, error: "Failed to fetch packages", data: {} as Record<string, Awaited<ReturnType<typeof db.productPackage.findMany>>> };
  }
}

export async function updateOrderItems(
  orderId: string,
  changes: Array<{ itemId: string; packageId: string }>
) {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    const order = await db.order.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId },
      include: { items: true },
    });
    if (!order) return { success: false, error: "Order not found" };
    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      return { success: false, error: "Cannot edit a delivered or cancelled order" };
    }

    const packageIds = changes.map((c) => c.packageId);
    const packages = await db.productPackage.findMany({
      where: { id: { in: packageIds } },
    });
    const pkgMap = new Map(packages.map((p) => [p.id, p]));

    await db.$transaction(async (tx) => {
      for (const change of changes) {
        const pkg = pkgMap.get(change.packageId);
        if (!pkg) throw new Error(`Package ${change.packageId} not found`);

        const existingItem = order.items.find((i) => i.id === change.itemId);
        if (!existingItem) throw new Error(`Item ${change.itemId} not found`);

        await tx.orderItem.update({
          where: { id: change.itemId },
          data: {
            quantity: pkg.quantity,
            price: pkg.price / pkg.quantity,
            cost: existingItem.cost,
          },
        });
      }

      const updatedItems = await tx.orderItem.findMany({ where: { orderId } });
      const newTotal = updatedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      await tx.order.update({
        where: { id: orderId },
        data: { totalAmount: newTotal },
      });
    });

    revalidatePath("/dashboard/admin/orders");
    revalidatePath(`/dashboard/admin/orders/${orderId}`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error: any) {
    Sentry.captureException(error);
    return { success: false, error: error.message || "Failed to update order items" };
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

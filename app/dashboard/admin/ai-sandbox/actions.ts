"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";
import { revalidatePath } from "next/cache";

function requireAdmin(role: string) {
  if (role !== "ADMIN" && role !== "OWNER") throw new Error("Unauthorized");
}

export async function getSandboxOrders() {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    const orders = await db.order.findMany({
      where: { organizationId: ctx.organizationId, isSandbox: true },
      include: {
        assignedTo: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return { success: true as const, data: orders };
  } catch (err) {
    return { success: false as const, error: (err as Error).message };
  }
}

export async function deleteSandboxOrder(orderId: string) {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    const order = await db.order.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId, isSandbox: true },
    });

    if (!order) return { success: false as const, error: "Sandbox order not found" };

    await db.order.delete({ where: { id: orderId } });

    revalidatePath("/dashboard/admin/ai-sandbox");
    return { success: true as const };
  } catch (err) {
    return { success: false as const, error: (err as Error).message };
  }
}

export async function deleteAllSandboxOrders() {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    await db.order.deleteMany({
      where: { organizationId: ctx.organizationId, isSandbox: true },
    });

    revalidatePath("/dashboard/admin/ai-sandbox");
    return { success: true as const };
  } catch (err) {
    return { success: false as const, error: (err as Error).message };
  }
}

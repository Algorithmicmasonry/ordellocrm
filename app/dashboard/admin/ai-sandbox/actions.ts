"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function getSandboxOrders() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false as const, error: "Unauthorized" };
  }

  const orders = await db.order.findMany({
    where: { isSandbox: true },
    include: {
      assignedTo: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return { success: true as const, data: orders };
}

export async function deleteSandboxOrder(orderId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false as const, error: "Unauthorized" };
  }

  // Verify it's actually a sandbox order before deleting
  const order = await db.order.findFirst({
    where: { id: orderId, isSandbox: true },
  });

  if (!order) {
    return { success: false as const, error: "Sandbox order not found" };
  }

  await db.order.delete({ where: { id: orderId } });

  revalidatePath("/dashboard/admin/ai-sandbox");
  return { success: true as const };
}

export async function deleteAllSandboxOrders() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false as const, error: "Unauthorized" };
  }

  await db.order.deleteMany({ where: { isSandbox: true } });

  revalidatePath("/dashboard/admin/ai-sandbox");
  return { success: true as const };
}

"use server";

import { db } from "@/lib/db";
import { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { logStockMovement } from "@/lib/stock-movements";
import { requireOrgContext } from "@/lib/org-context";

export type StockCorrection = {
  productId: string;
  productName: string;
  currentStockBefore: number;
  correctedStock: number;
  adjustment: number;
  deliveredAgentOrders: number;
  details: string;
};

/**
 * Preview stock corrections without applying them (Admin only, org-scoped).
 *
 * Finds products where currentStock went negative due to the double-deduction
 * bug (agent orders incorrectly deducting from warehouse stock).
 */
export async function previewStockCorrections() {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Only admins can run stock corrections" };
    }

    // Find all delivered agent orders in this org
    const deliveredAgentOrders = await db.order.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: OrderStatus.DELIVERED,
        agentId: { not: null },
      },
      include: {
        items: { select: { productId: true, quantity: true } },
        agent: { select: { name: true } },
      },
    });

    // Sum incorrectly deducted quantities per product
    const productAdjustments = new Map<string, { quantity: number; orderCount: number }>();

    for (const order of deliveredAgentOrders) {
      for (const item of order.items) {
        const existing = productAdjustments.get(item.productId) || { quantity: 0, orderCount: 0 };
        existing.quantity += item.quantity;
        existing.orderCount += 1;
        productAdjustments.set(item.productId, existing);
      }
    }

    // Only fetch products from this org that need correction
    const products = await db.product.findMany({
      where: {
        organizationId: ctx.organizationId,
        id: { in: Array.from(productAdjustments.keys()) },
      },
      select: { id: true, name: true, currentStock: true },
    });

    const corrections: StockCorrection[] = [];

    for (const product of products) {
      const adjustment = productAdjustments.get(product.id);
      if (!adjustment) continue;

      const correctedStock = product.currentStock + adjustment.quantity;

      if (product.currentStock < 0) {
        corrections.push({
          productId: product.id,
          productName: product.name,
          currentStockBefore: product.currentStock,
          correctedStock,
          adjustment: adjustment.quantity,
          deliveredAgentOrders: adjustment.orderCount,
          details: `${adjustment.orderCount} delivered agent order item(s) totaling ${adjustment.quantity} units were double-deducted`,
        });
      }
    }

    return {
      success: true,
      data: {
        corrections,
        totalOrders: deliveredAgentOrders.length,
        affectedProducts: corrections.length,
      },
    };
  } catch (error) {
    console.error("Error previewing stock corrections:", error);
    return { success: false, error: "Failed to preview corrections" };
  }
}

/**
 * Apply stock corrections — adds back incorrectly deducted quantities (Admin only, org-scoped).
 */
export async function applyStockCorrections() {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Only admins can run stock corrections" };
    }

    // Recalculate (same logic as preview)
    const deliveredAgentOrders = await db.order.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: OrderStatus.DELIVERED,
        agentId: { not: null },
      },
      include: { items: { select: { productId: true, quantity: true } } },
    });

    const productAdjustments = new Map<string, number>();

    for (const order of deliveredAgentOrders) {
      for (const item of order.items) {
        productAdjustments.set(item.productId, (productAdjustments.get(item.productId) || 0) + item.quantity);
      }
    }

    // Only correct products with negative stock in this org
    const products = await db.product.findMany({
      where: {
        organizationId: ctx.organizationId,
        id: { in: Array.from(productAdjustments.keys()) },
        currentStock: { lt: 0 },
      },
      select: { id: true, name: true, currentStock: true },
    });

    const results: { productName: string; before: number; after: number }[] = [];

    for (const product of products) {
      const adjustment = productAdjustments.get(product.id) || 0;
      const correctedStock = product.currentStock + adjustment;

      await db.product.update({
        where: { id: product.id, organizationId: ctx.organizationId },
        data: { currentStock: correctedStock },
      });

      await logStockMovement({
        productId: product.id,
        organizationId: ctx.organizationId,
        type: "CORRECTION",
        quantity: adjustment,
        balanceAfter: correctedStock,
        userId: ctx.userId,
        note: `Auto-correction: reversed double-deduction from ${adjustment} delivered agent order items`,
      });

      results.push({ productName: product.name, before: product.currentStock, after: correctedStock });
    }

    revalidatePath("/dashboard/admin/inventory");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/admin");

    return {
      success: true,
      data: { correctedProducts: results.length, results },
    };
  } catch (error) {
    console.error("Error applying stock corrections:", error);
    return { success: false, error: "Failed to apply corrections" };
  }
}

"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { logStockMovement } from "@/lib/stock-movements";

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
 * Preview stock corrections without applying them.
 *
 * The bug: when an agent-fulfilled order was delivered, the old code
 * decremented BOTH Product.currentStock AND AgentStock.quantity.
 * But currentStock was already decremented when stock was distributed
 * to the agent — so it was double-counted.
 *
 * Fix: for each product, count the total quantity of delivered order items
 * where the order had an agent assigned. That total was incorrectly
 * deducted from currentStock and needs to be added back.
 */
export async function previewStockCorrections() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (user?.role !== "ADMIN") {
      return { success: false, error: "Only admins can run stock corrections" };
    }

    // Find all delivered orders that had an agent assigned
    const deliveredAgentOrders = await db.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        agentId: { not: null },
      },
      include: {
        items: {
          select: {
            productId: true,
            quantity: true,
          },
        },
        agent: {
          select: { name: true },
        },
      },
    });

    // Sum up incorrectly deducted quantities per product
    const productAdjustments = new Map<
      string,
      { quantity: number; orderCount: number }
    >();

    for (const order of deliveredAgentOrders) {
      for (const item of order.items) {
        const existing = productAdjustments.get(item.productId) || {
          quantity: 0,
          orderCount: 0,
        };
        existing.quantity += item.quantity;
        existing.orderCount += 1;
        productAdjustments.set(item.productId, existing);
      }
    }

    // Only include products that actually need correction (negative currentStock)
    const products = await db.product.findMany({
      where: {
        id: { in: Array.from(productAdjustments.keys()) },
      },
      select: {
        id: true,
        name: true,
        currentStock: true,
      },
    });

    const corrections: StockCorrection[] = [];

    for (const product of products) {
      const adjustment = productAdjustments.get(product.id);
      if (!adjustment) continue;

      const correctedStock = product.currentStock + adjustment.quantity;

      // Only include if stock is actually negative (needs correction)
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
 * Apply stock corrections — adds back the incorrectly deducted quantities
 * to Product.currentStock for affected products.
 */
export async function applyStockCorrections() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (user?.role !== "ADMIN") {
      return { success: false, error: "Only admins can run stock corrections" };
    }

    // Recalculate (same logic as preview)
    const deliveredAgentOrders = await db.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        agentId: { not: null },
      },
      include: {
        items: {
          select: {
            productId: true,
            quantity: true,
          },
        },
      },
    });

    const productAdjustments = new Map<string, number>();

    for (const order of deliveredAgentOrders) {
      for (const item of order.items) {
        const existing = productAdjustments.get(item.productId) || 0;
        productAdjustments.set(item.productId, existing + item.quantity);
      }
    }

    // Only correct products with negative stock
    const products = await db.product.findMany({
      where: {
        id: { in: Array.from(productAdjustments.keys()) },
        currentStock: { lt: 0 },
      },
      select: {
        id: true,
        name: true,
        currentStock: true,
      },
    });

    const results: { productName: string; before: number; after: number }[] =
      [];

    for (const product of products) {
      const adjustment = productAdjustments.get(product.id) || 0;
      const correctedStock = product.currentStock + adjustment;

      await db.product.update({
        where: { id: product.id },
        data: {
          currentStock: correctedStock,
        },
      });

      await logStockMovement({
        productId: product.id,
        type: "CORRECTION",
        quantity: adjustment,
        balanceAfter: correctedStock,
        userId: session.user.id,
        note: `Auto-correction: reversed double-deduction from ${adjustment} delivered agent order items`,
      });

      results.push({
        productName: product.name,
        before: product.currentStock,
        after: correctedStock,
      });
    }

    revalidatePath("/dashboard/admin/inventory");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/admin");

    return {
      success: true,
      data: {
        correctedProducts: results.length,
        results,
      },
    };
  } catch (error) {
    console.error("Error applying stock corrections:", error);
    return { success: false, error: "Failed to apply corrections" };
  }
}

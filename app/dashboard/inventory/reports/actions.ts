"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Get low stock report - Products at or below reorder point
 */
export async function getLowStockReport() {
  try {
    // Authorization check
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (user?.role !== "ADMIN" && user?.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Insufficient permissions" };
    }

    const products = await db.product.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        currentStock: {
          lte: db.product.fields.reorderPoint,
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        reorderPoint: true,
        currency: true,
        productPrices: true,
        updatedAt: true,
      },
      orderBy: {
        currentStock: "asc",
      },
    });

    return { success: true, data: products };
  } catch (error) {
    console.error("Error fetching low stock report:", error);
    return { success: false, error: "Failed to fetch low stock report" };
  }
}

/**
 * Get agent distribution stats - Warehouse vs agent breakdown
 */
export async function getAgentDistributionStats() {
  try {
    // Authorization check
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (user?.role !== "ADMIN" && user?.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Insufficient permissions" };
    }

    // Get warehouse stock
    const products = await db.product.findMany({
      where: {
        isDeleted: false,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        currentStock: true,
        currency: true,
        productPrices: true,
      },
    });

    const warehouseStock = products.reduce(
      (sum, product) => sum + product.currentStock,
      0,
    );
    const warehouseValue = products.reduce((sum, product) => {
      const productPrice = product.productPrices.find(
        (p) => p.currency === product.currency
      );
      const cost = productPrice?.cost || 0;
      return sum + product.currentStock * cost;
    }, 0);

    // Get agent stock
    const agents = await db.agent.findMany({
      where: {
        isActive: true,
      },
      include: {
        stock: {
          include: {
            product: {
              select: {
                name: true,
                currency: true,
                productPrices: true,
              },
            },
          },
        },
      },
    });

    const agentDistribution = agents.map((agent) => {
      const totalStock = agent.stock.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const stockValue = agent.stock.reduce((sum, item) => {
        const productPrice = item.product.productPrices.find(
          (p) => p.currency === item.product.currency
        );
        const cost = productPrice?.cost || 0;
        return sum + item.quantity * cost;
      }, 0);
      const defectiveCount = agent.stock.reduce(
        (sum, item) => sum + item.defective,
        0,
      );
      const missingCount = agent.stock.reduce(
        (sum, item) => sum + item.missing,
        0,
      );

      return {
        agentId: agent.id,
        agentName: agent.name,
        location: agent.location,
        totalStock,
        stockValue,
        defectiveCount,
        missingCount,
      };
    });

    const totalAgentStock = agentDistribution.reduce(
      (sum, agent) => sum + agent.totalStock,
      0,
    );
    const totalAgentValue = agentDistribution.reduce(
      (sum, agent) => sum + agent.stockValue,
      0,
    );

    return {
      success: true,
      data: {
        warehouse: {
          stock: warehouseStock,
          value: warehouseValue,
        },
        agents: {
          stock: totalAgentStock,
          value: totalAgentValue,
          distribution: agentDistribution,
        },
        totalStock: warehouseStock + totalAgentStock,
        totalValue: warehouseValue + totalAgentValue,
      },
    };
  } catch (error) {
    console.error("Error fetching agent distribution stats:", error);
    return {
      success: false,
      error: "Failed to fetch agent distribution stats",
    };
  }
}

/**
 * Get stock movement history - Recent stock changes
 */
export async function getStockMovementHistory(days: number = 30) {
  try {
    // Authorization check
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (user?.role !== "ADMIN" && user?.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Insufficient permissions" };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get recently updated products
    const products = await db.product.findMany({
      where: {
        isDeleted: false,
        updatedAt: {
          gte: startDate,
        },
      },
      select: {
        id: true,
        name: true,
        currentStock: true,
        openingStock: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 50,
    });

    return { success: true, data: products };
  } catch (error) {
    console.error("Error fetching stock movement history:", error);
    return { success: false, error: "Failed to fetch stock movement history" };
  }
}

/**
 * Get reorder recommendations based on current stock levels
 */
export async function getReorderRecommendations() {
  try {
    // Authorization check
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (user?.role !== "ADMIN" && user?.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Insufficient permissions" };
    }

    // Get products below or near reorder point
    const products = await db.product.findMany({
      where: {
        isDeleted: false,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        reorderPoint: true,
        currency: true,
        productPrices: true,
        openingStock: true,
      },
    });

    // Calculate recommendations
    const recommendations = products
      .filter((product) => product.currentStock <= product.reorderPoint * 1.5)
      .map((product) => {
        const productPrice = product.productPrices.find(
          (p) => p.currency === product.currency
        );
        const cost = productPrice?.cost || 0;

        const stockDeficit = product.reorderPoint - product.currentStock;
        const recommendedOrderQty =
          stockDeficit > 0 ? stockDeficit + product.reorderPoint : 0;

        // Estimate days until stockout (simple calculation)
        // Assuming constant daily usage based on difference between opening and current
        const totalUsed = product.openingStock - product.currentStock;
        const daysUntilStockout =
          totalUsed > 0 ? Math.floor(product.currentStock / (totalUsed / 30)) : 999;

        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          currentStock: product.currentStock,
          reorderPoint: product.reorderPoint,
          recommendedOrderQty,
          estimatedCost: recommendedOrderQty * cost,
          daysUntilStockout: Math.max(0, daysUntilStockout),
          urgency: (product.currentStock === 0
            ? "critical"
            : product.currentStock <= product.reorderPoint
              ? "high"
              : "medium") as "critical" | "high" | "medium",
        };
      })
      .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);

    return { success: true, data: recommendations };
  } catch (error) {
    console.error("Error fetching reorder recommendations:", error);
    return {
      success: false,
      error: "Failed to fetch reorder recommendations",
    };
  }
}

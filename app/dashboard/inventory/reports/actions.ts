"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";

function requireInventoryAccess(role: string) {
  if (role !== "ADMIN" && role !== "OWNER" && role !== "INVENTORY_MANAGER") {
    throw new Error("Unauthorized");
  }
}

export async function getLowStockReport() {
  try {
    const ctx = await requireOrgContext();
    requireInventoryAccess(ctx.role);

    const products = await db.product.findMany({
      where: {
        organizationId: ctx.organizationId,
        isDeleted: false,
        isActive: true,
        currentStock: { lte: db.product.fields.reorderPoint },
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
      orderBy: { currentStock: "asc" },
    });

    return { success: true, data: products };
  } catch (error) {
    console.error("Error fetching low stock report:", error);
    return { success: false, error: "Failed to fetch low stock report" };
  }
}

export async function getAgentDistributionStats() {
  try {
    const ctx = await requireOrgContext();
    requireInventoryAccess(ctx.role);

    const [products, agents] = await Promise.all([
      db.product.findMany({
        where: { organizationId: ctx.organizationId, isDeleted: false, isActive: true },
        select: { id: true, name: true, currentStock: true, currency: true, productPrices: true },
      }),
      db.agent.findMany({
        where: { organizationId: ctx.organizationId, isActive: true },
        include: {
          stock: {
            include: {
              product: { select: { name: true, currency: true, productPrices: true } },
            },
          },
        },
      }),
    ]);

    const warehouseStock = products.reduce((sum, p) => sum + p.currentStock, 0);
    const warehouseValue = products.reduce((sum, p) => {
      const productPrice = p.productPrices.find((pp) => pp.currency === p.currency);
      return sum + p.currentStock * (productPrice?.cost || 0);
    }, 0);

    const agentDistribution = agents.map((agent) => {
      const totalStock = agent.stock.reduce((sum, item) => sum + item.quantity, 0);
      const stockValue = agent.stock.reduce((sum, item) => {
        const productPrice = item.product.productPrices.find(
          (p) => p.currency === item.product.currency
        );
        return sum + item.quantity * (productPrice?.cost || 0);
      }, 0);
      const defectiveCount = agent.stock.reduce((sum, item) => sum + item.defective, 0);
      const missingCount = agent.stock.reduce((sum, item) => sum + item.missing, 0);

      return { agentId: agent.id, agentName: agent.name, location: agent.location, totalStock, stockValue, defectiveCount, missingCount };
    });

    const totalAgentStock = agentDistribution.reduce((sum, a) => sum + a.totalStock, 0);
    const totalAgentValue = agentDistribution.reduce((sum, a) => sum + a.stockValue, 0);

    return {
      success: true,
      data: {
        warehouse: { stock: warehouseStock, value: warehouseValue },
        agents: { stock: totalAgentStock, value: totalAgentValue, distribution: agentDistribution },
        totalStock: warehouseStock + totalAgentStock,
        totalValue: warehouseValue + totalAgentValue,
      },
    };
  } catch (error) {
    console.error("Error fetching agent distribution stats:", error);
    return { success: false, error: "Failed to fetch agent distribution stats" };
  }
}

export async function getStockMovementHistory(days: number = 30) {
  try {
    const ctx = await requireOrgContext();
    requireInventoryAccess(ctx.role);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const products = await db.product.findMany({
      where: {
        organizationId: ctx.organizationId,
        isDeleted: false,
        updatedAt: { gte: startDate },
      },
      select: {
        id: true,
        name: true,
        currentStock: true,
        openingStock: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    return { success: true, data: products };
  } catch (error) {
    console.error("Error fetching stock movement history:", error);
    return { success: false, error: "Failed to fetch stock movement history" };
  }
}

export async function getReorderRecommendations() {
  try {
    const ctx = await requireOrgContext();
    requireInventoryAccess(ctx.role);

    const products = await db.product.findMany({
      where: { organizationId: ctx.organizationId, isDeleted: false, isActive: true },
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

    const recommendations = products
      .filter((p) => p.currentStock <= p.reorderPoint * 1.5)
      .map((product) => {
        const productPrice = product.productPrices.find((p) => p.currency === product.currency);
        const cost = productPrice?.cost || 0;
        const stockDeficit = product.reorderPoint - product.currentStock;
        const recommendedOrderQty = stockDeficit > 0 ? stockDeficit + product.reorderPoint : 0;
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
    return { success: false, error: "Failed to fetch reorder recommendations" };
  }
}

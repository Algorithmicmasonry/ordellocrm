"use server";

import { db } from "@/lib/db";
import type { Currency } from "@prisma/client";

/**
 * Get agent statistics
 */
export async function getAgentStats(currency?: Currency) {
  try {
    // Total agents
    const totalAgents = await db.agent.count();

    // Active agents (with active orders)
    const activeAgents = await db.agent.count({
      where: {
        isActive: true,
      },
    });

    // Total stock value with agents
    const agentStocks = await db.agentStock.findMany({
      include: {
        product: {
          include: {
            productPrices: true,
          },
        },
      },
    });

    const totalStockValue = agentStocks.reduce((sum, stock) => {
      // Filter by currency if provided
      if (currency && stock.product.currency !== currency) return sum;

      const productPrice = stock.product.productPrices.find(
        (p) => p.currency === (currency || stock.product.currency)
      );
      const cost = productPrice?.cost || 0;
      return sum + stock.quantity * cost;
    }, 0);

    // Calculate total defective stock value
    const totalDefectiveValue = agentStocks.reduce((sum, stock) => {
      // Filter by currency if provided
      if (currency && stock.product.currency !== currency) return sum;

      const productPrice = stock.product.productPrices.find(
        (p) => p.currency === (currency || stock.product.currency)
      );
      const cost = productPrice?.cost || 0;
      return sum + stock.defective * cost;
    }, 0);

    // Calculate total missing stock value
    const totalMissingValue = agentStocks.reduce((sum, stock) => {
      // Filter by currency if provided
      if (currency && stock.product.currency !== currency) return sum;

      const productPrice = stock.product.productPrices.find(
        (p) => p.currency === (currency || stock.product.currency)
      );
      const cost = productPrice?.cost || 0;
      return sum + stock.missing * cost;
    }, 0);

    // Calculate total pending deliveries (CONFIRMED + DISPATCHED orders)
    const pendingDeliveries = await db.order.count({
      where: {
        status: {
          in: ["CONFIRMED", "DISPATCHED"],
        },
      },
    });

    return {
      success: true,
      data: {
        totalAgents,
        activeAgents,
        totalStockValue,
        totalDefectiveValue,
        totalMissingValue,
        pendingDeliveries,
      },
    };
  } catch (error) {
    console.error("Error fetching agent stats:", error);
    return {
      success: false,
      error: "Failed to fetch agent statistics",
    };
  }
}

/**
 * Get agents with performance metrics
 */
export async function getAgentsWithMetrics(filters?: {
  search?: string;
  zone?: string;
  status?: "active" | "inactive" | "order-in-progress";
}) {
  try {
    const whereClause: any = {};

    // Apply filters
    if (filters?.search) {
      whereClause.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.zone) {
      whereClause.location = { contains: filters.zone, mode: "insensitive" };
    }

    if (filters?.status === "active" || filters?.status === "inactive") {
      whereClause.isActive = filters.status === "active";
    }

    const agents = await db.agent.findMany({
      where: whereClause,
      include: {
        stock: {
          include: {
            product: {
              include: {
                productPrices: true,
              },
            },
          },
        },
        orders: {
          where: {
            status: {
              in: ["DELIVERED", "CANCELLED", "DISPATCHED", "CONFIRMED"],
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate metrics for each agent
    const agentsWithMetrics = agents.map((agent) => {
      // Calculate stock value using ProductPrice table
      const stockValue = agent.stock.reduce((sum, stock) => {
        const productPrice = stock.product.productPrices.find(
          (p) => p.currency === stock.product.currency
        );
        const cost = productPrice?.cost || 0;
        return sum + stock.quantity * cost;
      }, 0);

      // Calculate success rate
      const completedOrders = agent.orders.filter(
        (o) => o.status === "DELIVERED" || o.status === "CANCELLED",
      );
      const deliveredOrders = agent.orders.filter(
        (o) => o.status === "DELIVERED",
      );
      const successRate =
        completedOrders.length > 0
          ? (deliveredOrders.length / completedOrders.length) * 100
          : 0;

      // Determine status
      const hasActiveOrders = agent.orders.some(
        (o) => o.status === "DISPATCHED" || o.status === "CONFIRMED",
      );
      const status: "active" | "inactive" | "order-in-progress" = !agent.isActive
        ? "inactive"
        : hasActiveOrders
          ? "order-in-progress"
          : "active";

      return {
        id: agent.id,
        name: agent.name,
        phone: agent.phone,
        location: agent.location,
        address: agent.address,
        isActive: agent.isActive,
        stockValue,
        successRate: Math.round(successRate),
        status,
        totalOrders: agent.orders.length,
        deliveredOrders: deliveredOrders.length,
        createdAt: agent.createdAt,
      };
    });

    return {
      success: true,
      data: agentsWithMetrics,
    };
  } catch (error) {
    console.error("Error fetching agents with metrics:", error);
    return {
      success: false,
      error: "Failed to fetch agents",
    };
  }
}

/**
 * Get unique zones/locations from agents
 */
export async function getUniqueZones() {
  try {
    const agents = await db.agent.findMany({
      select: {
        location: true,
      },
      distinct: ["location"],
    });

    const zones = agents.map((a) => a.location).filter(Boolean);

    return {
      success: true,
      data: zones,
    };
  } catch (error) {
    console.error("Error fetching zones:", error);
    return {
      success: false,
      error: "Failed to fetch zones",
    };
  }
}

/**
 * Toggle agent active status
 */
export async function toggleAgentStatus(agentId: string) {
  try {
    const agent = await db.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return {
        success: false,
        error: "Agent not found",
      };
    }

    const updatedAgent = await db.agent.update({
      where: { id: agentId },
      data: {
        isActive: !agent.isActive,
      },
    });

    return {
      success: true,
      data: updatedAgent,
    };
  } catch (error) {
    console.error("Error toggling agent status:", error);
    return {
      success: false,
      error: "Failed to update agent status",
    };
  }
}

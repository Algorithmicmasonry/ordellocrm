"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";
import { revalidatePath } from "next/cache";
import type { Currency } from "@prisma/client";

function requireAdmin(role: string) {
  if (role !== "ADMIN" && role !== "OWNER") throw new Error("Unauthorized");
}

export async function getAgentStats(currency?: Currency) {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    const [totalAgents, activeAgents, agentStocks, pendingDeliveries] = await Promise.all([
      db.agent.count({ where: { organizationId: ctx.organizationId } }),
      db.agent.count({ where: { organizationId: ctx.organizationId, isActive: true } }),
      db.agentStock.findMany({
        where: { agent: { organizationId: ctx.organizationId } },
        include: {
          product: { include: { productPrices: true } },
        },
      }),
      db.order.count({
        where: {
          organizationId: ctx.organizationId,
          status: { in: ["CONFIRMED", "DISPATCHED"] },
        },
      }),
    ]);

    const calcValue = (field: "quantity" | "defective" | "missing") =>
      agentStocks.reduce((sum, stock) => {
        if (currency && stock.product.currency !== currency) return sum;
        const productPrice = stock.product.productPrices.find(
          (p) => p.currency === (currency || stock.product.currency)
        );
        const cost = productPrice?.cost || 0;
        return sum + stock[field] * cost;
      }, 0);

    return {
      success: true,
      data: {
        totalAgents,
        activeAgents,
        totalStockValue: calcValue("quantity"),
        totalDefectiveValue: calcValue("defective"),
        totalMissingValue: calcValue("missing"),
        pendingDeliveries,
      },
    };
  } catch (error) {
    console.error("Error fetching agent stats:", error);
    return { success: false, error: "Failed to fetch agent statistics" };
  }
}

export async function getAgentsWithMetrics(filters?: {
  search?: string;
  zone?: string;
  status?: "active" | "inactive" | "order-in-progress";
}) {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    const whereClause: any = { organizationId: ctx.organizationId };

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
            product: { include: { productPrices: true } },
          },
        },
        orders: {
          where: {
            organizationId: ctx.organizationId,
            status: { in: ["DELIVERED", "CANCELLED", "DISPATCHED", "CONFIRMED"] },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const agentsWithMetrics = agents.map((agent) => {
      const stockValue = agent.stock.reduce((sum, stock) => {
        const productPrice = stock.product.productPrices.find(
          (p) => p.currency === stock.product.currency
        );
        const cost = productPrice?.cost || 0;
        return sum + stock.quantity * cost;
      }, 0);

      const completedOrders = agent.orders.filter(
        (o) => o.status === "DELIVERED" || o.status === "CANCELLED"
      );
      const deliveredOrders = agent.orders.filter((o) => o.status === "DELIVERED");
      const successRate =
        completedOrders.length > 0
          ? (deliveredOrders.length / completedOrders.length) * 100
          : 0;

      const hasActiveOrders = agent.orders.some(
        (o) => o.status === "DISPATCHED" || o.status === "CONFIRMED"
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

    return { success: true, data: agentsWithMetrics };
  } catch (error) {
    console.error("Error fetching agents with metrics:", error);
    return { success: false, error: "Failed to fetch agents" };
  }
}

export async function getUniqueZones() {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    const agents = await db.agent.findMany({
      where: { organizationId: ctx.organizationId },
      select: { location: true },
      distinct: ["location"],
    });

    const zones = agents.map((a) => a.location).filter(Boolean);
    return { success: true, data: zones };
  } catch (error) {
    console.error("Error fetching zones:", error);
    return { success: false, error: "Failed to fetch zones" };
  }
}

export async function toggleAgentStatus(agentId: string) {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    const agent = await db.agent.findFirst({
      where: { id: agentId, organizationId: ctx.organizationId },
    });

    if (!agent) return { success: false, error: "Agent not found" };

    const updatedAgent = await db.agent.update({
      where: { id: agentId, organizationId: ctx.organizationId },
      data: { isActive: !agent.isActive },
    });

    revalidatePath("/dashboard/admin/agents");
    return { success: true, data: updatedAgent };
  } catch (error) {
    console.error("Error toggling agent status:", error);
    return { success: false, error: "Failed to update agent status" };
  }
}

"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { logStockMovement } from "@/lib/stock-movements"
import { requireOrgContext } from "@/lib/org-context"

/**
 * Create a new agent (Admin only)
 */
export async function createAgent(data: {
  name: string
  phone: string
  location: string
  address?: string
}) {
  try {
    const ctx = await requireOrgContext()

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Admin access required" }
    }

    const agent = await db.agent.create({
      data: { ...data, organizationId: ctx.organizationId },
    })

    revalidatePath("/dashboard/admin/agents")
    return { success: true, agent }
  } catch (error) {
    console.error("Error creating agent:", error)
    return { success: false, error: "Failed to create agent" }
  }
}

/**
 * Update agent (Admin only)
 */
export async function updateAgent(
  agentId: string,
  data: {
    name?: string
    phone?: string
    location?: string
    address?: string
    isActive?: boolean
  }
) {
  try {
    const ctx = await requireOrgContext()

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Admin access required" }
    }

    const agent = await db.agent.update({
      where: { id: agentId, organizationId: ctx.organizationId },
      data,
    })

    revalidatePath("/dashboard/admin/agents")
    return { success: true, agent }
  } catch (error) {
    console.error("Error updating agent:", error)
    return { success: false, error: "Failed to update agent" }
  }
}

/**
 * Assign stock to agent (Admin and Inventory Manager)
 */
export async function assignStockToAgent(
  agentId: string,
  productId: string,
  quantity: number
) {
  try {
    const ctx = await requireOrgContext()

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER" && ctx.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Insufficient permissions" }
    }

    // Verify agent and product both belong to this org
    const [agent, product] = await Promise.all([
      db.agent.findUnique({
        where: { id: agentId, organizationId: ctx.organizationId },
        select: { id: true },
      }),
      db.product.findUnique({
        where: { id: productId, organizationId: ctx.organizationId },
        select: { currentStock: true, name: true },
      }),
    ])

    if (!agent) return { success: false, error: "Agent not found" }
    if (!product) return { success: false, error: "Product not found" }

    if (product.currentStock < quantity) {
      return {
        success: false,
        error: product.currentStock <= 0
          ? `${product.name} is out of stock in the warehouse (current stock: ${product.currentStock}).`
          : `Insufficient warehouse stock for ${product.name}. Available: ${product.currentStock}, requested: ${quantity}.`,
      }
    }

    const existingStock = await db.agentStock.findUnique({
      where: { agentId_productId: { agentId, productId } },
    })

    let agentStock

    if (existingStock) {
      agentStock = await db.agentStock.update({
        where: { agentId_productId: { agentId, productId } },
        data: { quantity: { increment: quantity } },
      })
    } else {
      agentStock = await db.agentStock.create({
        data: { agentId, productId, quantity },
      })
    }

    const updatedProduct = await db.product.update({
      where: { id: productId, organizationId: ctx.organizationId },
      data: { currentStock: { decrement: quantity } },
    })

    await logStockMovement({
      productId,
      organizationId: ctx.organizationId,
      type: "DISTRIBUTED_TO_AGENT",
      quantity: -quantity,
      balanceAfter: updatedProduct.currentStock,
      agentId,
      userId: ctx.userId,
    })

    revalidatePath("/dashboard/admin/agents")
    revalidatePath("/dashboard/admin/inventory")
    revalidatePath("/dashboard/inventory")
    return { success: true, agentStock }
  } catch (error) {
    console.error("Error assigning stock to agent:", error)
    return { success: false, error: "Failed to assign stock to agent" }
  }
}

/**
 * Update agent stock defective/missing items (Admin and Inventory Manager)
 */
export async function updateAgentStockIssues(
  agentId: string,
  productId: string,
  defective?: number,
  missing?: number
) {
  try {
    const ctx = await requireOrgContext()

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER" && ctx.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Insufficient permissions" }
    }

    // Verify agent belongs to this org
    const agent = await db.agent.findUnique({
      where: { id: agentId, organizationId: ctx.organizationId },
      select: { id: true },
    })
    if (!agent) return { success: false, error: "Agent not found" }

    const updateData: any = {}
    if (defective !== undefined) updateData.defective = defective
    if (missing !== undefined) updateData.missing = missing

    const agentStock = await db.agentStock.update({
      where: { agentId_productId: { agentId, productId } },
      data: updateData,
    })

    revalidatePath("/dashboard/admin/agents")
    revalidatePath("/dashboard/admin/inventory")
    return { success: true, agentStock }
  } catch (error) {
    console.error("Error updating agent stock issues:", error)
    return { success: false, error: "Failed to update stock issues" }
  }
}

/**
 * Get all agents (scoped to org)
 */
export async function getAllAgents() {
  try {
    const ctx = await requireOrgContext()

    const agents = await db.agent.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        stock: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, agents }
  } catch (error) {
    console.error("Error fetching agents:", error)
    return { success: false, error: "Failed to fetch agents" }
  }
}

/**
 * Get active agents (scoped to org)
 */
export async function getActiveAgents() {
  try {
    const ctx = await requireOrgContext()

    const agents = await db.agent.findMany({
      where: { organizationId: ctx.organizationId, isActive: true },
      orderBy: { name: "asc" },
    })

    return { success: true, agents }
  } catch (error) {
    console.error("Error fetching agents:", error)
    return { success: false, error: "Failed to fetch agents" }
  }
}

/**
 * Delete agent (Admin only)
 */
export async function deleteAgent(agentId: string) {
  try {
    const ctx = await requireOrgContext()

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Admin access required" }
    }

    const agent = await db.agent.findUnique({
      where: { id: agentId, organizationId: ctx.organizationId },
      select: { id: true },
    })
    if (!agent) return { success: false, error: "Agent not found" }

    const activeOrders = await db.order.count({
      where: {
        agentId,
        organizationId: ctx.organizationId,
        status: { in: ["CONFIRMED", "DISPATCHED"] },
      },
    })

    if (activeOrders > 0) {
      return {
        success: false,
        error: `Cannot delete agent with ${activeOrders} active order(s). Please reassign orders first.`,
      }
    }

    const stockHoldings = await db.agentStock.count({
      where: { agentId, quantity: { gt: 0 } },
    })

    if (stockHoldings > 0) {
      return {
        success: false,
        error: "Agent has stock holdings. Please reconcile stock before deletion.",
      }
    }

    await db.agent.delete({ where: { id: agentId, organizationId: ctx.organizationId } })

    revalidatePath("/dashboard/admin/agents")
    return { success: true, message: "Agent deleted successfully" }
  } catch (error: any) {
    console.error("Error deleting agent:", error)
    return { success: false, error: error.message || "Failed to delete agent" }
  }
}

/**
 * Reconcile agent stock (Admin and Inventory Manager)
 */
export async function reconcileAgentStock(data: {
  agentId: string
  productId: string
  returnedQuantity?: number
  defective?: number
  missing?: number
  notes?: string
}) {
  try {
    const ctx = await requireOrgContext()

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER" && ctx.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Insufficient permissions" }
    }

    // Verify agent belongs to this org
    const agent = await db.agent.findUnique({
      where: { id: data.agentId, organizationId: ctx.organizationId },
      select: { id: true },
    })
    if (!agent) return { success: false, error: "Agent not found" }

    return await db.$transaction(async (tx) => {
      const agentStock = await tx.agentStock.findUnique({
        where: { agentId_productId: { agentId: data.agentId, productId: data.productId } },
      })

      if (!agentStock) throw new Error("Stock record not found")

      const totalReconciled =
        (data.returnedQuantity || 0) + (data.defective || 0) + (data.missing || 0)

      if (totalReconciled > agentStock.quantity) {
        throw new Error("Reconciled quantities exceed current stock")
      }

      await tx.agentStock.update({
        where: { agentId_productId: { agentId: data.agentId, productId: data.productId } },
        data: {
          quantity: data.returnedQuantity !== undefined
            ? { decrement: data.returnedQuantity }
            : undefined,
          defective: data.defective ?? agentStock.defective,
          missing: data.missing ?? agentStock.missing,
        },
      })

      if (data.returnedQuantity && data.returnedQuantity > 0) {
        const updatedProduct = await tx.product.update({
          where: { id: data.productId, organizationId: ctx.organizationId },
          data: { currentStock: { increment: data.returnedQuantity } },
        })

        await logStockMovement({
          productId: data.productId,
          organizationId: ctx.organizationId,
          type: "RETURNED_FROM_AGENT",
          quantity: data.returnedQuantity,
          balanceAfter: updatedProduct.currentStock,
          agentId: data.agentId,
          userId: ctx.userId,
          note: data.notes,
          tx,
        })
      }

      revalidatePath("/dashboard/admin/agents")
      revalidatePath("/dashboard/admin/inventory")
      return { success: true, message: "Stock reconciled successfully" }
    })
  } catch (error: any) {
    console.error("Error reconciling stock:", error)
    return { success: false, error: error.message || "Failed to reconcile stock" }
  }
}

/**
 * Create settlement record for agent (Admin only)
 */
export async function createSettlement(data: {
  agentId: string
  stockValue: number
  cashCollected: number
  cashReturned: number
  adjustments: number
  notes?: string
}) {
  try {
    const ctx = await requireOrgContext()

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Admin access required" }
    }

    // Verify agent belongs to this org
    const agent = await db.agent.findUnique({
      where: { id: data.agentId, organizationId: ctx.organizationId },
      select: { id: true },
    })
    if (!agent) return { success: false, error: "Agent not found" }

    const balanceDue =
      data.stockValue + data.cashCollected - data.cashReturned + data.adjustments

    const settlement = await db.settlement.create({
      data: {
        organizationId: ctx.organizationId,
        agentId: data.agentId,
        stockValue: data.stockValue,
        cashCollected: data.cashCollected,
        cashReturned: data.cashReturned,
        adjustments: data.adjustments,
        balanceDue,
        notes: data.notes,
        settledBy: ctx.userId,
      },
    })

    revalidatePath("/dashboard/admin/agents")
    return { success: true, settlement }
  } catch (error: any) {
    console.error("Error creating settlement:", error)
    return { success: false, error: error.message || "Failed to create settlement" }
  }
}

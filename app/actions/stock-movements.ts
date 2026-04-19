"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import type { StockMovementType } from "@prisma/client"

export async function getStockMovements(params: {
  page?: number
  pageSize?: number
  productId?: string
  type?: StockMovementType
  startDate?: string
  endDate?: string
}) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (user?.role !== "ADMIN" && user?.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Insufficient permissions" }
    }

    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 50
    const skip = (page - 1) * pageSize

    const where: any = {}

    if (params.productId) {
      where.productId = params.productId
    }
    if (params.type) {
      where.type = params.type
    }
    if (params.startDate || params.endDate) {
      where.createdAt = {}
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate)
      }
      if (params.endDate) {
        where.createdAt.lte = new Date(params.endDate + "T23:59:59.999Z")
      }
    }

    const [movements, total] = await Promise.all([
      db.stockMovement.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.stockMovement.count({ where }),
    ])

    // Fetch user and agent names in bulk for display
    const userIds = [...new Set(movements.map((m) => m.userId).filter(Boolean))] as string[]
    const agentIds = [...new Set(movements.map((m) => m.agentId).filter(Boolean))] as string[]

    const [users, agents] = await Promise.all([
      userIds.length > 0
        ? db.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true },
          })
        : [],
      agentIds.length > 0
        ? db.agent.findMany({
            where: { id: { in: agentIds } },
            select: { id: true, name: true },
          })
        : [],
    ])

    const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))
    const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.name]))

    const enrichedMovements = movements.map((m) => ({
      ...m,
      userName: m.userId ? userMap[m.userId] ?? null : null,
      agentName: m.agentId ? agentMap[m.agentId] ?? null : null,
    }))

    return {
      success: true,
      data: {
        movements: enrichedMovements,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  } catch (error) {
    console.error("Error fetching stock movements:", error)
    return { success: false, error: "Failed to fetch stock movements" }
  }
}

export async function getProductsForFilter() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    const products = await db.product.findMany({
      where: { isDeleted: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })

    return { success: true, products }
  } catch (error) {
    console.error("Error fetching products for filter:", error)
    return { success: false, error: "Failed to fetch products" }
  }
}

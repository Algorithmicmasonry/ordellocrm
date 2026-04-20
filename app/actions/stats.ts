"use server"

import { calculateRevenue, calculateProfit, calculateSalesRepStats } from "@/lib/calculations"
import { db } from "@/lib/db"
import { OrderStatus } from "@prisma/client"
import { requireOrgContext } from "@/lib/org-context"

/**
 * Get admin dashboard statistics (org-scoped)
 */
export async function getAdminStats() {
  try {
    const ctx = await requireOrgContext()
    const { organizationId } = ctx

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [
      totalOrders,
      ordersToday,
      deliveredOrders,
      cancelledOrders,
      pendingOrders,
      totalRevenue,
      totalProfit,
    ] = await Promise.all([
      db.order.count({ where: { organizationId } }),
      db.order.count({ where: { organizationId, createdAt: { gte: today, lt: tomorrow } } }),
      db.order.count({ where: { organizationId, status: OrderStatus.DELIVERED } }),
      db.order.count({ where: { organizationId, status: OrderStatus.CANCELLED } }),
      db.order.count({
        where: {
          organizationId,
          status: { in: [OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.DISPATCHED] },
        },
      }),
      calculateRevenue(undefined, undefined, undefined, undefined, organizationId),
      calculateProfit(undefined, undefined, undefined, undefined, organizationId),
    ])

    const deliveryRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0

    return {
      success: true,
      stats: {
        totalOrders,
        ordersToday,
        totalRevenue,
        totalProfit,
        deliveredOrders,
        cancelledOrders,
        pendingOrders,
        deliveryRate,
      },
    }
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return { success: false, error: "Failed to fetch statistics" }
  }
}

/**
 * Get sales rep statistics for the current logged-in rep (org-scoped)
 */
export async function getSalesRepDashboardStats() {
  try {
    const ctx = await requireOrgContext()

    const stats = await calculateSalesRepStats(
      ctx.userId,
      undefined,
      undefined,
      ctx.organizationId,
    )

    return { success: true, stats }
  } catch (error) {
    console.error("Error fetching sales rep stats:", error)
    return { success: false, error: "Failed to fetch statistics" }
  }
}

/**
 * Get revenue by date range (org-scoped)
 */
export async function getRevenueByDateRange(
  startDate: Date,
  endDate: Date,
  salesRepId?: string,
) {
  try {
    const ctx = await requireOrgContext()

    const revenue = await calculateRevenue(
      startDate,
      endDate,
      salesRepId,
      undefined,
      ctx.organizationId,
    )

    return { success: true, revenue }
  } catch (error) {
    console.error("Error fetching revenue:", error)
    return { success: false, error: "Failed to fetch revenue" }
  }
}

/**
 * Get profit by date range (org-scoped)
 */
export async function getProfitByDateRange(
  startDate: Date,
  endDate: Date,
  productId?: string,
) {
  try {
    const ctx = await requireOrgContext()

    const profit = await calculateProfit(
      startDate,
      endDate,
      productId,
      undefined,
      ctx.organizationId,
    )

    return { success: true, profit }
  } catch (error) {
    console.error("Error fetching profit:", error)
    return { success: false, error: "Failed to fetch profit" }
  }
}

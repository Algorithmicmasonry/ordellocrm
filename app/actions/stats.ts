"use server"

import { calculateRevenue, calculateProfit, calculateSalesRepStats } from "@/lib/calculations"
import { db } from "@/lib/db"
import { OrderStatus } from "@prisma/client"

/**
 * Get admin dashboard statistics
 */
export async function getAdminStats() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Total orders
    const totalOrders = await db.order.count()

    // Orders today
    const ordersToday = await db.order.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    // Status counts
    const deliveredOrders = await db.order.count({
      where: { status: OrderStatus.DELIVERED },
    })

    const cancelledOrders = await db.order.count({
      where: { status: OrderStatus.CANCELLED },
    })

    const pendingOrders = await db.order.count({
      where: {
        status: {
          in: [OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.DISPATCHED],
        },
      },
    })

    // Calculate revenue and profit
    const totalRevenue = await calculateRevenue()
    const totalProfit = await calculateProfit()

    // Delivery rate
    const deliveryRate =
      totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0

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
 * Get sales rep statistics
 */
export async function getSalesRepDashboardStats(salesRepId: string) {
  try {
    const stats = await calculateSalesRepStats(salesRepId)

    return { success: true, stats }
  } catch (error) {
    console.error("Error fetching sales rep stats:", error)
    return { success: false, error: "Failed to fetch statistics" }
  }
}

/**
 * Get revenue by date range
 */
export async function getRevenueByDateRange(
  startDate: Date,
  endDate: Date,
  salesRepId?: string
) {
  try {
    const revenue = await calculateRevenue(startDate, endDate, salesRepId)

    return { success: true, revenue }
  } catch (error) {
    console.error("Error fetching revenue:", error)
    return { success: false, error: "Failed to fetch revenue" }
  }
}

/**
 * Get profit by date range
 */
export async function getProfitByDateRange(
  startDate: Date,
  endDate: Date,
  productId?: string
) {
  try {
    const profit = await calculateProfit(startDate, endDate, productId)

    return { success: true, profit }
  } catch (error) {
    console.error("Error fetching profit:", error)
    return { success: false, error: "Failed to fetch profit" }
  }
}

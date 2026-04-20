import { db } from './db'
import { OrderStatus, Currency } from '@prisma/client'
import { sumAttributedExpenses, buildUnitsSoldMap } from './expense-utils'
import { createBulkNotifications } from '@/app/actions/notifications'
import { sendPushToUsers } from '@/app/actions/push-notifications'
import { logStockMovement } from './stock-movements'

/**
 * Calculate revenue from delivered orders only
 */
export async function calculateRevenue(
  startDate?: Date,
  endDate?: Date,
  salesRepId?: string,
  currency?: Currency,
  organizationId?: string,
): Promise<number> {
  const where: any = {
    status: OrderStatus.DELIVERED,
    ...(organizationId && { organizationId }),
  }

  if (startDate && endDate) {
    where.deliveredAt = { gte: startDate, lte: endDate }
  }

  if (salesRepId) where.assignedToId = salesRepId
  if (currency) where.currency = currency

  const orders = await db.order.findMany({
    where,
    select: { totalAmount: true },
  })

  return orders.reduce((total, order) => total + order.totalAmount, 0)
}

/**
 * Calculate profit: Revenue - (Cost + Expenses)
 */
export async function calculateProfit(
  startDate?: Date,
  endDate?: Date,
  productId?: string,
  currency?: Currency,
  organizationId?: string,
): Promise<number> {
  const where: any = {
    status: OrderStatus.DELIVERED,
    ...(organizationId && { organizationId }),
  }

  if (startDate && endDate) {
    where.deliveredAt = { gte: startDate, lte: endDate }
  }

  if (currency) where.currency = currency

  const orders = await db.order.findMany({
    where,
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  })

  // Calculate revenue and cost
  // Revenue uses order.totalAmount (exact package price stored at order creation).
  // Cost is summed from items since cost is per-unit and not stored at order level.
  let revenue = 0
  let cost = 0

  orders.forEach((order) => {
    if (!productId) {
      // Whole-order revenue: use stored totalAmount (avoids floating point drift
      // from unitPrice = pkg.price / pkg.quantity reconstruction)
      revenue += order.totalAmount
    }
    order.items.forEach((item) => {
      if (productId && item.productId === productId) {
        // Product-specific revenue: must derive from items
        revenue += item.price * item.quantity
      }
      if (!productId || item.productId === productId) {
        cost += item.cost * item.quantity
      }
    })
  })

  // Get expenses
  const expenseWhere: any = {}

  if (startDate && endDate) {
    expenseWhere.date = {
      gte: startDate,
      lte: endDate,
    }
  }

  if (productId) {
    expenseWhere.productId = productId
  }

  if (currency) {
    expenseWhere.currency = currency
  }

  const expenses = await db.expense.findMany({
    where: expenseWhere,
  })

  // Build units-sold map from delivered orders for batch cost amortization
  const allDeliveredItems = orders.flatMap((o) => o.items)
  const unitsSoldByProduct = buildUnitsSoldMap(allDeliveredItems)

  const totalExpenses = sumAttributedExpenses(expenses, unitsSoldByProduct)

  return revenue - cost - totalExpenses
}

/**
 * Calculate sales rep performance stats
 */
export async function calculateSalesRepStats(
  salesRepId: string,
  startDate?: Date,
  endDate?: Date,
  organizationId?: string,
) {
  const where: any = {
    assignedToId: salesRepId,
    ...(organizationId && { organizationId }),
  }

  if (startDate && endDate) {
    where.createdAt = { gte: startDate, lte: endDate }
  }

  const orders = await db.order.findMany({
    where,
    include: { items: true },
  })

  const totalOrders = orders.length
  const deliveredOrders = orders.filter((o) => o.status === OrderStatus.DELIVERED).length
  const cancelledOrders = orders.filter((o) => o.status === OrderStatus.CANCELLED).length
  const postponedOrders = orders.filter((o) => o.status === OrderStatus.POSTPONED).length

  const deliveredPercentage = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0
  const cancelledPercentage = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0

  // Calculate revenue from delivered orders only
  const totalRevenue = orders
    .filter((o) => o.status === OrderStatus.DELIVERED)
    .reduce((total, order) => {
      const orderTotal = order.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )
      return total + orderTotal
    }, 0)

  return {
    totalOrders,
    deliveredOrders,
    cancelledOrders,
    postponedOrders,
    deliveredPercentage,
    cancelledPercentage,
    totalRevenue,
  }
}

/**
 * Update inventory when order is delivered.
 *
 * Two scenarios:
 * - Agent-fulfilled order: stock was already moved from warehouse to agent
 *   during distribution, so only deduct from AgentStock.
 * - Direct/warehouse order (no agent): deduct from Product.currentStock.
 */
export async function updateInventoryOnDelivery(orderId: string, userId?: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { name: true } },
        },
      },
    },
  })

  if (!order) {
    throw new Error('Order not found')
  }

  // Sandbox orders are test-only — never touch real stock
  if (order.isSandbox) return;

  for (const item of order.items) {
    const productName = item.product.name;
    if (order.agentId) {
      // Agent-fulfilled: only deduct from agent stock
      // (currentStock was already decremented when stock was distributed to the agent)
      const agentStock = await db.agentStock.findUnique({
        where: {
          agentId_productId: {
            agentId: order.agentId,
            productId: item.productId,
          },
        },
      })

      if (!agentStock) {
        throw new Error(
          `Agent has no stock record for "${productName}". Ask the admin to distribute stock to this agent.`
        )
      }

      if (agentStock.quantity < item.quantity) {
        throw new Error(
          `Not enough agent stock for "${productName}": agent has ${agentStock.quantity}, order needs ${item.quantity}.`
        )
      }

      await db.agentStock.update({
        where: {
          agentId_productId: {
            agentId: order.agentId,
            productId: item.productId,
          },
        },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      })

      // Log movement — balance is current warehouse stock (unchanged for agent orders)
      const product = await db.product.findUnique({
        where: { id: item.productId },
        select: { currentStock: true },
      })
      await logStockMovement({
        productId: item.productId,
        type: "DELIVERED",
        quantity: -item.quantity,
        balanceAfter: product?.currentStock ?? 0,
        agentId: order.agentId,
        orderId: order.id,
        userId,
      })
    } else {
      // Order has no agent assigned — do not deduct from global stock.
      // All deliveries must go through an agent. If this order has no agent,
      // skip inventory deduction silently (admin can correct manually).
      console.warn(
        `[updateInventoryOnDelivery] Order ${order.id} has no agentId — skipping inventory deduction for "${productName}".`
      );
    }
  }
}

/**
 * Restore inventory when reverting from delivered status.
 *
 * Mirrors updateInventoryOnDelivery: restores to agent stock or warehouse
 * depending on whether the order has an agent.
 */
export async function restoreInventoryFromDelivery(orderId: string, userId?: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  })

  if (!order) {
    throw new Error('Order not found')
  }

  for (const item of order.items) {
    if (order.agentId) {
      // Agent-fulfilled: restore to agent stock only
      const agentStock = await db.agentStock.findUnique({
        where: {
          agentId_productId: {
            agentId: order.agentId,
            productId: item.productId,
          },
        },
      })

      if (agentStock) {
        await db.agentStock.update({
          where: {
            agentId_productId: {
              agentId: order.agentId,
              productId: item.productId,
            },
          },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        })
      } else {
        await db.agentStock.create({
          data: {
            agentId: order.agentId,
            productId: item.productId,
            quantity: item.quantity,
          },
        })
      }

      const product = await db.product.findUnique({
        where: { id: item.productId },
        select: { currentStock: true },
      })
      await logStockMovement({
        productId: item.productId,
        type: "DELIVERY_REVERSED",
        quantity: item.quantity,
        balanceAfter: product?.currentStock ?? 0,
        agentId: order.agentId,
        orderId: order.id,
        userId,
      })
    } else {
      // No agent: restore to warehouse/global stock
      const updatedProduct = await db.product.update({
        where: { id: item.productId },
        data: {
          currentStock: {
            increment: item.quantity,
          },
        },
      })

      await logStockMovement({
        productId: item.productId,
        type: "DELIVERY_REVERSED",
        quantity: item.quantity,
        balanceAfter: updatedProduct.currentStock,
        orderId: order.id,
        userId,
      })
    }
  }
}

/**
 * Check if a product is low on stock and send notifications to admins/inventory managers
 * Call this whenever inventory is updated (orders delivered, stock adjusted, etc.)
 */
export async function checkAndNotifyLowStock(productId: string): Promise<void> {
  try {
    // Get the product with current stock, reorder point, and agent stock
    const product = await db.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        currentStock: true,
        reorderPoint: true,
        agentStock: {
          select: { quantity: true },
        },
      },
    })

    if (!product) {
      console.log(`Product ${productId} not found for low stock check`)
      return
    }

    // Calculate total stock including agent stock
    const agentTotal = product.agentStock.reduce((sum, a) => sum + a.quantity, 0)
    const totalStock = product.currentStock + agentTotal

    // Check if total stock is at or below reorder point
    if (totalStock <= product.reorderPoint) {
      console.log(
        `Low stock alert for ${product.name}: ${totalStock} (warehouse: ${product.currentStock}, agents: ${agentTotal}) <= ${product.reorderPoint}`
      )

      // Get all active admins and inventory managers
      const recipients = await db.user.findMany({
        where: {
          role: {
            in: ['ADMIN', 'INVENTORY_MANAGER'],
          },
          isActive: true,
        },
        select: { id: true },
      })

      if (recipients.length === 0) {
        console.log('No active admins or inventory managers found')
        return
      }

      const recipientIds = recipients.map((r) => r.id)
      const title = `Low Stock Alert: ${product.name}`
      const message = `${product.name} is running low on stock (Total: ${totalStock}, Reorder Point: ${product.reorderPoint})`

      // Create in-app notifications
      await createBulkNotifications({
        userIds: recipientIds,
        type: 'LOW_STOCK_ALERT',
        title,
        message,
        link: `/dashboard/admin/inventory`,
      })

      // Send PWA push notifications
      await sendPushToUsers(recipientIds, {
        title,
        body: message,
        icon: '/icon.png',
        url: '/dashboard/admin/inventory',
        tag: `low-stock-${productId}`,
        requireInteraction: true,
      })

      console.log(
        `Sent low stock notifications to ${recipientIds.length} recipients for ${product.name}`
      )
    }
  } catch (error) {
    console.error('Error checking low stock:', error)
    // Don't throw - this is a background check that shouldn't break other operations
  }
}

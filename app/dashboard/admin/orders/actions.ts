"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";
import { OrderStatus, OrderSource, Currency, Prisma } from "@prisma/client";
import type { TimePeriod } from "@/lib/types";
import { updateInventoryOnDelivery, restoreInventoryFromDelivery, checkAndNotifyLowStock } from "@/lib/calculations";
import { revalidatePath } from "next/cache";
import { getDateRange } from "@/lib/date-utils";

// Define the exact type that matches what Prisma returns
type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    assignedTo: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    agent: {
      select: {
        id: true;
        name: true;
        location: true;
      };
    };
    items: {
      include: {
        product: {
          select: {
            id: true;
            name: true;
            price: true;
          };
        };
      };
    };
    notes: true;
  };
}>;

// Types for return values
type ActionResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
};

export type OrderFilters = {
  status?: OrderStatus;
  source?: OrderSource;
  location?: string;
  search?: string;
  currency?: Currency;
};

export type PaginationParams = {
  page: number;
  perPage: number;
};

type OrdersData = {
  orders: OrderWithRelations[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
};

type StatsData = {
  totalHandled: number;
  deliveredOrders: number;
  deliveryRate: number;
  revenue: number;
  ordersChange: number | null;
  deliveryRateChange: number | null;
  revenueChange: number | null;
};

const DEFAULT_TIMEZONE = "Africa/Lagos";

function requireAdminOrRep(role: string) {
  if (role !== "ADMIN" && role !== "OWNER" && role !== "SALES_REP") {
    throw new Error("Unauthorized");
  }
}

function requireAdmin(role: string) {
  if (role !== "ADMIN" && role !== "OWNER") throw new Error("Unauthorized");
}

export async function getOrders(
  filters: OrderFilters = {},
  pagination: PaginationParams = { page: 1, perPage: 10 },
  period: TimePeriod = "month",
  startDateParam?: string,
  endDateParam?: string,
): Promise<ActionResponse<OrdersData>> {
  try {
    const ctx = await requireOrgContext();
    requireAdminOrRep(ctx.role);

    const where: Prisma.OrderWhereInput = {
      organizationId: ctx.organizationId,
    };

    // Sales reps only see their own orders
    if (ctx.role === "SALES_REP") {
      where.assignedToId = ctx.userId;
    }

    // Apply date/period filter
    if (startDateParam && endDateParam) {
      where.createdAt = { gte: new Date(startDateParam), lte: new Date(endDateParam) };
    } else {
      const { startDate } = getDateRange(period, DEFAULT_TIMEZONE);
      where.createdAt = { gte: startDate };
    }

    if (filters.status) where.status = filters.status;
    if (filters.source) where.source = filters.source;
    if (filters.currency) where.currency = filters.currency;

    if (filters.location) {
      where.OR = [
        { city: { contains: filters.location, mode: "insensitive" } },
        { state: { contains: filters.location, mode: "insensitive" } },
      ];
    }

    if (filters.search) {
      const searchOrConditions: Prisma.OrderWhereInput[] = [
        { customerName: { contains: filters.search, mode: "insensitive" } },
        { customerPhone: { contains: filters.search, mode: "insensitive" } },
      ];
      const searchAsNumber = parseInt(filters.search, 10);
      if (!isNaN(searchAsNumber)) {
        searchOrConditions.push({ orderNumber: searchAsNumber });
      }
      where.AND = [{ OR: searchOrConditions }];
    }

    const totalOrders = await db.order.count({ where });

    const orders = await db.order.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        notes: { orderBy: { createdAt: "desc" } },
        agent: { select: { id: true, name: true, location: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, price: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (pagination.page - 1) * pagination.perPage,
      take: pagination.perPage,
    });

    return {
      success: true,
      message: `Successfully loaded ${orders.length} order${orders.length !== 1 ? "s" : ""}`,
      data: {
        orders,
        pagination: {
          total: totalOrders,
          page: pagination.page,
          perPage: pagination.perPage,
          totalPages: Math.ceil(totalOrders / pagination.perPage),
        },
      },
    };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return { success: false, message: "Failed to load orders. Please try again." };
  }
}

export async function getOrderStats(
  period: TimePeriod = "month",
  currency?: Currency,
  startDateParam?: string,
  endDateParam?: string,
): Promise<ActionResponse<StatsData>> {
  try {
    const ctx = await requireOrgContext();
    requireAdminOrRep(ctx.role);

    const where: Prisma.OrderWhereInput = {
      organizationId: ctx.organizationId,
    };
    if (ctx.role === "SALES_REP") where.assignedToId = ctx.userId;
    if (currency) where.currency = currency;

    let currentStart: Date;
    let currentEnd: Date | undefined;
    let previousStart: Date | null;

    if (startDateParam && endDateParam) {
      currentStart = new Date(startDateParam);
      currentEnd = new Date(endDateParam);
      previousStart = null;
    } else {
      currentStart = getDateRange(period, DEFAULT_TIMEZONE).startDate;
      currentEnd = undefined;
      const periodLength = new Date().getTime() - currentStart.getTime();
      previousStart = new Date(currentStart.getTime() - periodLength);
    }

    const currentCreatedAt = currentEnd
      ? { gte: currentStart, lte: currentEnd }
      : { gte: currentStart };

    const currentPeriodOrders = await db.order.count({
      where: { ...where, createdAt: currentCreatedAt },
    });
    const currentDeliveredOrders = await db.order.count({
      where: { ...where, status: "DELIVERED", createdAt: currentCreatedAt },
    });
    const currentDeliveryRate =
      currentPeriodOrders > 0 ? (currentDeliveredOrders / currentPeriodOrders) * 100 : 0;

    const currentDeliveredAt = currentEnd
      ? { gte: currentStart, lte: currentEnd }
      : { gte: currentStart };
    const currentRevenueData = await db.order.aggregate({
      where: { ...where, status: "DELIVERED", deliveredAt: currentDeliveredAt },
      _sum: { totalAmount: true },
    });
    const currentRevenue = currentRevenueData._sum.totalAmount || 0;

    let previousPeriodOrders = 0;
    let previousDeliveredOrders = 0;
    let previousDeliveryRate = 0;
    let previousRevenue = 0;

    if (previousStart !== null) {
      const [prevOrders, prevDelivered, prevRevenueData] = await Promise.all([
        db.order.count({ where: { ...where, createdAt: { gte: previousStart, lt: currentStart } } }),
        db.order.count({ where: { ...where, status: "DELIVERED", createdAt: { gte: previousStart, lt: currentStart } } }),
        db.order.aggregate({
          where: { ...where, status: "DELIVERED", deliveredAt: { gte: previousStart, lt: currentStart } },
          _sum: { totalAmount: true },
        }),
      ]);
      previousPeriodOrders = prevOrders;
      previousDeliveredOrders = prevDelivered;
      previousDeliveryRate =
        previousPeriodOrders > 0 ? (previousDeliveredOrders / previousPeriodOrders) * 100 : 0;
      previousRevenue = prevRevenueData._sum.totalAmount || 0;
    }

    const calcChange = (current: number, previous: number): number | null => {
      if (previousStart === null) return null;
      if (previous > 0) return parseFloat((((current - previous) / previous) * 100).toFixed(1));
      return current > 0 ? 100.0 : 0.0;
    };

    return {
      success: true,
      message: "Statistics loaded successfully",
      data: {
        totalHandled: currentPeriodOrders,
        deliveredOrders: currentDeliveredOrders,
        deliveryRate: parseFloat(currentDeliveryRate.toFixed(1)),
        revenue: currentRevenue,
        ordersChange: calcChange(currentPeriodOrders, previousPeriodOrders),
        deliveryRateChange: calcChange(currentDeliveryRate, previousDeliveryRate),
        revenueChange: calcChange(currentRevenue, previousRevenue),
      },
    };
  } catch (error) {
    console.error("Error fetching order stats:", error);
    return { success: false, message: "Failed to load statistics. Please try again." };
  }
}

export async function getOrderById(
  orderId: string,
): Promise<ActionResponse<Awaited<ReturnType<typeof db.order.findFirst>>>> {
  try {
    const ctx = await requireOrgContext();
    requireAdminOrRep(ctx.role);

    const order = await db.order.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        agent: { select: { id: true, name: true, phone: true, location: true, address: true } },
        items: { include: { product: true } },
        notes: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!order) {
      return { success: false, message: "Order not found. It may have been deleted." };
    }

    // Sales reps can only view their own orders
    if (ctx.role === "SALES_REP" && order.assignedToId !== ctx.userId) {
      return { success: false, message: "You don't have permission to view this order" };
    }

    return { success: true, message: "Order loaded successfully", data: order };
  } catch (error) {
    console.error("Error fetching order:", error);
    return { success: false, message: "Failed to load order details. Please try again." };
  }
}

export async function getUniqueLocations(): Promise<
  ActionResponse<{ value: string; label: string }[]>
> {
  try {
    const ctx = await requireOrgContext();
    requireAdminOrRep(ctx.role);

    const orders = await db.order.findMany({
      where: {
        organizationId: ctx.organizationId,
        city: { not: "" },
      },
      select: { city: true, state: true },
      distinct: ["city"],
    });

    const locations = orders
      .map((order) => {
        const cityValue = order.city.trim();
        return {
          value: cityValue,
          label: order.state ? `${cityValue}, ${order.state}` : cityValue,
        };
      })
      .filter((loc) => loc.value !== "");

    return { success: true, message: "Locations loaded successfully", data: locations };
  } catch (error) {
    console.error("Error fetching locations:", error);
    return { success: false, message: "Failed to load locations. Using defaults.", data: [] };
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<ActionResponse<null>> {
  try {
    const ctx = await requireOrgContext();
    requireAdminOrRep(ctx.role);

    const order = await db.order.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId },
      select: { id: true, assignedToId: true, status: true },
    });

    if (!order) return { success: false, message: "Order not found" };

    if (ctx.role === "SALES_REP" && order.assignedToId !== ctx.userId) {
      return { success: false, message: "You don't have permission to update this order" };
    }

    const previousStatus = order.status;

    if (previousStatus === OrderStatus.DELIVERED && status !== OrderStatus.DELIVERED) {
      await restoreInventoryFromDelivery(orderId, ctx.organizationId, ctx.userId);
    } else if (status === OrderStatus.DELIVERED && previousStatus !== OrderStatus.DELIVERED) {
      await updateInventoryOnDelivery(orderId, ctx.organizationId, ctx.userId);
    }

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === "CONFIRMED" && { confirmedAt: new Date() }),
        ...(status === "DISPATCHED" && { dispatchedAt: new Date() }),
        ...(status === "DELIVERED" && { deliveredAt: new Date() }),
        ...(status === "CANCELLED" && { cancelledAt: new Date() }),
      },
      include: { items: true },
    });

    if (status === OrderStatus.DELIVERED) {
      for (const item of updatedOrder.items) {
        await checkAndNotifyLowStock(item.productId, ctx.organizationId);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin/orders");
    revalidatePath("/dashboard/admin/inventory");

    return { success: true, message: `Order status updated to ${status.toLowerCase()}` };
  } catch (error) {
    console.error("Error updating order status:", error);
    return { success: false, message: "Failed to update order status. Please try again." };
  }
}

export async function getOrdersByProduct(
  period: TimePeriod = "month",
  startDateParam?: string,
  endDateParam?: string,
  currency?: string
) {
  try {
    const ctx = await requireOrgContext();
    requireAdmin(ctx.role);

    let start: Date;
    let end: Date;
    if (startDateParam && endDateParam) {
      start = new Date(startDateParam);
      end = new Date(endDateParam);
    } else {
      const range = getDateRange(period, DEFAULT_TIMEZONE);
      start = range.startDate;
      end = range.endDate;
    }

    const where: Prisma.OrderItemWhereInput = {
      order: {
        organizationId: ctx.organizationId,
        createdAt: { gte: start, lte: end },
        ...(currency ? { currency } : {}),
      },
    };

    const items = await db.orderItem.findMany({
      where,
      include: {
        product: { select: { id: true, name: true } },
      },
    });

    const productMap = new Map<
      string,
      { productId: string; productName: string; orderCount: number; totalQuantity: number }
    >();

    for (const item of items) {
      const existing = productMap.get(item.productId);
      if (existing) {
        existing.orderCount += 1;
        existing.totalQuantity += item.quantity;
      } else {
        productMap.set(item.productId, {
          productId: item.productId,
          productName: item.product.name,
          orderCount: 1,
          totalQuantity: item.quantity,
        });
      }
    }

    const data = Array.from(productMap.values()).sort((a, b) => b.orderCount - a.orderCount);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

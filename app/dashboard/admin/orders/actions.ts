"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
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
  orders: OrderWithRelations[]; // Use the properly typed version
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
};

// ... rest of your code stays the same ...

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

export async function getOrders(
  filters: OrderFilters = {},
  pagination: PaginationParams = { page: 1, perPage: 10 },
  period: TimePeriod = "month",
  startDateParam?: string, // ISO string for custom range
  endDateParam?: string,   // ISO string for custom range
): Promise<ActionResponse<OrdersData>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return {
        success: false,
        message: "You must be logged in to view orders",
      };
    }

    // Build where clause based on filters
    const where: Prisma.OrderWhereInput = {};

    // If user is SALES_REP, only show their assigned orders
    if (session.user.role === "SALES_REP") {
      where.assignedToId = session.user.id;
    }

    // Apply date/period filter
    if (startDateParam && endDateParam) {
      where.createdAt = { gte: new Date(startDateParam), lte: new Date(endDateParam) };
    } else {
      const { startDate } = getDateRange(period, DEFAULT_TIMEZONE);
      where.createdAt = { gte: startDate };
    }

    // Apply other filters
    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.source) {
      where.source = filters.source;
    }

    if (filters.location) {
      where.OR = [
        { city: { contains: filters.location, mode: "insensitive" } },
        { state: { contains: filters.location, mode: "insensitive" } },
      ];
    }

    if (filters.currency) {
      where.currency = filters.currency;
    }

    if (filters.search) {
      const searchOrConditions: any[] = [
        { customerName: { contains: filters.search, mode: "insensitive" } },
        { customerPhone: { contains: filters.search, mode: "insensitive" } },
      ];

      // If search is a valid number, also search by orderNumber
      const searchAsNumber = parseInt(filters.search, 10);
      if (!isNaN(searchAsNumber)) {
        searchOrConditions.push({ orderNumber: searchAsNumber });
      }

      where.AND = [
        {
          OR: searchOrConditions,
        },
      ];
    }

    // Get total count for pagination
    const totalOrders = await db.order.count({ where });

    // Fetch orders with pagination
    const orders = await db.order.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        notes: {
          // ← ADD THIS
          orderBy: {
            createdAt: "desc",
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
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
    return {
      success: false,
      message: "Failed to load orders. Please try again.",
    };
  }
}

export async function getOrderStats(
  period: TimePeriod = "month",
  currency?: Currency,
  startDateParam?: string, // ISO string for custom range
  endDateParam?: string,   // ISO string for custom range
): Promise<ActionResponse<StatsData>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return {
        success: false,
        message: "You must be logged in to view statistics",
      };
    }

    // Build where clause - filter by user if SALES_REP
    const where: Prisma.OrderWhereInput = {};
    if (session.user.role === "SALES_REP") {
      where.assignedToId = session.user.id;
    }
    // Filter by currency if provided (defaults to NGN in UI)
    if (currency) {
      where.currency = currency;
    }

    // Get date ranges — custom range or period
    let currentStart: Date;
    let currentEnd: Date | undefined;
    let previousStart: Date | null;

    if (startDateParam && endDateParam) {
      currentStart = new Date(startDateParam);
      currentEnd = new Date(endDateParam);
      previousStart = null; // no comparison for custom ranges
    } else {
      currentStart = getDateRange(period, DEFAULT_TIMEZONE).startDate;
      currentEnd = undefined;
      const periodLength = new Date().getTime() - currentStart.getTime();
      previousStart = new Date(currentStart.getTime() - periodLength);
    }

    // ============ CURRENT PERIOD ============
    const currentCreatedAt = currentEnd
      ? { gte: currentStart, lte: currentEnd }
      : { gte: currentStart };

    // Total orders in current period
    const currentPeriodOrders = await db.order.count({
      where: { ...where, createdAt: currentCreatedAt },
    });

    // Delivered orders in current period
    const currentDeliveredOrders = await db.order.count({
      where: { ...where, status: "DELIVERED", createdAt: currentCreatedAt },
    });

    // Current delivery rate
    const currentDeliveryRate =
      currentPeriodOrders > 0
        ? (currentDeliveredOrders / currentPeriodOrders) * 100
        : 0;

    // Current revenue — anchored to deliveredAt (consistent with admin dashboard)
    const currentDeliveredAt = currentEnd
      ? { gte: currentStart, lte: currentEnd }
      : { gte: currentStart };
    const currentRevenueData = await db.order.aggregate({
      where: { ...where, status: "DELIVERED", deliveredAt: currentDeliveredAt },
      _sum: { totalAmount: true },
    });
    const currentRevenue = currentRevenueData._sum.totalAmount || 0;

    // ============ PREVIOUS PERIOD ============

    let previousPeriodOrders = 0;
    let previousDeliveredOrders = 0;
    let previousDeliveryRate = 0;
    let previousRevenue = 0;

    if (previousStart !== null) {
      const [prevOrders, prevDelivered, prevRevenueData] = await Promise.all([
        db.order.count({
          where: {
            ...where,
            createdAt: { gte: previousStart, lt: currentStart },
          },
        }),
        db.order.count({
          where: {
            ...where,
            status: "DELIVERED",
            createdAt: { gte: previousStart, lt: currentStart },
          },
        }),
        db.order.aggregate({
          where: {
            ...where,
            status: "DELIVERED",
            deliveredAt: { gte: previousStart, lt: currentStart },
          },
          _sum: { totalAmount: true },
        }),
      ]);
      previousPeriodOrders = prevOrders;
      previousDeliveredOrders = prevDelivered;
      previousDeliveryRate =
        previousPeriodOrders > 0
          ? (previousDeliveredOrders / previousPeriodOrders) * 100
          : 0;
      previousRevenue = prevRevenueData._sum.totalAmount || 0;
    }

    // ============ CALCULATE PERCENTAGE CHANGES ============

    // Returns null when no previous period available (custom range)
    const calcChange = (current: number, previous: number): number | null => {
      if (previousStart === null) return null;
      if (previous > 0) return parseFloat((((current - previous) / previous) * 100).toFixed(1));
      return current > 0 ? 100.0 : 0.0;
    };

    const ordersChange = calcChange(currentPeriodOrders, previousPeriodOrders);
    const deliveryRateChange = calcChange(currentDeliveryRate, previousDeliveryRate);
    const revenueChange = calcChange(currentRevenue, previousRevenue);

    return {
      success: true,
      message: "Statistics loaded successfully",
      data: {
        totalHandled: currentPeriodOrders,
        deliveredOrders: currentDeliveredOrders,
        deliveryRate: parseFloat(currentDeliveryRate.toFixed(1)),
        revenue: currentRevenue,
        ordersChange,
        deliveryRateChange,
        revenueChange,
      },
    };
  } catch (error) {
    console.error("Error fetching order stats:", error);
    return {
      success: false,
      message: "Failed to load statistics. Please try again.",
    };
  }
}

export async function getOrderById(
  orderId: string,
): Promise<ActionResponse<Awaited<ReturnType<typeof db.order.findUnique>>>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return {
        success: false,
        message: "You must be logged in to view order details",
      };
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            phone: true,
            location: true,
            address: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        notes: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!order) {
      return {
        success: false,
        message: "Order not found. It may have been deleted.",
      };
    }

    // If user is SALES_REP, verify they own this order
    if (
      session.user.role === "SALES_REP" &&
      order.assignedToId !== session.user.id
    ) {
      return {
        success: false,
        message: "You don't have permission to view this order",
      };
    }

    return {
      success: true,
      message: "Order loaded successfully",
      data: order,
    };
  } catch (error) {
    console.error("Error fetching order:", error);
    return {
      success: false,
      message: "Failed to load order details. Please try again.",
    };
  }
}

export async function getUniqueLocations(): Promise<
  ActionResponse<{ value: string; label: string }[]>
> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return {
        success: false,
        message: "You must be logged in to view locations",
        data: [],
      };
    }

    const orders = await db.order.findMany({
      where: {
        city: {
          // This excludes both empty strings and (if nullable) nulls safely
          not: "",
        },
        // If your schema allows nulls (String?), Prisma handles this automatically:
        // NOT: [{ city: "" }, { city: null }]
      },
      select: {
        city: true,
        state: true,
      },
      distinct: ["city"],
    });

    // Map to the format expected by your Select component
    const locations = orders
      .map((order) => {
        const cityValue = order.city.trim();
        return {
          value: cityValue,
          label: order.state ? `${cityValue}, ${order.state}` : cityValue,
        };
      })
      .filter((loc) => loc.value !== "");

    return {
      success: true,
      message: "Locations loaded successfully",
      data: locations,
    };
  } catch (error) {
    console.error("Error fetching locations:", error);
    return {
      success: false,
      message: "Failed to load locations. Using defaults.",
      data: [],
    };
  }
}

// Additional helper action for updating order status
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<ActionResponse<null>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return {
        success: false,
        message: "You must be logged in to update orders",
      };
    }

    // Check if order exists and user has permission
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, assignedToId: true, status: true },
    });

    if (!order) {
      return {
        success: false,
        message: "Order not found",
      };
    }

    // Sales reps can only update their own orders
    if (
      session.user.role === "SALES_REP" &&
      order.assignedToId !== session.user.id
    ) {
      return {
        success: false,
        message: "You don't have permission to update this order",
      };
    }

    const previousStatus = order.status;

    // Handle inventory changes when transitioning to/from DELIVERED
    if (previousStatus === OrderStatus.DELIVERED && status !== OrderStatus.DELIVERED) {
      await restoreInventoryFromDelivery(orderId, session.user.id);
    } else if (status === OrderStatus.DELIVERED && previousStatus !== OrderStatus.DELIVERED) {
      await updateInventoryOnDelivery(orderId, session.user.id);
    }

    // Update the order status
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        status,
        // Update timestamp fields based on status
        ...(status === "CONFIRMED" && { confirmedAt: new Date() }),
        ...(status === "DISPATCHED" && { dispatchedAt: new Date() }),
        ...(status === "DELIVERED" && { deliveredAt: new Date() }),
        ...(status === "CANCELLED" && { cancelledAt: new Date() }),
      },
      include: {
        items: true,
      },
    });

    // Check for low stock on all products in the order when delivered
    if (status === OrderStatus.DELIVERED) {
      for (const item of updatedOrder.items) {
        await checkAndNotifyLowStock(item.productId);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin/orders");
    revalidatePath("/dashboard/admin/inventory");

    return {
      success: true,
      message: `Order status updated to ${status.toLowerCase()}`,
    };
  } catch (error) {
    console.error("Error updating order status:", error);
    return {
      success: false,
      message: "Failed to update order status. Please try again.",
    };
  }
}

/** Get new order counts grouped by product for the selected period */
export async function getOrdersByProduct(
  period: TimePeriod = "month",
  startDateParam?: string,
  endDateParam?: string,
  currency?: string
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

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

    const where: any = {
      order: {
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

    // Group by product
    const productMap = new Map<
      string,
      { productId: string; productName: string; orderCount: number; totalQuantity: number }
    >();

    for (const item of items) {
      const key = item.productId;
      const existing = productMap.get(key);
      if (existing) {
        existing.orderCount += 1;
        existing.totalQuantity += item.quantity;
      } else {
        productMap.set(key, {
          productId: item.productId,
          productName: item.product.name,
          orderCount: 1,
          totalQuantity: item.quantity,
        });
      }
    }

    const data = Array.from(productMap.values()).sort(
      (a, b) => b.orderCount - a.orderCount
    );

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

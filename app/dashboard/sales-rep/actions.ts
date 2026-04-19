"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getDateRange, getPreviousPeriodRange, getSpecificDayRange } from "@/lib/date-utils";
import type { DateRange } from "@/lib/date-utils";
import { OrderStatus, type OrderSource, type Prisma } from "@prisma/client";
import type { TimePeriod } from "@/lib/types";
import { getHoHWeeksInRange, HOH_POLICY_START } from "@/lib/head-of-house";

export async function getSalesRepDashboardStats(
  period: TimePeriod = "month",
  timezone?: string,
  startDate?: string, // YYYY-MM-DD — when set, overrides period for date filtering
  endDate?: string,   // YYYY-MM-DD
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "SALES_REP") {
      return { success: false, error: "Unauthorized" };
    }

    const salesRepId = session.user.id;

    // Build the current period date range
    const isCustomRange = !!(startDate && endDate);
    let currentPeriodRange: DateRange;
    if (isCustomRange) {
      currentPeriodRange = {
        startDate: getSpecificDayRange(startDate!, timezone).startDate,
        endDate: getSpecificDayRange(endDate!, timezone).endDate,
      };
    } else {
      currentPeriodRange = getDateRange(period, timezone);
    }

    const previousPeriodRange = isCustomRange ? null : getPreviousPeriodRange(period, timezone);

    // Total orders for the selected period
    const totalOrders = await db.order.count({
      where: {
        assignedToId: salesRepId,
        createdAt: {
          gte: currentPeriodRange.startDate,
          lte: currentPeriodRange.endDate,
        },
      },
    });

    // Orders in previous period (only for preset periods)
    const previousPeriodOrders = previousPeriodRange
      ? await db.order.count({
          where: {
            assignedToId: salesRepId,
            createdAt: {
              gte: previousPeriodRange.startDate,
              lte: previousPeriodRange.endDate,
            },
          },
        })
      : null;

    // Percentage change vs previous period (null for custom ranges)
    const percentageChange =
      previousPeriodOrders !== null
        ? previousPeriodOrders > 0
          ? ((totalOrders - previousPeriodOrders) / previousPeriodOrders) * 100
          : totalOrders > 0
          ? 100
          : 0
        : null;

    // Pending (NEW status) orders - current period
    const pendingOrders = await db.order.count({
      where: {
        assignedToId: salesRepId,
        status: "NEW",
        createdAt: {
          gte: currentPeriodRange.startDate,
          lte: currentPeriodRange.endDate,
        },
      },
    });

    // Confirmed orders - current period
    const confirmedOrders = await db.order.count({
      where: {
        assignedToId: salesRepId,
        status: "CONFIRMED",
        createdAt: {
          gte: currentPeriodRange.startDate,
          lte: currentPeriodRange.endDate,
        },
      },
    });

    // Delivered orders created in the selected period — used for conversion rate only
    const deliveredFromCohort = await db.order.count({
      where: {
        assignedToId: salesRepId,
        status: "DELIVERED",
        createdAt: {
          gte: currentPeriodRange.startDate,
          lte: currentPeriodRange.endDate,
        },
      },
    });

    // Delivered orders where delivery happened in the selected period — matches earnings count
    const deliveredThisPeriod = await db.order.count({
      where: {
        assignedToId: salesRepId,
        status: "DELIVERED",
        deliveredAt: {
          gte: currentPeriodRange.startDate,
          lte: currentPeriodRange.endDate,
        },
      },
    });

    const conversionRate =
      totalOrders > 0 ? (deliveredFromCohort / totalOrders) * 100 : 0;

    // Revenue: sum of (price × quantity) for orders actually delivered in the period
    // Filtered by deliveredAt so custom ranges reflect real earnings in that window
    const deliveredOrderItems = await db.orderItem.findMany({
      where: {
        order: {
          assignedToId: salesRepId,
          status: "DELIVERED",
          deliveredAt: {
            gte: currentPeriodRange.startDate,
            lte: currentPeriodRange.endDate,
          },
        },
      },
      select: { price: true, quantity: true, order: { select: { currency: true } } },
    });
    const revenue = deliveredOrderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    // Detect the primary currency from the most recent delivered order (defaults to NGN)
    const revenueCurrency = deliveredOrderItems[0]?.order?.currency ?? "NGN";

    // Avg response time: mean of (confirmedAt - createdAt) for orders confirmed in this period
    const confirmedOrdersForResponseTime = await db.order.findMany({
      where: {
        assignedToId: salesRepId,
        confirmedAt: {
          not: null,
          gte: currentPeriodRange.startDate,
          lte: currentPeriodRange.endDate,
        },
      },
      select: { createdAt: true, confirmedAt: true },
    });
    const avgResponseTimeHours =
      confirmedOrdersForResponseTime.length > 0
        ? confirmedOrdersForResponseTime.reduce((sum, o) => {
            const diffMs = o.confirmedAt!.getTime() - o.createdAt.getTime();
            return sum + diffMs / (1000 * 60 * 60);
          }, 0) / confirmedOrdersForResponseTime.length
        : null;

    // Orders requiring follow-up (have notes with follow-up dates that are today or in the past)
    const followUpOrders = await db.order.count({
      where: {
        assignedToId: salesRepId,
        notes: {
          some: {
            followUpDate: {
              lte: new Date(),
            },
          },
        },
        status: {
          notIn: ["DELIVERED", "CANCELLED"],
        },
      },
    });

    return {
      success: true,
      data: {
        totalOrders,
        percentageChange,
        pendingOrders,
        confirmedOrders,
        deliveredThisPeriod,
        conversionRate,
        deliveredFromCohort,
        revenue,
        revenueCurrency,
        followUpOrders,
        isCustomRange,
        avgResponseTimeHours,
      },
    };
  } catch (error) {
    console.error("Error fetching sales rep dashboard stats:", error);
    return { success: false, error: "Failed to fetch dashboard statistics" };
  }
}

interface GetAssignedOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus | "ALL" | "FOLLOW_UP";
  search?: string;
  period?: TimePeriod;
  startDate?: string; // YYYY-MM-DD — custom range override
  endDate?: string;   // YYYY-MM-DD — custom range override
  timezone?: string;
}

export async function getAssignedOrders({
  page = 1,
  limit = 10,
  status = "ALL",
  search,
  period = "month",
  startDate,
  endDate,
  timezone,
}: GetAssignedOrdersParams = {}) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "SALES_REP") {
      return { success: false, error: "Unauthorized" };
    }

    const salesRepId = session.user.id;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      assignedToId: salesRepId,
    };

    // Filter by status
    if (status === "FOLLOW_UP") {
      whereClause.notes = {
        some: {
          followUpDate: {
            lte: new Date(), // Only today or overdue — matches the reminder counter
          },
        },
      };
      // Include all active statuses so POSTPONED orders with follow-ups are visible
      whereClause.status = {
        notIn: ["DELIVERED", "CANCELLED"],
      };
    } else if (status !== "ALL") {
      whereClause.status = status;
    }

    // Filter by date range (createdAt) — skipped for FOLLOW_UP since follow-ups can be
    // on orders created in any period; filtering by createdAt would hide them.
    if (status !== "FOLLOW_UP") {
      if (startDate && endDate) {
        whereClause.createdAt = {
          gte: getSpecificDayRange(startDate, timezone).startDate,
          lte: getSpecificDayRange(endDate, timezone).endDate,
        };
      } else {
        const { startDate: periodStart, endDate: periodEnd } = getDateRange(period, timezone);
        whereClause.createdAt = { gte: periodStart, lte: periodEnd };
      }
    }

    // Search by customer name or phone
    if (search && search.trim() !== "") {
      whereClause.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count
    const totalOrders = await db.order.count({ where: whereClause });

    // Get paginated orders
    const orders = await db.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        notes: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    // Flag orders that have a follow-up due today or overdue, and surface the soonest due date
    const now = new Date();
    const ordersWithFollowUp = orders.map((order) => {
      const dueNotes = order.notes
        .filter((note) => note.followUpDate !== null && note.followUpDate <= now)
        .sort((a, b) => a.followUpDate!.getTime() - b.followUpDate!.getTime());

      return {
        ...order,
        hasPendingFollowUp: dueNotes.length > 0,
        nextFollowUpDate: dueNotes[0]?.followUpDate ?? null,
      };
    });

    return {
      success: true,
      data: {
        orders: ordersWithFollowUp,
        pagination: {
          total: totalOrders,
          page,
          limit,
          totalPages: Math.ceil(totalOrders / limit),
        },
      },
    };
  } catch (error) {
    console.error("Error fetching assigned orders:", error);
    return { success: false, error: "Failed to fetch assigned orders" };
  }
}

/**
 * Get available products for order creation (includes packages and agent stock)
 */
export async function getAvailableProducts() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "SALES_REP") {
      return { success: false, error: "Unauthorized" };
    }

    const allProducts = await db.product.findMany({
      where: {
        isActive: true,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        currentStock: true,
        currency: true,
        packageSelectorNote: true,
        productPrices: true,
        packages: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
        },
        agentStock: {
          select: { quantity: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Only return products with valid pricing
    const products = allProducts
      .map((product) => {
        const productPrice = product.productPrices.find(
          (p) => p.currency === product.currency
        );
        if (!productPrice) return null;

        const agentStockTotal = product.agentStock.reduce(
          (sum, s) => sum + s.quantity,
          0
        );

        return {
          id: product.id,
          name: product.name,
          price: productPrice.price,
          currentStock: product.currentStock,
          agentStockTotal,
          currency: product.currency,
          packageSelectorNote: product.packageSelectorNote,
          packages: product.packages,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    return { success: true, data: products };
  } catch (error) {
    console.error("Error fetching available products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

/**
 * Get agents that have stock for the given product IDs
 */
export async function getAgentsWithStock(productIds: string[]) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "SALES_REP") {
      return { success: false, error: "Unauthorized" };
    }

    const agents = await db.agent.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        location: true,
        phone: true,
        stock: {
          where: {
            productId: { in: productIds },
            quantity: { gt: 0 },
          },
          select: {
            productId: true,
            quantity: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Only return agents who have stock for at least one of the selected products
    const agentsWithStock = agents.filter((a) => a.stock.length > 0);

    return { success: true, data: agentsWithStock };
  } catch (error) {
    console.error("Error fetching agents with stock:", error);
    return { success: false, error: "Failed to fetch agents" };
  }
}

/**
 * Create order manually (assigned to current sales rep)
 */
export async function createManualOrder(data: {
  customerName: string;
  customerPhone: string;
  customerWhatsapp?: string;
  deliveryAddress: string;
  state: string;
  city: string;
  source: OrderSource;
  agentId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    packageId?: string; // When set, derives price and quantity from the package
  }>;
}) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "SALES_REP") {
      return { success: false, error: "Unauthorized" };
    }

    const salesRepId = session.user.id;

    // Calculate total amount and prepare order items
    let totalAmount = 0;
    const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    for (const item of data.items) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
        include: {
          productPrices: true,
          packages: {
            include: {
              components: {
                include: {
                  product: {
                    include: {
                      productPrices: true,
                    },
                  },
                },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      });

      if (!product) {
        return {
          success: false,
          error: `Product not found: ${item.productId}`,
        };
      }

      if (!product.isActive || product.isDeleted) {
        return {
          success: false,
          error: `Product "${product.name}" is not available`,
        };
      }

      const productPrice = product.productPrices.find(
        (p) => p.currency === product.currency
      );

      if (!productPrice) {
        return {
          success: false,
          error: `Pricing not configured for product: ${product.name}`,
        };
      }

      if (item.packageId) {
        // Package-based item: derive quantity and price from the package
        const pkg = product.packages.find((p) => p.id === item.packageId);
        if (!pkg) {
          return {
            success: false,
            error: `Package not found for product: ${product.name}`,
          };
        }

        // Package price is the total for that bundle; store unit price so quantity × price = pkg.price
        const unitPrice = pkg.price / pkg.quantity;
        totalAmount += pkg.price;

        orderItems.push({
          product: { connect: { id: product.id } },
          quantity: pkg.quantity,
          price: unitPrice,
          cost: productPrice.cost,
        });

        // Add package companion products as separate 0-priced order items.
        for (const component of pkg.components) {
          const companionPrimaryPrice = component.product.productPrices.find(
            (p) => p.currency === component.product.currency
          );

          if (!companionPrimaryPrice) {
            return {
              success: false,
              error: `Pricing not configured for companion product: ${component.product.name}`,
            };
          }

          orderItems.push({
            product: { connect: { id: component.productId } },
            quantity: component.quantity,
            price: 0,
            cost: companionPrimaryPrice.cost,
          });
        }
      } else {
        // Manual quantity — use product list price
        totalAmount += productPrice.price * item.quantity;

        orderItems.push({
          product: { connect: { id: product.id } },
          quantity: item.quantity,
          price: productPrice.price,
          cost: productPrice.cost,
        });
      }
    }

    // Create order assigned to current sales rep
    const order = await db.order.create({
      data: {
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerWhatsapp: data.customerWhatsapp,
        deliveryAddress: data.deliveryAddress,
        state: data.state,
        city: data.city,
        source: data.source,
        totalAmount,
        assignedTo: { connect: { id: salesRepId } },
        ...(data.agentId ? { agent: { connect: { id: data.agentId } } } : {}),
        status: "NEW",
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        assignedTo: true,
        agent: true,
      },
    });

    revalidatePath("/dashboard/sales-rep");
    revalidatePath("/dashboard/sales-rep/orders");

    return {
      success: true,
      data: order,
    };
  } catch (error) {
    console.error("Error creating manual order:", error);
    return {
      success: false,
      error: "Failed to create order",
    };
  }
}


const HOH_WEEK_BONUS = 1500 * 7; // ₦10,500

/**
 * Returns the estimated earnings for the logged-in sales rep for a given period.
 */
export async function getRepEarnings(
  period: TimePeriod = "month",
  timezone?: string,
  startDate?: string,
  endDate?: string
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "SALES_REP") {
      return { success: false, error: "Unauthorized" };
    }
    const repId = session.user.id;

    const isCustomRange = !!(startDate && endDate);
    let start: Date;
    let end: Date;
    if (isCustomRange) {
      start = getSpecificDayRange(startDate!, timezone).startDate;
      end = getSpecificDayRange(endDate!, timezone).endDate;
    } else {
      const range = getDateRange(period, timezone);
      start = range.startDate;
      end = range.endDate;
    }

    const [rate, ordersDelivered, hohWeeks, paidPayroll] = await Promise.all([
      db.salesRepRate.findUnique({ where: { userId: repId } }),
      db.order.count({
        where: {
          assignedToId: repId,
          status: OrderStatus.DELIVERED,
          deliveredAt: { gte: start, lte: end },
        },
      }),
      getHoHWeeksInRange(start > HOH_POLICY_START ? start : HOH_POLICY_START, end),
      db.payroll.findFirst({
        where: {
          status: "PAID",
          startDate: { lte: end },
          endDate: { gte: start },
        },
        select: { id: true, label: true },
        orderBy: { paidAt: "desc" },
      }),
    ]);

    const hohWeeksCount = hohWeeks.filter((w) => w.userId === repId).length;
    const ratePerOrder = rate?.ratePerOrder ?? null;
    const baseEarnings = ratePerOrder != null ? ordersDelivered * ratePerOrder : 0;
    const hohBonus = hohWeeksCount * HOH_WEEK_BONUS;

    return {
      success: true,
      data: {
        ordersDelivered,
        ratePerOrder,
        baseEarnings,
        hohBonus,
        hohWeeks: hohWeeksCount,
        totalEarnings: baseEarnings + hohBonus,
        isPaid: !!paidPayroll,
        payrollLabel: paidPayroll?.label ?? null,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

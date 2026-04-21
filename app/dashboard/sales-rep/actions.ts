"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";
import { revalidatePath } from "next/cache";
import { getDateRange, getPreviousPeriodRange, getSpecificDayRange } from "@/lib/date-utils";
import type { DateRange } from "@/lib/date-utils";
import { OrderStatus, type Currency, type OrderSource, type Prisma } from "@prisma/client";
import type { TimePeriod } from "@/lib/types";
import { getHoHWeeksInRange, HOH_POLICY_START } from "@/lib/head-of-house";

function requireSalesRep(role: string) {
  if (role !== "SALES_REP") throw new Error("Unauthorized");
}

export async function getSalesRepDashboardStats(
  period: TimePeriod = "month",
  timezone?: string,
  startDate?: string,
  endDate?: string,
) {
  try {
    const ctx = await requireOrgContext();
    requireSalesRep(ctx.role);

    const salesRepId = ctx.userId;

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

    const orgRepFilter = { organizationId: ctx.organizationId, assignedToId: salesRepId };

    const totalOrders = await db.order.count({
      where: { ...orgRepFilter, createdAt: { gte: currentPeriodRange.startDate, lte: currentPeriodRange.endDate } },
    });

    const previousPeriodOrders = previousPeriodRange
      ? await db.order.count({
          where: { ...orgRepFilter, createdAt: { gte: previousPeriodRange.startDate, lte: previousPeriodRange.endDate } },
        })
      : null;

    const percentageChange =
      previousPeriodOrders !== null
        ? previousPeriodOrders > 0
          ? ((totalOrders - previousPeriodOrders) / previousPeriodOrders) * 100
          : totalOrders > 0 ? 100 : 0
        : null;

    const [pendingOrders, confirmedOrders, deliveredFromCohort, deliveredThisPeriod] = await Promise.all([
      db.order.count({ where: { ...orgRepFilter, status: "NEW", createdAt: { gte: currentPeriodRange.startDate, lte: currentPeriodRange.endDate } } }),
      db.order.count({ where: { ...orgRepFilter, status: "CONFIRMED", createdAt: { gte: currentPeriodRange.startDate, lte: currentPeriodRange.endDate } } }),
      db.order.count({ where: { ...orgRepFilter, status: "DELIVERED", createdAt: { gte: currentPeriodRange.startDate, lte: currentPeriodRange.endDate } } }),
      db.order.count({ where: { ...orgRepFilter, status: "DELIVERED", deliveredAt: { gte: currentPeriodRange.startDate, lte: currentPeriodRange.endDate } } }),
    ]);

    const conversionRate = totalOrders > 0 ? (deliveredFromCohort / totalOrders) * 100 : 0;

    const deliveredOrderItems = await db.orderItem.findMany({
      where: {
        order: {
          ...orgRepFilter,
          status: "DELIVERED",
          deliveredAt: { gte: currentPeriodRange.startDate, lte: currentPeriodRange.endDate },
        },
      },
      select: { price: true, quantity: true, order: { select: { currency: true } } },
    });
    const revenue = deliveredOrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const revenueCurrency = deliveredOrderItems[0]?.order?.currency ?? "NGN";

    const confirmedOrdersForResponseTime = await db.order.findMany({
      where: {
        ...orgRepFilter,
        confirmedAt: { not: null, gte: currentPeriodRange.startDate, lte: currentPeriodRange.endDate },
      },
      select: { createdAt: true, confirmedAt: true },
    });
    const avgResponseTimeHours =
      confirmedOrdersForResponseTime.length > 0
        ? confirmedOrdersForResponseTime.reduce((sum, o) => {
            return sum + (o.confirmedAt!.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60);
          }, 0) / confirmedOrdersForResponseTime.length
        : null;

    const followUpOrders = await db.order.count({
      where: {
        ...orgRepFilter,
        notes: { some: { followUpDate: { lte: new Date() } } },
        status: { notIn: ["DELIVERED", "CANCELLED"] },
      },
    });

    return {
      success: true,
      data: {
        totalOrders, percentageChange, pendingOrders, confirmedOrders,
        deliveredThisPeriod, conversionRate, deliveredFromCohort,
        revenue, revenueCurrency, followUpOrders, isCustomRange, avgResponseTimeHours,
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
  startDate?: string;
  endDate?: string;
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
    const ctx = await requireOrgContext();
    requireSalesRep(ctx.role);

    const salesRepId = ctx.userId;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      organizationId: ctx.organizationId,
      assignedToId: salesRepId,
    };

    if (status === "FOLLOW_UP") {
      whereClause.notes = { some: { followUpDate: { lte: new Date() } } };
      whereClause.status = { notIn: ["DELIVERED", "CANCELLED"] };
    } else if (status !== "ALL") {
      whereClause.status = status;
    }

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

    if (search && search.trim() !== "") {
      whereClause.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
      ];
    }

    const totalOrders = await db.order.count({ where: whereClause });
    const orders = await db.order.findMany({
      where: whereClause,
      include: {
        items: { include: { product: true } },
        notes: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const now = new Date();
    const ordersWithFollowUp = orders.map((order) => {
      const dueNotes = order.notes
        .filter((note) => note.followUpDate !== null && note.followUpDate <= now)
        .sort((a, b) => a.followUpDate!.getTime() - b.followUpDate!.getTime());
      return { ...order, hasPendingFollowUp: dueNotes.length > 0, nextFollowUpDate: dueNotes[0]?.followUpDate ?? null };
    });

    return {
      success: true,
      data: {
        orders: ordersWithFollowUp,
        pagination: { total: totalOrders, page, limit, totalPages: Math.ceil(totalOrders / limit) },
      },
    };
  } catch (error) {
    console.error("Error fetching assigned orders:", error);
    return { success: false, error: "Failed to fetch assigned orders" };
  }
}

export async function getAvailableProducts() {
  try {
    const ctx = await requireOrgContext();
    requireSalesRep(ctx.role);

    const allProducts = await db.product.findMany({
      where: { organizationId: ctx.organizationId, isActive: true, isDeleted: false },
      select: {
        id: true, name: true, currentStock: true, currency: true,
        packageSelectorNote: true, productPrices: true,
        packages: { where: { isActive: true }, orderBy: { displayOrder: "asc" } },
        agentStock: { select: { quantity: true } },
      },
      orderBy: { name: "asc" },
    });

    const products = allProducts
      .map((product) => {
        const productPrice = product.productPrices.find((p) => p.currency === product.currency);
        if (!productPrice) return null;
        const agentStockTotal = product.agentStock.reduce((sum, s) => sum + s.quantity, 0);
        return {
          id: product.id, name: product.name, price: productPrice.price,
          currentStock: product.currentStock, agentStockTotal, currency: product.currency,
          packageSelectorNote: product.packageSelectorNote, packages: product.packages,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    return { success: true, data: products };
  } catch (error) {
    console.error("Error fetching available products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

export async function getAgentsWithStock(productIds: string[]) {
  try {
    const ctx = await requireOrgContext();
    requireSalesRep(ctx.role);

    const agents = await db.agent.findMany({
      where: { organizationId: ctx.organizationId, isActive: true },
      select: {
        id: true, name: true, location: true, phone: true,
        stock: {
          where: { productId: { in: productIds }, quantity: { gt: 0 } },
          select: { productId: true, quantity: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return { success: true, data: agents.filter((a) => a.stock.length > 0) };
  } catch (error) {
    console.error("Error fetching agents with stock:", error);
    return { success: false, error: "Failed to fetch agents" };
  }
}

export async function createManualOrder(data: {
  customerName: string;
  customerPhone: string;
  customerWhatsapp?: string;
  deliveryAddress: string;
  state: string;
  city: string;
  source: OrderSource;
  agentId?: string;
  items: Array<{ productId: string; quantity: number; packageId?: string }>;
}) {
  try {
    const ctx = await requireOrgContext();
    requireSalesRep(ctx.role);

    const salesRepId = ctx.userId;

    let totalAmount = 0;
    let orderCurrency: Currency = "NGN";
    const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    for (const item of data.items) {
      const product = await db.product.findFirst({
        where: { id: item.productId, organizationId: ctx.organizationId },
        include: {
          productPrices: true,
          packages: {
            include: {
              components: {
                include: { product: { include: { productPrices: true } } },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      });

      if (!product) return { success: false, error: `Product not found: ${item.productId}` };
      if (!product.isActive || product.isDeleted) return { success: false, error: `Product "${product.name}" is not available` };

      const productPrice = product.productPrices.find((p) => p.currency === product.currency);
      if (!productPrice) return { success: false, error: `Pricing not configured for product: ${product.name}` };

      orderCurrency = product.currency;

      if (item.packageId) {
        const pkg = product.packages.find((p) => p.id === item.packageId);
        if (!pkg) return { success: false, error: `Package not found for product: ${product.name}` };

        const unitPrice = pkg.price / pkg.quantity;
        totalAmount += pkg.price;
        orderItems.push({ product: { connect: { id: product.id } }, quantity: pkg.quantity, price: unitPrice, cost: productPrice.cost });

        for (const component of pkg.components) {
          const companionPrice = component.product.productPrices.find((p) => p.currency === component.product.currency);
          if (!companionPrice) return { success: false, error: `Pricing not configured for companion product: ${component.product.name}` };
          orderItems.push({ product: { connect: { id: component.productId } }, quantity: component.quantity, price: 0, cost: companionPrice.cost });
        }
      } else {
        totalAmount += productPrice.price * item.quantity;
        orderItems.push({ product: { connect: { id: product.id } }, quantity: item.quantity, price: productPrice.price, cost: productPrice.cost });
      }
    }

    const order = await db.order.create({
      data: {
        organizationId: ctx.organizationId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerWhatsapp: data.customerWhatsapp,
        deliveryAddress: data.deliveryAddress,
        state: data.state,
        city: data.city,
        source: data.source,
        currency: orderCurrency,
        totalAmount,
        assignedToId: salesRepId,
        agentId: data.agentId ?? undefined,
        status: "NEW",
        items: { create: orderItems },
      },
      include: {
        items: { include: { product: true } },
        assignedTo: true,
        agent: true,
      },
    });

    revalidatePath("/dashboard/sales-rep");
    revalidatePath("/dashboard/sales-rep/orders");
    return { success: true, data: order };
  } catch (error) {
    console.error("Error creating manual order:", error);
    return { success: false, error: "Failed to create order" };
  }
}

const HOH_WEEK_BONUS = 1500 * 7; // ₦10,500

export async function getRepEarnings(
  period: TimePeriod = "month",
  timezone?: string,
  startDate?: string,
  endDate?: string
) {
  try {
    const ctx = await requireOrgContext();
    requireSalesRep(ctx.role);

    const repId = ctx.userId;

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
      db.salesRepRate.findUnique({
        where: { organizationId_userId: { organizationId: ctx.organizationId, userId: repId } },
      }),
      db.order.count({
        where: {
          organizationId: ctx.organizationId,
          assignedToId: repId,
          status: OrderStatus.DELIVERED,
          deliveredAt: { gte: start, lte: end },
        },
      }),
      getHoHWeeksInRange(start > HOH_POLICY_START ? start : HOH_POLICY_START, end, ctx.organizationId),
      db.payroll.findFirst({
        where: {
          organizationId: ctx.organizationId,
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
        ordersDelivered, ratePerOrder, baseEarnings, hohBonus,
        hohWeeks: hohWeeksCount, totalEarnings: baseEarnings + hohBonus,
        isPaid: !!paidPayroll, payrollLabel: paidPayroll?.label ?? null,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

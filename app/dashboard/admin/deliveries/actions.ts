"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Currency, Prisma } from "@prisma/client";
import type { TimePeriod } from "@/lib/types";
import { getDateRange } from "@/lib/date-utils";

const DEFAULT_TIMEZONE = "Africa/Lagos";
const MS_PER_DAY = 1000 * 60 * 60 * 24;

type ActionResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
};

export type DeliveryFilters = {
  agentId?: string;
  currency?: Currency;
  search?: string;
};

export type PaginationParams = {
  page: number;
  perPage: number;
};

export type DeliveryWithRelations = Prisma.OrderGetPayload<{
  include: {
    assignedTo: {
      select: { id: true; name: true; email: true };
    };
    agent: {
      select: { id: true; name: true; location: true };
    };
    items: {
      include: {
        product: {
          select: { id: true; name: true };
        };
      };
    };
  };
}>;

type DeliveriesData = {
  deliveries: DeliveryWithRelations[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
};

export type DeliveryStatsData = {
  totalDeliveries: number;
  totalRevenue: number;
  avgFulfillmentDays: number;
  avgPerDay: number;
};

export async function getAgentsForFilter(): Promise<
  ActionResponse<{ id: string; name: string }[]>
> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, message: "Unauthorized" };
    }

    const agents = await db.agent.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return { success: true, message: "Agents loaded", data: agents };
  } catch (error) {
    console.error("Error fetching agents for filter:", error);
    return { success: false, message: "Failed to load agents" };
  }
}

export async function getDeliveries(
  filters: DeliveryFilters = {},
  pagination: PaginationParams = { page: 1, perPage: 10 },
  period: TimePeriod = "month",
  startDateParam?: string,
  endDateParam?: string,
): Promise<ActionResponse<DeliveriesData>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, message: "You must be logged in to view deliveries" };
    }

    // Build date range anchored to deliveredAt
    let startDate: Date;
    let endDate: Date | undefined;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      const range = getDateRange(period, DEFAULT_TIMEZONE);
      startDate = range.startDate;
      endDate = range.endDate;
    }

    const where: Prisma.OrderWhereInput = {
      status: "DELIVERED",
      deliveredAt: endDate
        ? { gte: startDate, lte: endDate }
        : { gte: startDate },
    };

    if (filters.agentId) {
      where.agentId = filters.agentId;
    }

    if (filters.currency) {
      where.currency = filters.currency;
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

    const [total, deliveries] = await Promise.all([
      db.order.count({ where }),
      db.order.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          agent: { select: { id: true, name: true, location: true } },
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { deliveredAt: "desc" },
        skip: (pagination.page - 1) * pagination.perPage,
        take: pagination.perPage,
      }),
    ]);

    return {
      success: true,
      message: `Loaded ${deliveries.length} deliveries`,
      data: {
        deliveries,
        pagination: {
          total,
          page: pagination.page,
          perPage: pagination.perPage,
          totalPages: Math.ceil(total / pagination.perPage),
        },
      },
    };
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    return { success: false, message: "Failed to load deliveries. Please try again." };
  }
}

export async function getDeliveryStats(
  period: TimePeriod = "month",
  currency?: Currency,
  startDateParam?: string,
  endDateParam?: string,
): Promise<ActionResponse<DeliveryStatsData>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, message: "Unauthorized" };
    }

    let startDate: Date;
    let endDate: Date | undefined;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      const range = getDateRange(period, DEFAULT_TIMEZONE);
      startDate = range.startDate;
      endDate = range.endDate;
    }

    const where: Prisma.OrderWhereInput = {
      status: "DELIVERED",
      deliveredAt: endDate
        ? { gte: startDate, lte: endDate }
        : { gte: startDate },
    };

    if (currency) {
      where.currency = currency;
    }

    const [totalDeliveries, revenueData, ordersForFulfillment] =
      await Promise.all([
        db.order.count({ where }),
        db.order.aggregate({ where, _sum: { totalAmount: true } }),
        db.order.findMany({
          where,
          select: { createdAt: true, deliveredAt: true },
        }),
      ]);

    const totalRevenue = revenueData._sum.totalAmount ?? 0;

    const avgFulfillmentDays =
      ordersForFulfillment.length > 0
        ? ordersForFulfillment.reduce(
            (sum, o) =>
              sum +
              (o.deliveredAt!.getTime() - o.createdAt.getTime()),
            0,
          ) /
          ordersForFulfillment.length /
          MS_PER_DAY
        : 0;

    const effectiveEnd = endDate ?? new Date();
    const numDays = Math.max(
      1,
      Math.ceil((effectiveEnd.getTime() - startDate.getTime()) / MS_PER_DAY),
    );
    const avgPerDay = totalDeliveries / numDays;

    return {
      success: true,
      message: "Stats loaded",
      data: {
        totalDeliveries,
        totalRevenue,
        avgFulfillmentDays,
        avgPerDay,
      },
    };
  } catch (error) {
    console.error("Error fetching delivery stats:", error);
    return { success: false, message: "Failed to load delivery stats." };
  }
}

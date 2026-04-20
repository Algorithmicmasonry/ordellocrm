"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";
import { formatDistanceToNow } from "date-fns";

interface GetCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
}

function requireSalesRep(role: string) {
  if (role !== "SALES_REP") throw new Error("Unauthorized");
}

export async function getCustomers({
  page = 1,
  limit = 10,
  search = "",
  city = "",
}: GetCustomersParams = {}) {
  try {
    const ctx = await requireOrgContext();
    requireSalesRep(ctx.role);

    const whereClause: any = {
      organizationId: ctx.organizationId,
      assignedToId: ctx.userId,
    };

    if (search && search.trim() !== "") {
      whereClause.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (city && city.trim() !== "") {
      whereClause.city = { equals: city, mode: "insensitive" };
    }

    const orders = await db.order.findMany({
      where: whereClause,
      include: {
        items: true,
        notes: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    const customersMap = new Map<string, any>();

    orders.forEach((order) => {
      const phone = order.customerPhone;

      if (!customersMap.has(phone)) {
        customersMap.set(phone, {
          customerPhone: order.customerPhone,
          customerName: order.customerName,
          customerWhatsapp: order.customerWhatsapp,
          city: order.city,
          state: order.state,
          deliveryAddress: order.deliveryAddress,
          orders: [],
          totalSpend: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          lastActivity: order.createdAt,
        });
      }

      const customer = customersMap.get(phone);
      customer.orders.push(order);

      if (order.status === "DELIVERED") {
        customer.totalSpend += order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
        customer.deliveredOrders++;
      }

      if (order.status === "CANCELLED") customer.cancelledOrders++;
      if (order.createdAt > customer.lastActivity) customer.lastActivity = order.createdAt;
    });

    const customersArray = Array.from(customersMap.values()).map((customer) => {
      const totalOrders = customer.orders.length;
      const deliverySuccessRate = totalOrders > 0
        ? ((customer.deliveredOrders / totalOrders) * 100).toFixed(1)
        : "0.0";

      let reliability = "New Customer";
      if (totalOrders >= 10 && customer.cancelledOrders <= 1) reliability = "Frequent Buyer";
      else if (totalOrders >= 5 && customer.cancelledOrders === 0) reliability = "Reliable";
      else if (customer.cancelledOrders >= 2) reliability = "Cancellations";

      return {
        ...customer,
        totalOrders,
        deliverySuccessRate: parseFloat(deliverySuccessRate),
        reliability,
        lastActivityText: formatDistanceToNow(new Date(customer.lastActivity), { addSuffix: true }),
      };
    });

    customersArray.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

    const skip = (page - 1) * limit;
    const paginatedCustomers = customersArray.slice(skip, skip + limit);
    const totalCustomers = customersArray.length;
    const cities = Array.from(new Set(Array.from(customersMap.values()).map((c) => c.city))).sort();

    return {
      success: true,
      data: {
        customers: paginatedCustomers,
        pagination: { total: totalCustomers, page, limit, totalPages: Math.ceil(totalCustomers / limit) },
        stats: { totalCustomers, cities },
      },
    };
  } catch (error) {
    console.error("Error fetching customers:", error);
    return { success: false, error: "Failed to fetch customers" };
  }
}

export async function getCustomerDetails(customerPhone: string) {
  try {
    const ctx = await requireOrgContext();
    requireSalesRep(ctx.role);

    const orders = await db.order.findMany({
      where: {
        organizationId: ctx.organizationId,
        assignedToId: ctx.userId,
        customerPhone,
      },
      include: {
        items: { include: { product: true } },
        notes: { orderBy: { createdAt: "desc" } },
        agent: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (orders.length === 0) return { success: false, error: "Customer not found" };

    const firstOrder = orders[0];
    const customer = {
      customerName: firstOrder.customerName,
      customerPhone: firstOrder.customerPhone,
      customerWhatsapp: firstOrder.customerWhatsapp,
      city: firstOrder.city,
      state: firstOrder.state,
      deliveryAddress: firstOrder.deliveryAddress,
    };

    let totalSpend = 0;
    let deliveredOrders = 0;
    const currency = orders[0]?.currency ?? "NGN";

    orders.forEach((order) => {
      if (order.status === "DELIVERED") {
        totalSpend += order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
        deliveredOrders++;
      }
    });

    const deliverySuccessRate = orders.length > 0
      ? ((deliveredOrders / orders.length) * 100).toFixed(1)
      : "0.0";

    const allNotes = orders
      .flatMap((order) => order.notes.map((note) => ({ ...note, orderNumber: order.orderNumber, orderId: order.id })))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      success: true,
      data: {
        customer,
        orders,
        stats: {
          totalSpend,
          currency,
          deliveredOrders,
          totalOrders: orders.length,
          deliverySuccessRate: parseFloat(deliverySuccessRate),
          customerSince: orders[orders.length - 1].createdAt,
        },
        communicationLog: allNotes,
      },
    };
  } catch (error) {
    console.error("Error fetching customer details:", error);
    return { success: false, error: "Failed to fetch customer details" };
  }
}

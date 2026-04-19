"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { formatDistanceToNow } from "date-fns";

interface GetCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
}

export async function getCustomers({
  page = 1,
  limit = 10,
  search = "",
  city = "",
}: GetCustomersParams = {}) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "SALES_REP") {
      return { success: false, error: "Unauthorized" };
    }

    const salesRepId = session.user.id;

    // Build where clause for orders assigned to this sales rep
    const whereClause: any = {
      assignedToId: salesRepId,
    };

    // Search filter
    if (search && search.trim() !== "") {
      whereClause.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
      ];
    }

    // City filter
    if (city && city.trim() !== "") {
      whereClause.city = { equals: city, mode: "insensitive" };
    }

    // Get all orders for this sales rep with filters
    const orders = await db.order.findMany({
      where: whereClause,
      include: {
        items: true,
        notes: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group orders by customer phone (unique identifier)
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

      // Calculate total spend (only from delivered orders)
      if (order.status === "DELIVERED") {
        const orderTotal = order.items.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        );
        customer.totalSpend += orderTotal;
        customer.deliveredOrders++;
      }

      // Count cancellations
      if (order.status === "CANCELLED") {
        customer.cancelledOrders++;
      }

      // Track last activity
      if (order.createdAt > customer.lastActivity) {
        customer.lastActivity = order.createdAt;
      }
    });

    // Convert map to array and calculate additional stats
    const customersArray = Array.from(customersMap.values()).map((customer) => {
      const totalOrders = customer.orders.length;
      const deliverySuccessRate =
        totalOrders > 0
          ? ((customer.deliveredOrders / totalOrders) * 100).toFixed(1)
          : "0.0";

      // Determine reliability badge
      let reliability = "New Customer";
      if (totalOrders >= 10 && customer.cancelledOrders <= 1) {
        reliability = "Frequent Buyer";
      } else if (totalOrders >= 5 && customer.cancelledOrders === 0) {
        reliability = "Reliable";
      } else if (customer.cancelledOrders >= 2) {
        reliability = "Cancellations";
      }

      return {
        ...customer,
        totalOrders,
        deliverySuccessRate: parseFloat(deliverySuccessRate),
        reliability,
        lastActivityText: formatDistanceToNow(new Date(customer.lastActivity), {
          addSuffix: true,
        }),
      };
    });

    // Sort by last activity (most recent first)
    customersArray.sort(
      (a, b) =>
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );

    // Pagination
    const skip = (page - 1) * limit;
    const paginatedCustomers = customersArray.slice(skip, skip + limit);
    const totalCustomers = customersArray.length;

    // Get unique cities for filter
    const cities = Array.from(
      new Set(Array.from(customersMap.values()).map((c) => c.city))
    ).sort();

    return {
      success: true,
      data: {
        customers: paginatedCustomers,
        pagination: {
          total: totalCustomers,
          page,
          limit,
          totalPages: Math.ceil(totalCustomers / limit),
        },
        stats: {
          totalCustomers,
          cities,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching customers:", error);
    return { success: false, error: "Failed to fetch customers" };
  }
}

export async function getCustomerDetails(customerPhone: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "SALES_REP") {
      return { success: false, error: "Unauthorized" };
    }

    const salesRepId = session.user.id;

    // Get all orders for this customer assigned to this sales rep
    const orders = await db.order.findMany({
      where: {
        assignedToId: salesRepId,
        customerPhone: customerPhone,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        notes: {
          orderBy: { createdAt: "desc" },
        },
        agent: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (orders.length === 0) {
      return { success: false, error: "Customer not found" };
    }

    // Get customer info from first order
    const firstOrder = orders[0];
    const customer = {
      customerName: firstOrder.customerName,
      customerPhone: firstOrder.customerPhone,
      customerWhatsapp: firstOrder.customerWhatsapp,
      city: firstOrder.city,
      state: firstOrder.state,
      deliveryAddress: firstOrder.deliveryAddress,
    };

    // Calculate stats
    let totalSpend = 0;
    let deliveredOrders = 0;
    const currency = orders[0]?.currency ?? "NGN";

    orders.forEach((order) => {
      if (order.status === "DELIVERED") {
        const orderTotal = order.items.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        );
        totalSpend += orderTotal;
        deliveredOrders++;
      }
    });

    const deliverySuccessRate =
      orders.length > 0
        ? ((deliveredOrders / orders.length) * 100).toFixed(1)
        : "0.0";

    // Get all notes from all orders for communication timeline
    const allNotes = orders.flatMap((order) =>
      order.notes.map((note) => ({
        ...note,
        orderNumber: order.orderNumber,
        orderId: order.id,
      }))
    );

    // Sort notes by date
    allNotes.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

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

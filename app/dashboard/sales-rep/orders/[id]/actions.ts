"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { updateInventoryOnDelivery, restoreInventoryFromDelivery } from "@/lib/calculations";
import { notifyAdmins } from "@/app/actions/push-notifications";
import { createBulkNotifications } from "@/app/actions/notifications";

export async function getOrderDetails(orderId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "SALES_REP") {
      return { success: false, error: "Unauthorized" };
    }

    const salesRepId = session.user.id;

    // Fetch order with all relations
    const order = await db.order.findUnique({
      where: {
        id: orderId,
        assignedToId: salesRepId, // Ensure sales rep can only view their own orders
      },
      include: {
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
        agent: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    return { success: true, data: order };
  } catch (error) {
    console.error("Error fetching order details:", error);
    return { success: false, error: "Failed to fetch order details" };
  }
}

export async function getAvailableAgents(city: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "SALES_REP") {
      return { success: false, error: "Unauthorized" };
    }

    // Get all active agents, sorted with matching city first
    const agents = await db.agent.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        location: true,
        phone: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Separate agents by location match
    const matchingAgents = agents.filter((agent) =>
      agent.location.toLowerCase().includes(city.toLowerCase())
    );
    const otherAgents = agents.filter(
      (agent) => !agent.location.toLowerCase().includes(city.toLowerCase())
    );

    return {
      success: true,
      data: {
        agents: [...matchingAgents, ...otherAgents],
        matchingCount: matchingAgents.length,
      },
    };
  } catch (error) {
    console.error("Error fetching available agents:", error);
    return { success: false, error: "Failed to fetch available agents" };
  }
}

export async function addOrderNote(orderId: string, note: string, followUpDate?: Date) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "SALES_REP") {
      return { success: false, error: "Unauthorized" };
    }

    const salesRepId = session.user.id;

    // Verify order belongs to this sales rep
    const order = await db.order.findUnique({
      where: {
        id: orderId,
        assignedToId: salesRepId,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Create note
    const orderNote = await db.orderNote.create({
      data: {
        orderId,
        note,
        followUpDate,
        isFollowUp: !!followUpDate,
      },
    });

    revalidatePath(`/dashboard/sales-rep/orders/${orderId}`);
    revalidatePath("/dashboard/sales-rep");
    return { success: true, data: orderNote };
  } catch (error) {
    console.error("Error adding order note:", error);
    return { success: false, error: "Failed to add note" };
  }
}

export async function assignAgent(orderId: string, agentId: string, deliverySlot?: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "SALES_REP") {
      return { success: false, error: "Unauthorized" };
    }

    const salesRepId = session.user.id;

    // Verify order belongs to this sales rep
    const order = await db.order.findUnique({
      where: {
        id: orderId,
        assignedToId: salesRepId,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Update order with agent and delivery slot
    const updateData: any = { agentId };
    if (deliverySlot) {
      updateData.deliverySlot = deliverySlot;
    }

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: updateData,
    });

    revalidatePath(`/dashboard/sales-rep/orders/${orderId}`);
    return { success: true, data: updatedOrder };
  } catch (error) {
    console.error("Error assigning agent:", error);
    return { success: false, error: "Failed to assign agent" };
  }
}

export async function updateOrderStatus(orderId: string, status: string, reason?: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "SALES_REP") {
      return { success: false, error: "Unauthorized" };
    }

    const salesRepId = session.user.id;

    // Verify order belongs to this sales rep
    const order = await db.order.findUnique({
      where: {
        id: orderId,
        assignedToId: salesRepId,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    const previousStatus = order.status;
    const validStatuses = new Set([
      "NEW",
      "CONFIRMED",
      "DISPATCHED",
      "DELIVERED",
      "CANCELLED",
      "POSTPONED",
      "NOT_REACHABLE",
      "NOT_PICKING_CALLS",
    ]);

    if (!validStatuses.has(status)) {
      return { success: false, error: "Invalid status value" };
    }

    // Handle inventory changes
    // If reverting FROM DELIVERED, restore inventory
    if (previousStatus === "DELIVERED" && status !== "DELIVERED") {
      await restoreInventoryFromDelivery(orderId, salesRepId);
    }
    // If changing TO DELIVERED, deduct inventory
    else if (status === "DELIVERED" && previousStatus !== "DELIVERED") {
      await updateInventoryOnDelivery(orderId, salesRepId);
    }

    // Update order status with timestamp
    const updateData: any = { status };
    const now = new Date();
    const hasStatusChanged = previousStatus !== status;

    // Response time should be based on first status change from NEW.
    if (hasStatusChanged && !order.confirmedAt) {
      updateData.confirmedAt = now;
    }

    switch (status) {
      case "CONFIRMED":
        updateData.confirmedAt = now;
        break;
      case "DISPATCHED":
        updateData.dispatchedAt = now;
        break;
      case "DELIVERED":
        updateData.deliveredAt = now;
        break;
      case "CANCELLED":
        updateData.cancelledAt = now;
        break;
      case "POSTPONED":
      case "NOT_REACHABLE":
      case "NOT_PICKING_CALLS":
        // No specific timestamp for postponed orders
        break;
    }

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: updateData,
    });

    // Log status change as a note if reason provided
    if (reason && previousStatus !== status) {
      await db.orderNote.create({
        data: {
          orderId,
          note: `Status changed from ${previousStatus} to ${status}. Reason: ${reason}`,
          isFollowUp: false,
        },
      });
    }

    // If status changed TO DELIVERED, notify all admins
    if (status === "DELIVERED" && previousStatus !== "DELIVERED") {
      // Send push notification
      await notifyAdmins({
        title: `Order #${updatedOrder.orderNumber}`,
        body: `Order has been delivered to ${updatedOrder.customerName}`,
        url: `/dashboard/admin/orders/${updatedOrder.id}`,
        orderId: updatedOrder.id,
      });

      // Create in-app notifications for all admins
      const admins = await db.user.findMany({
        where: { role: "ADMIN", isActive: true },
        select: { id: true },
      });

      if (admins.length > 0) {
        await createBulkNotifications({
          userIds: admins.map((admin) => admin.id),
          type: "ORDER_DELIVERED",
          title: "Order Delivered",
          message: `Order ${updatedOrder.orderNumber} has been delivered to ${updatedOrder.customerName}`,
          link: `/dashboard/admin/orders/${updatedOrder.id}`,
          orderId: updatedOrder.id,
        });
      }
    }

    revalidatePath(`/dashboard/sales-rep/orders/${orderId}`);
    revalidatePath("/dashboard/sales-rep");
    return { success: true, data: updatedOrder };
  } catch (error) {
    console.error("Error updating order status:", error);
    const message = error instanceof Error ? error.message : "Failed to update order status";
    return { success: false, error: message };
  }
}

export async function updateDeliverySlot(orderId: string, deliverySlot: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "SALES_REP") {
      return { success: false, error: "Unauthorized" };
    }

    const salesRepId = session.user.id;

    // Verify order belongs to this sales rep
    const order = await db.order.findUnique({
      where: {
        id: orderId,
        assignedToId: salesRepId,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Update delivery slot
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: { deliverySlot },
    });

    revalidatePath(`/dashboard/sales-rep/orders/${orderId}`);
    return { success: true, data: updatedOrder };
  } catch (error) {
    console.error("Error updating delivery slot:", error);
    return { success: false, error: "Failed to update delivery slot" };
  }
}

export async function updateOrder(
  orderId: string,
  data: {
    customerName?: string;
    customerPhone?: string;
    customerWhatsapp?: string;
    deliveryAddress?: string;
    city?: string;
    state?: string;
  }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "SALES_REP") {
      return { success: false, error: "Unauthorized" };
    }

    const salesRepId = session.user.id;

    // Verify order belongs to this sales rep
    const order = await db.order.findUnique({
      where: {
        id: orderId,
        assignedToId: salesRepId,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Update order
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data,
    });

    revalidatePath(`/dashboard/sales-rep/orders/${orderId}`);
    revalidatePath("/dashboard/sales-rep");
    return { success: true, data: updatedOrder };
  } catch (error) {
    console.error("Error updating order:", error);
    return { success: false, error: "Failed to update order" };
  }
}

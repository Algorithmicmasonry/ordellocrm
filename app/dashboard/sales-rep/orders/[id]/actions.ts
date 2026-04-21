"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";
import { revalidatePath } from "next/cache";
import { updateInventoryOnDelivery, restoreInventoryFromDelivery } from "@/lib/calculations";
import { notifyAdmins } from "@/app/actions/push-notifications";
import { createBulkNotifications } from "@/app/actions/notifications";

function requireSalesRep(role: string) {
  if (role !== "SALES_REP") throw new Error("Unauthorized");
}

export async function getOrderDetails(orderId: string) {
  try {
    const ctx = await requireOrgContext();
    requireSalesRep(ctx.role);

    const order = await db.order.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId, assignedToId: ctx.userId },
      include: {
        items: { include: { product: true } },
        notes: { orderBy: { createdAt: "desc" } },
        agent: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    if (!order) return { success: false, error: "Order not found" };
    return { success: true, data: order };
  } catch (error) {
    console.error("Error fetching order details:", error);
    return { success: false, error: "Failed to fetch order details" };
  }
}

export async function getAvailableAgents(city: string) {
  try {
    const ctx = await requireOrgContext();
    requireSalesRep(ctx.role);

    const agents = await db.agent.findMany({
      where: { organizationId: ctx.organizationId, isActive: true },
      select: { id: true, name: true, location: true, phone: true },
      orderBy: { name: "asc" },
    });

    const matchingAgents = agents.filter((a) => a.location.toLowerCase().includes(city.toLowerCase()));
    const otherAgents = agents.filter((a) => !a.location.toLowerCase().includes(city.toLowerCase()));

    return { success: true, data: { agents: [...matchingAgents, ...otherAgents], matchingCount: matchingAgents.length } };
  } catch (error) {
    console.error("Error fetching available agents:", error);
    return { success: false, error: "Failed to fetch available agents" };
  }
}

export async function addOrderNote(orderId: string, note: string, followUpDate?: Date) {
  try {
    const ctx = await requireOrgContext();
    requireSalesRep(ctx.role);

    const order = await db.order.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId, assignedToId: ctx.userId },
    });
    if (!order) return { success: false, error: "Order not found" };

    const orderNote = await db.orderNote.create({
      data: { orderId, note, followUpDate, isFollowUp: !!followUpDate },
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
    const ctx = await requireOrgContext();
    requireSalesRep(ctx.role);

    const order = await db.order.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId, assignedToId: ctx.userId },
    });
    if (!order) return { success: false, error: "Order not found" };

    // Verify agent belongs to this org
    const agent = await db.agent.findFirst({
      where: { id: agentId, organizationId: ctx.organizationId },
    });
    if (!agent) return { success: false, error: "Agent not found" };

    const updatedOrder = await db.order.update({
      where: { id: orderId, organizationId: ctx.organizationId },
      data: { agentId, ...(deliverySlot ? { deliverySlot } : {}) },
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
    const ctx = await requireOrgContext();
    requireSalesRep(ctx.role);

    const order = await db.order.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId, assignedToId: ctx.userId },
    });
    if (!order) return { success: false, error: "Order not found" };

    const previousStatus = order.status;
    const validStatuses = new Set([
      "NEW", "CONFIRMED", "DISPATCHED", "DELIVERED",
      "CANCELLED", "POSTPONED", "NOT_REACHABLE", "NOT_PICKING_CALLS",
    ]);
    if (!validStatuses.has(status)) return { success: false, error: "Invalid status value" };

    if (previousStatus === "DELIVERED" && status !== "DELIVERED") {
      await restoreInventoryFromDelivery(orderId, ctx.organizationId, ctx.userId);
    } else if (status === "DELIVERED" && previousStatus !== "DELIVERED") {
      await updateInventoryOnDelivery(orderId, ctx.organizationId, ctx.userId);
    }

    const updateData: any = { status };
    const now = new Date();

    if (previousStatus !== status && !order.confirmedAt) updateData.confirmedAt = now;

    switch (status) {
      case "CONFIRMED": updateData.confirmedAt = now; break;
      case "DISPATCHED": updateData.dispatchedAt = now; break;
      case "DELIVERED": updateData.deliveredAt = now; break;
      case "CANCELLED": updateData.cancelledAt = now; break;
    }

    const updatedOrder = await db.order.update({ where: { id: orderId, organizationId: ctx.organizationId }, data: updateData });

    if (reason && previousStatus !== status) {
      await db.orderNote.create({
        data: { orderId, note: `Status changed from ${previousStatus} to ${status}. Reason: ${reason}`, isFollowUp: false },
      });
    }

    if (status === "DELIVERED" && previousStatus !== "DELIVERED") {
      await notifyAdmins({
        title: `Order #${updatedOrder.orderNumber}`,
        body: `Order has been delivered to ${updatedOrder.customerName}`,
        url: `/dashboard/admin/orders/${updatedOrder.id}`,
        orderId: updatedOrder.id,
        organizationId: ctx.organizationId,
      });

      // Use OrganizationMember to find admins — role lives there in multi-tenant
      const adminMembers = await db.organizationMember.findMany({
        where: { organizationId: ctx.organizationId, role: { in: ["ADMIN", "OWNER"] }, isActive: true },
        select: { userId: true },
      });

      if (adminMembers.length > 0) {
        await createBulkNotifications({
          userIds: adminMembers.map((m) => m.userId),
          organizationId: ctx.organizationId,
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
    return { success: false, error: error instanceof Error ? error.message : "Failed to update order status" };
  }
}

export async function updateDeliverySlot(orderId: string, deliverySlot: string) {
  try {
    const ctx = await requireOrgContext();
    requireSalesRep(ctx.role);

    const order = await db.order.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId, assignedToId: ctx.userId },
    });
    if (!order) return { success: false, error: "Order not found" };

    const updatedOrder = await db.order.update({ where: { id: orderId, organizationId: ctx.organizationId }, data: { deliverySlot } });
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
    const ctx = await requireOrgContext();
    requireSalesRep(ctx.role);

    const order = await db.order.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId, assignedToId: ctx.userId },
    });
    if (!order) return { success: false, error: "Order not found" };

    const updatedOrder = await db.order.update({ where: { id: orderId, organizationId: ctx.organizationId }, data });
    revalidatePath(`/dashboard/sales-rep/orders/${orderId}`);
    revalidatePath("/dashboard/sales-rep");
    return { success: true, data: updatedOrder };
  } catch (error) {
    console.error("Error updating order:", error);
    return { success: false, error: "Failed to update order" };
  }
}

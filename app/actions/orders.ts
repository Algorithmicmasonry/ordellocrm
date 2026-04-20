"use server";

import * as Sentry from "@sentry/nextjs";
import { db, withRetry } from "@/lib/db";
import { getNextSalesRep } from "@/lib/round-robin";
import {
  updateInventoryOnDelivery,
  checkAndNotifyLowStock,
} from "@/lib/calculations";
import { OrderFormData, OrderFormDataV2 } from "@/lib/types";
import { OrderStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { notifySalesRep, notifyAdmins } from "./push-notifications";
import { createNotification, createBulkNotifications } from "./notifications";
import { determineOrderSource, formatUTMSource } from "@/lib/utm-parser";
import { triggerOutboundCall } from "@/lib/vapi";
import { formatCurrency } from "@/lib/currency";
import { requireOrgContext } from "@/lib/org-context";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get admin user IDs within an org (OWNER + ADMIN roles) */
async function getOrgAdminIds(organizationId: string): Promise<string[]> {
  const members = await db.organizationMember.findMany({
    where: { organizationId, role: { in: ["OWNER", "ADMIN"] }, isActive: true },
    select: { userId: true },
  });
  return members.map((m) => m.userId);
}

/** Check if a member is the AI agent within an org */
async function isMemberAiAgent(
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const member = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { isAiAgent: true },
  });
  return member?.isAiAgent ?? false;
}

// ---------------------------------------------------------------------------
// createOrder — public order form (V1)
// organizationId identifies which org's form was submitted
// ---------------------------------------------------------------------------
export async function createOrder(
  data: OrderFormData,
  organizationId: string,
) {
  let savedOrder: Awaited<ReturnType<typeof db.order.create>> | null = null;

  try {
    const assignedToId = await getNextSalesRep(undefined, organizationId);

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentDuplicate = await db.order.findFirst({
      where: {
        organizationId,
        customerPhone: data.customerPhone,
        createdAt: { gte: twoMinutesAgo },
      },
      select: { id: true, orderNumber: true },
    });

    if (recentDuplicate) {
      return { success: true, order: recentDuplicate, duplicate: true };
    }

    let totalAmount = 0;
    const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    for (const item of data.items) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
        include: { productPrices: true },
      });

      if (!product || product.organizationId !== organizationId) {
        return { success: false, error: `Product not found: ${item.productId}` };
      }

      const productPrice = product.productPrices.find(
        (p) => p.currency === product.currency,
      );
      if (!productPrice) {
        return { success: false, error: `Pricing not configured for product: ${product.name}` };
      }

      totalAmount += productPrice.price * item.quantity;
      orderItems.push({
        product: { connect: { id: product.id } },
        quantity: item.quantity,
        price: productPrice.price,
        cost: productPrice.cost,
      });
    }

    savedOrder = await withRetry(() =>
      db.order.create({
        data: {
          organizationId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerWhatsapp: data.customerWhatsapp,
          deliveryAddress: data.deliveryAddress,
          state: data.state,
          city: data.city,
          source: data.source,
          totalAmount,
          ...(assignedToId ? { assignedTo: { connect: { id: assignedToId } } } : {}),
          status: OrderStatus.NEW,
          items: { create: orderItems },
        },
        include: {
          items: { include: { product: true } },
          assignedTo: true,
        },
      }),
    );

    try {
      if (assignedToId) {
        await notifySalesRep(assignedToId, {
          title: `Order #${savedOrder.orderNumber}`,
          body: `Order from ${savedOrder.customerName} has been assigned to you`,
          url: `/dashboard/sales-rep/orders/${savedOrder.id}`,
          orderId: savedOrder.id,
        });
        await createNotification({
          userId: assignedToId,
          organizationId,
          type: "ORDER_ASSIGNED",
          title: "New Order Assigned",
          message: `Order ${savedOrder.orderNumber} from ${savedOrder.customerName} (${savedOrder.customerPhone}) has been assigned to you`,
          link: `/dashboard/sales-rep/orders/${savedOrder.id}`,
          orderId: savedOrder.id,
        });
      } else {
        const adminIds = await getOrgAdminIds(organizationId);
        await createBulkNotifications({
          userIds: adminIds,
          organizationId,
          type: "NEW_ORDER",
          title: "⚠️ Unassigned Order Received",
          message: `Order ${savedOrder.orderNumber} from ${savedOrder.customerName} has no sales rep assigned.`,
          link: `/dashboard/admin/orders/${savedOrder.id}`,
          orderId: savedOrder.id,
        });
      }
    } catch (notifyErr) {
      Sentry.captureException(notifyErr, { extra: { orderNumber: savedOrder.orderNumber } });
    }
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to create order" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin/orders");
  return { success: true, order: savedOrder! };
}

// ---------------------------------------------------------------------------
// createOrderV2 — public order form (V2, with packages + UTM)
// ---------------------------------------------------------------------------
export async function createOrderV2(
  data: OrderFormDataV2 & { organizationId: string },
) {
  const { organizationId } = data;
  const logPrefix = `[createOrderV2] org=${organizationId} name="${data.customerName}" phone=${data.customerPhone}`;
  console.log(`${logPrefix} | START`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let savedOrder: any = null;

  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentDuplicate = await withRetry(() =>
      db.order.findFirst({
        where: {
          organizationId,
          customerPhone: data.customerPhone,
          createdAt: { gte: twoMinutesAgo },
        },
        select: { id: true, orderNumber: true },
      }),
    );

    if (recentDuplicate) {
      console.log(`${logPrefix} | DUPLICATE detected — returning early`);
      return { success: true, order: recentDuplicate, duplicate: true };
    }

    // Assignment: sandbox → AI agent, GHS → Ghana manager, else → round-robin
    const ghanaManagerSetting = await withRetry(() =>
      db.systemSetting.findUnique({
        where: { organizationId_key: { organizationId, key: "ghana_manager_id" } },
      }),
    );
    const ghanaManagerId = ghanaManagerSetting?.value ?? null;

    let assignedToId: string | null;

    if (data.isSandbox) {
      const aiAgentSetting = await withRetry(() =>
        db.systemSetting.findUnique({
          where: { organizationId_key: { organizationId, key: "ai_agent_user_id" } },
        }),
      );
      const aiAgentId = aiAgentSetting?.value ?? null;
      if (!aiAgentId) {
        return { success: false, error: "No AI agent is configured." };
      }
      const aiMember = await db.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: aiAgentId } },
        select: { isAiAgent: true, isActive: true },
      });
      if (!aiMember?.isActive || !aiMember?.isAiAgent) {
        return { success: false, error: "AI agent account is inactive or no longer exists." };
      }
      assignedToId = aiAgentId;
      console.log(`${logPrefix} | SANDBOX — assigned to AI agent id=${aiAgentId}`);
    } else if (data.currency === "GHS" && ghanaManagerId) {
      const ghanaActive = await db.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: ghanaManagerId } },
        select: { isActive: true },
      });
      assignedToId = ghanaActive?.isActive ? ghanaManagerId : await getNextSalesRep(ghanaManagerId, organizationId);
    } else {
      assignedToId = await getNextSalesRep(ghanaManagerId ?? undefined, organizationId);
    }

    console.log(`${logPrefix} | fetching product + packages`);
    const product = await db.product.findUnique({
      where: { id: data.productId },
      include: {
        packages: {
          where: { id: { in: data.selectedPackages }, isActive: true, currency: data.currency },
          include: {
            components: {
              include: {
                product: { include: { productPrices: { where: { currency: data.currency } } } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        productPrices: { where: { currency: data.currency } },
      },
    });

    if (!product || product.organizationId !== organizationId) {
      return { success: false, error: "Product not found" };
    }

    if (product.packages.length === 0) {
      return { success: false, error: `No packages available for ${data.currency}.` };
    }

    const productPrice = product.productPrices[0];
    if (!productPrice) {
      return { success: false, error: `Pricing not configured for ${data.currency}.` };
    }

    let totalAmount = 0;
    const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    for (const pkg of product.packages) {
      totalAmount += pkg.price;
      const unitPrice = pkg.price / pkg.quantity;
      orderItems.push({
        product: { connect: { id: product.id } },
        quantity: pkg.quantity,
        price: unitPrice,
        cost: productPrice.cost,
      });

      for (const component of pkg.components) {
        const companionPrice = component.product.productPrices[0];
        if (!companionPrice) {
          return { success: false, error: `Pricing not configured for companion product: ${component.product.name}` };
        }
        orderItems.push({
          product: { connect: { id: component.productId } },
          quantity: component.quantity,
          price: 0,
          cost: companionPrice.cost,
        });
      }
    }

    const utmSource = data.utmParams ? formatUTMSource(data.utmParams) : undefined;
    const orderSource = determineOrderSource(utmSource, data.referrer);

    console.log(`${logPrefix} | creating order in DB...`);
    const txResult = await withRetry(() =>
      db.$transaction(async (tx) => {
        const concurrentDuplicate = await tx.order.findFirst({
          where: { organizationId, customerPhone: data.customerPhone, createdAt: { gte: twoMinutesAgo } },
          select: { id: true, orderNumber: true },
        });
        if (concurrentDuplicate) return { duplicate: true, order: concurrentDuplicate };

        const order = await tx.order.create({
          data: {
            organizationId,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            customerWhatsapp: data.customerWhatsapp,
            deliveryAddress: data.deliveryAddress,
            state: data.state,
            city: data.city,
            source: orderSource,
            currency: data.currency,
            utmSource,
            utmCampaign: data.utmParams?.campaign,
            utmContent: data.utmParams?.content,
            utmMedium: data.utmParams?.medium,
            utmTerm: data.utmParams?.term,
            referrer: data.referrer,
            totalAmount,
            isSandbox: data.isSandbox ?? false,
            ...(assignedToId ? { assignedTo: { connect: { id: assignedToId } } } : {}),
            status: OrderStatus.NEW,
            items: { create: orderItems },
          },
          include: {
            items: { include: { product: true } },
            assignedTo: true,
          },
        });
        return { duplicate: false, order };
      }),
    );

    if (txResult.duplicate) {
      return { success: true, order: txResult.order, duplicate: true };
    }

    savedOrder = txResult.order;
    console.log(`${logPrefix} | ORDER SAVED orderNumber=${savedOrder.orderNumber}`);

    // Notifications
    try {
      if (assignedToId) {
        await notifySalesRep(assignedToId, {
          title: `Order #${savedOrder.orderNumber}`,
          body: `Order from ${savedOrder.customerName} - ${formatCurrency(savedOrder.totalAmount, data.currency)}`,
          url: `/dashboard/sales-rep/orders/${savedOrder.id}`,
          orderId: savedOrder.id,
        });
        await createNotification({
          userId: assignedToId,
          organizationId,
          type: "ORDER_ASSIGNED",
          title: "New Order Assigned",
          message: `Order ${savedOrder.orderNumber} from ${savedOrder.customerName} (${savedOrder.customerPhone}) - ${formatCurrency(savedOrder.totalAmount, data.currency)}`,
          link: `/dashboard/sales-rep/orders/${savedOrder.id}`,
          orderId: savedOrder.id,
        });
      }

      const adminIds = await getOrgAdminIds(organizationId);
      await createBulkNotifications({
        userIds: adminIds,
        organizationId,
        type: "NEW_ORDER",
        title: assignedToId ? `New Order #${savedOrder.orderNumber}` : `⚠️ Unassigned Order #${savedOrder.orderNumber}`,
        message: `Order ${savedOrder.orderNumber} from ${savedOrder.customerName} (${savedOrder.customerPhone}) - ${formatCurrency(savedOrder.totalAmount, data.currency)}`,
        link: `/dashboard/admin/orders/${savedOrder.id}`,
        orderId: savedOrder.id,
      });
    } catch (notifyErr) {
      Sentry.captureException(notifyErr, { extra: { orderNumber: savedOrder.orderNumber } });
    }

    // AI agent trigger
    if (assignedToId) {
      try {
        const isAiAgent = await isMemberAiAgent(organizationId, assignedToId);
        const vapiEnabled = process.env.VAPI_ENABLED === "true";

        if (isAiAgent && (vapiEnabled || savedOrder.isSandbox)) {
          await db.order.update({
            where: { id: savedOrder.id },
            data: { aiCallStatus: "PENDING", aiCycleNumber: 1, aiCycleStartAt: new Date() },
          });

          const mainProductName = savedOrder.items[0]?.product.name ?? "your product";
          const packageDescription = (savedOrder.items as Array<{ quantity: number; product: { name: string } }>)
            .map((item) => `${item.quantity}x ${item.product.name}`)
            .join(", ");

          try {
            await triggerOutboundCall(
              {
                id: savedOrder.id,
                organizationId,
                orderNumber: savedOrder.orderNumber,
                customerName: savedOrder.customerName,
                customerPhone: savedOrder.customerPhone,
                customerWhatsapp: savedOrder.customerWhatsapp ?? null,
                deliveryAddress: savedOrder.deliveryAddress,
                city: savedOrder.city,
                state: savedOrder.state,
                totalAmount: savedOrder.totalAmount,
                currency: savedOrder.currency,
                productName: mainProductName,
                packageName: packageDescription,
                aiCallAttempts: 1,
                aiCycleNumber: 1,
              },
              1, 1, "confirmation",
            );
            console.log(`${logPrefix} | AI call attempt 1 fired`);
          } catch (err) {
            Sentry.captureException(err);
            console.error(`${logPrefix} | AI call attempt 1 failed:`, err);
            await db.order.update({
              where: { id: savedOrder.id },
              data: { aiNextCallAt: new Date(Date.now() + 5 * 60 * 1000) },
            }).catch(() => {});
          }
        }
      } catch (aiErr) {
        Sentry.captureException(aiErr);
      }
    }
  } catch (error) {
    Sentry.captureException(error, { extra: { context: logPrefix } });
    return { success: false, error: "Failed to create order" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/orders");
  console.log(`${logPrefix} | SUCCESS orderNumber=${savedOrder!.orderNumber}`);
  return { success: true, order: savedOrder! };
}

// ---------------------------------------------------------------------------
// updateOrderStatus
// ---------------------------------------------------------------------------
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
) {
  try {
    const ctx = await requireOrgContext();

    const order = await db.order.findUnique({
      where: { id: orderId, organizationId: ctx.organizationId },
      include: { assignedTo: true },
    });

    if (!order) return { success: false, error: "Order not found" };

    if (ctx.role === "SALES_REP" && order.assignedToId !== ctx.userId) {
      return { success: false, error: "Unauthorized" };
    }

    const updateData: any = { status };

    if (status === OrderStatus.CONFIRMED) updateData.confirmedAt = new Date();
    else if (status === OrderStatus.DISPATCHED) updateData.dispatchedAt = new Date();
    else if (status === OrderStatus.DELIVERED) updateData.deliveredAt = new Date();
    else if (status === OrderStatus.CANCELLED) updateData.cancelledAt = new Date();

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        items: { include: { product: true } },
        assignedTo: true,
        agent: true,
      },
    });

    if (status === OrderStatus.DELIVERED && order.status !== OrderStatus.DELIVERED) {
      await updateInventoryOnDelivery(orderId, ctx.organizationId, ctx.userId);
      for (const item of updatedOrder.items) {
        await checkAndNotifyLowStock(item.productId, ctx.organizationId);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin/orders");
    return { success: true, order: updatedOrder };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to update order status" };
  }
}

// ---------------------------------------------------------------------------
// assignAgentToOrder
// ---------------------------------------------------------------------------
export async function assignAgentToOrder(
  orderId: string,
  agentId: string,
) {
  try {
    const ctx = await requireOrgContext();

    const order = await db.order.findUnique({
      where: { id: orderId, organizationId: ctx.organizationId },
    });

    if (!order) return { success: false, error: "Order not found" };

    if (ctx.role === "SALES_REP" && order.assignedToId !== ctx.userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify agent belongs to this org
    const agent = await db.agent.findUnique({
      where: { id: agentId },
      select: { organizationId: true },
    });
    if (!agent || agent.organizationId !== ctx.organizationId) {
      return { success: false, error: "Agent not found" };
    }

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: { agentId },
      include: { agent: true },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin/orders");
    return { success: true, order: updatedOrder };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to assign agent" };
  }
}

// ---------------------------------------------------------------------------
// addOrderNote
// ---------------------------------------------------------------------------
export async function addOrderNote(
  orderId: string,
  note: string,
  isFollowUp: boolean,
  followUpDate: Date | null,
) {
  try {
    const ctx = await requireOrgContext();

    const order = await db.order.findUnique({
      where: { id: orderId, organizationId: ctx.organizationId },
    });

    if (!order) return { success: false, error: "Order not found" };

    if (ctx.role === "SALES_REP" && order.assignedToId !== ctx.userId) {
      return { success: false, error: "Unauthorized" };
    }

    const orderNote = await db.orderNote.create({
      data: { orderId, note, isFollowUp, followUpDate },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin/orders");
    return { success: true, note: orderNote };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to add note" };
  }
}

// ---------------------------------------------------------------------------
// getSalesRepOrders
// ---------------------------------------------------------------------------
export async function getSalesRepOrders() {
  try {
    const ctx = await requireOrgContext();

    const orders = await db.order.findMany({
      where: { organizationId: ctx.organizationId, assignedToId: ctx.userId },
      include: {
        items: { include: { product: true } },
        agent: true,
        notes: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, orders };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to fetch orders" };
  }
}

// ---------------------------------------------------------------------------
// getAllOrders — Admin only
// ---------------------------------------------------------------------------
export async function getAllOrders() {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Unauthorized" };
    }

    const orders = await db.order.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        items: { include: { product: true } },
        assignedTo: true,
        agent: true,
        notes: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, orders };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to fetch orders" };
  }
}

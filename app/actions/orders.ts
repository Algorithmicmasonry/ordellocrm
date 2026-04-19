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

/**
 * Create a new order from the embedded form
 * Automatically assigns to sales rep using round-robin
 */
export async function createOrder(data: OrderFormData) {
  // Declared outside try so revalidatePath runs even if notifications glitch
  let savedOrder: Awaited<ReturnType<typeof db.order.create>> | null = null;

  try {
    // Get next sales rep in round-robin (may be null if no active reps)
    const assignedToId = await getNextSalesRep();

    // Duplicate detection: if same phone submitted an order in the last 2 minutes, silently ignore
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentDuplicate = await db.order.findFirst({
      where: {
        customerPhone: data.customerPhone,
        createdAt: { gte: twoMinutesAgo },
      },
      select: { id: true, orderNumber: true },
    });

    if (recentDuplicate) {
      return { success: true, order: recentDuplicate, duplicate: true };
    }

    // Calculate total amount
    let totalAmount = 0;
    const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    for (const item of data.items) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
        include: {
          productPrices: true,
        },
      });

      if (!product) {
        return {
          success: false,
          error: `Product not found: ${item.productId}`,
        };
      }

      // Get pricing for the product's primary currency
      const productPrice = product.productPrices.find(
        (p) => p.currency === product.currency,
      );

      if (!productPrice) {
        return {
          success: false,
          error: `Pricing not configured for product: ${product.name}`,
        };
      }

      totalAmount += productPrice.price * item.quantity;

      orderItems.push({
        product: { connect: { id: product.id } },
        quantity: item.quantity,
        price: productPrice.price,
        cost: productPrice.cost,
      });
    }

    // Create order with items — withRetry handles Neon cold-start timeouts
    savedOrder = await withRetry(() =>
      db.order.create({
        data: {
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerWhatsapp: data.customerWhatsapp,
          deliveryAddress: data.deliveryAddress,
          state: data.state,
          city: data.city,
          source: data.source,
          totalAmount,
          ...(assignedToId
            ? { assignedTo: { connect: { id: assignedToId } } }
            : {}),
          status: OrderStatus.NEW,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: { include: { product: true } },
          assignedTo: true,
        },
      }),
    );

    // Fire notifications without letting failures affect order confirmation
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
          type: "ORDER_ASSIGNED",
          title: "New Order Assigned",
          message: `Order ${savedOrder.orderNumber} from ${savedOrder.customerName} (${savedOrder.customerPhone}) has been assigned to you`,
          link: `/dashboard/sales-rep/orders/${savedOrder.id}`,
          orderId: savedOrder.id,
        });
      } else {
        // No sales reps available — alert all admins to assign manually
        console.warn(
          `[createOrder] Order #${savedOrder.orderNumber} saved unassigned — alerting admins`,
        );
        const admins = await db.user.findMany({
          where: { role: "ADMIN", isActive: true },
          select: { id: true },
        });
        await createBulkNotifications({
          userIds: admins.map((a) => a.id),
          type: "NEW_ORDER",
          title: "⚠️ Unassigned Order Received",
          message: `Order ${savedOrder.orderNumber} from ${savedOrder.customerName} (${savedOrder.customerPhone}) has no sales rep assigned. Please assign manually.`,
          link: `/dashboard/admin/orders/${savedOrder.id}`,
          orderId: savedOrder.id,
        });
        await notifyAdmins({
          title: `⚠️ Unassigned Order #${savedOrder.orderNumber}`,
          body: `No sales reps available. Please assign manually.`,
          url: `/dashboard/admin/orders/${savedOrder.id}`,
          orderId: savedOrder.id,
        });
      }
    } catch (notifyErr) {
      Sentry.captureException(notifyErr, {
        extra: { orderNumber: savedOrder.orderNumber },
      });
    }
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      error: "Failed to create order",
    };
  }

  // revalidatePath is outside the try-catch so a DB-saved order always
  // returns success: true even in the (very unlikely) event revalidatePath throws.
  revalidatePath("/dashboard");
  revalidatePath("/admin");

  return { success: true, order: savedOrder! };
}

/**
 * Create a new order from the V2 embedded form (with packages and UTM tracking)
 * Automatically assigns to sales rep using round-robin
 */
export async function createOrderV2(data: OrderFormDataV2) {
  const logPrefix = `[createOrderV2] name="${data.customerName}" phone=${data.customerPhone} whatsapp=${data.customerWhatsapp ?? "none"} address="${data.deliveryAddress}" city=${data.city} state=${data.state} product=${data.productId} packages=${JSON.stringify(data.selectedPackages)} currency=${data.currency} utmSource=${data.utmParams?.source ?? "none"} referrer=${data.referrer ?? "none"}`;
  console.log(`${logPrefix} | START`);

  // Declared outside so revalidatePath runs even if an unlikely error occurs after save
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let savedOrder: any = null;

  try {
    // Duplicate detection FIRST (before round-robin) — prevents wasting a slot on duplicates
    // Uses a serializable transaction to block concurrent duplicate submissions
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentDuplicate = await withRetry(() =>
      db.order.findFirst({
        where: {
          customerPhone: data.customerPhone,
          createdAt: { gte: twoMinutesAgo },
        },
        select: { id: true, orderNumber: true },
      }),
    );

    if (recentDuplicate) {
      console.log(
        `${logPrefix} | DUPLICATE detected orderNumber=${recentDuplicate.orderNumber} — returning early`,
      );
      return { success: true, order: recentDuplicate, duplicate: true };
    }

    // Determine assignment: GHS orders go directly to Ghana manager; NGN orders use round-robin
    const ghanaManagerSetting = await withRetry(() =>
      db.systemSetting.findUnique({ where: { key: "ghana_manager_id" } }),
    );
    const ghanaManagerId = ghanaManagerSetting?.value ?? null;

    let assignedToId: string | null;

    if (data.isSandbox) {
      // Sandbox orders bypass round-robin and go directly to the AI agent
      const aiAgentSetting = await withRetry(() =>
        db.systemSetting.findUnique({ where: { key: "ai_agent_user_id" } }),
      );
      const aiAgentId = aiAgentSetting?.value ?? null;
      if (!aiAgentId) {
        return {
          success: false,
          error: "No AI agent is configured. Go to User Management and designate an AI agent first.",
        };
      }
      const aiAgent = await db.user.findFirst({
        where: { id: aiAgentId, isActive: true, isAiAgent: true },
      });
      if (!aiAgent) {
        return {
          success: false,
          error: "The configured AI agent account is inactive or no longer exists.",
        };
      }
      assignedToId = aiAgentId;
      console.log(`${logPrefix} | SANDBOX — assigned directly to AI agent id=${aiAgentId}`);
    } else if (data.currency === "GHS" && ghanaManagerId) {
      // Verify Ghana manager account is still active
      const ghanaManager = await db.user.findFirst({
        where: { id: ghanaManagerId, isActive: true },
      });
      assignedToId = ghanaManager ? ghanaManagerId : await getNextSalesRep();
      console.log(
        `${logPrefix} | GHS order → ghana-manager assignedToId=${assignedToId ?? "NONE"}`,
      );
    } else {
      // Nigerian order — round-robin, excluding Ghana manager so they don't get NGN orders
      assignedToId = await getNextSalesRep(ghanaManagerId ?? undefined);
      console.log(
        `${logPrefix} | round-robin assignedToId=${assignedToId ?? "NONE — order will be saved unassigned"}`,
      );
    }

    // Get product, packages, and pricing (filter by currency)
    console.log(
      `${logPrefix} | fetching product + packages selectedPackages=${JSON.stringify(data.selectedPackages)}`,
    );
    const product = await db.product.findUnique({
      where: { id: data.productId },
      include: {
        packages: {
          where: {
            id: { in: data.selectedPackages },
            isActive: true,
            currency: data.currency,
          },
          include: {
            components: {
              include: {
                product: {
                  include: {
                    productPrices: {
                      where: { currency: data.currency },
                    },
                  },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        productPrices: {
          where: {
            currency: data.currency,
          },
        },
      },
    });

    if (!product) {
      console.error(`${logPrefix} | ABORT product not found`);
      return {
        success: false,
        error: "Product not found",
      };
    }

    console.log(
      `${logPrefix} | product="${product.name}" packagesFound=${product.packages.length} pricesFound=${product.productPrices.length}`,
    );

    if (product.packages.length === 0) {
      console.error(
        `${logPrefix} | ABORT no packages for currency=${data.currency}`,
      );
      return {
        success: false,
        error: `No packages available for ${data.currency}. Please select a different currency or contact support.`,
      };
    }

    // Get product cost from ProductPrice table
    const productPrice = product.productPrices[0];
    if (!productPrice) {
      console.error(
        `${logPrefix} | ABORT no ProductPrice for currency=${data.currency}`,
      );
      return {
        success: false,
        error: `Pricing not configured for ${data.currency}. Please contact support.`,
      };
    }

    // Calculate total amount and create order items
    let totalAmount = 0;
    const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    for (const pkg of product.packages) {
      totalAmount += pkg.price;

      // Store unit price (package price / quantity) so that quantity × price = package price
      const unitPrice = pkg.price / pkg.quantity;

      orderItems.push({
        product: { connect: { id: product.id } },
        quantity: pkg.quantity,
        price: unitPrice, // Price per unit in package
        cost: productPrice.cost, // Cost per unit from ProductPrice table
      });

      // Companion products are tracked as separate order items for stock/cost.
      // They are priced at 0 so package price remains the customer-facing total.
      for (const component of pkg.components) {
        const companionPrice = component.product.productPrices[0];

        if (!companionPrice) {
          console.error(
            `${logPrefix} | ABORT missing companion pricing for product="${component.product.name}" currency=${data.currency}`,
          );
          return {
            success: false,
            error: `Pricing not configured for companion product: ${component.product.name} (${data.currency})`,
          };
        }

        orderItems.push({
          product: { connect: { id: component.productId } },
          quantity: component.quantity,
          price: 0,
          cost: companionPrice.cost,
        });
      }
    }

    console.log(
      `${logPrefix} | totalAmount=${totalAmount} items=${orderItems.length}`,
    );

    // Determine order source from UTM/referrer
    const utmSource = data.utmParams
      ? formatUTMSource(data.utmParams)
      : undefined;
    const orderSource = determineOrderSource(utmSource, data.referrer);
    console.log(
      `${logPrefix} | source=${orderSource} utmSource=${utmSource ?? "none"} referrer=${data.referrer ?? "none"}`,
    );

    // Create order inside a transaction — re-checks for duplicate at insert time
    // to prevent race conditions from near-simultaneous form submissions
    console.log(`${logPrefix} | creating order in DB...`);
    const txResult = await withRetry(() =>
      db.$transaction(async (tx) => {
        // Second duplicate check inside the transaction (catches concurrent submits)
        const concurrentDuplicate = await tx.order.findFirst({
          where: {
            customerPhone: data.customerPhone,
            createdAt: { gte: twoMinutesAgo },
          },
          select: { id: true, orderNumber: true },
        });
        if (concurrentDuplicate)
          return { duplicate: true, order: concurrentDuplicate };

        const order = await tx.order.create({
          data: {
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
            ...(assignedToId
              ? { assignedTo: { connect: { id: assignedToId } } }
              : {}),
            status: OrderStatus.NEW,
            items: {
              create: orderItems,
            },
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
      console.log(
        `${logPrefix} | CONCURRENT DUPLICATE detected orderNumber=${txResult.order.orderNumber} — returning early`,
      );
      return { success: true, order: txResult.order, duplicate: true };
    }

    savedOrder = txResult.order;

    console.log(
      `${logPrefix} | ORDER SAVED orderNumber=${savedOrder.orderNumber} id=${savedOrder.id} assignedTo=${savedOrder.assignedTo?.name ?? "UNASSIGNED"}`,
    );

    // Fire notifications without letting failures affect order confirmation
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
          type: "ORDER_ASSIGNED",
          title: "New Order Assigned",
          message: `Order ${savedOrder.orderNumber} from ${savedOrder.customerName} (${savedOrder.customerPhone}) - ${formatCurrency(savedOrder.totalAmount, data.currency)}`,
          link: `/dashboard/sales-rep/orders/${savedOrder.id}`,
          orderId: savedOrder.id,
        });
      } else {
        console.warn(
          `${logPrefix} | ORDER UNASSIGNED — notifying admins for manual assignment`,
        );
      }
      const admins = await db.user.findMany({
        where: { role: "ADMIN", isActive: true },
        select: { id: true, name: true },
      });
      const adminTitle = assignedToId
        ? "New Order Received"
        : "⚠️ Unassigned Order Received";
      const adminMessage = assignedToId
        ? `Order ${savedOrder.orderNumber} from ${savedOrder.customerName} (${savedOrder.customerPhone}) - ${formatCurrency(savedOrder.totalAmount, data.currency)}`
        : `Order ${savedOrder.orderNumber} from ${savedOrder.customerName} (${savedOrder.customerPhone}) has no sales rep assigned. Please assign manually.`;
      await createBulkNotifications({
        userIds: admins.map((a) => a.id),
        type: "NEW_ORDER",
        title: adminTitle,
        message: adminMessage,
        link: `/dashboard/admin/orders/${savedOrder.id}`,
        orderId: savedOrder.id,
      });
      await notifyAdmins({
        title: assignedToId
          ? `New Order #${savedOrder.orderNumber}`
          : `⚠️ Unassigned Order #${savedOrder.orderNumber}`,
        body: assignedToId
          ? `Order from ${savedOrder.customerName} - ${formatCurrency(savedOrder.totalAmount, data.currency)}`
          : `No sales reps available. Please assign manually.`,
        url: `/dashboard/admin/orders/${savedOrder.id}`,
        orderId: savedOrder.id,
      });
      console.log(
        `${logPrefix} | notifications sent for orderNumber=${savedOrder.orderNumber}`,
      );
    } catch (notifyErr) {
      Sentry.captureException(notifyErr, {
        extra: {
          context: `${logPrefix} | notification failed`,
          orderNumber: savedOrder.orderNumber,
        },
      });
    }

    // If the order was assigned to the AI agent, initialise AI fields and fire attempt 1
    if (assignedToId) {
      try {
        const assignedUser = await db.user.findUnique({
          where: { id: assignedToId },
          select: { isAiAgent: true },
        });

        const vapiEnabled = process.env.VAPI_ENABLED === "true";
        if (assignedUser?.isAiAgent && (vapiEnabled || savedOrder.isSandbox)) {
          const cycleStartAt = new Date();

          // Mark order as PENDING (cron uses this; we'll flip to IN_PROGRESS on call fire)
          await db.order.update({
            where: { id: savedOrder.id },
            data: {
              aiCallStatus: "PENDING",
              aiCycleNumber: 1,
              aiCycleStartAt: cycleStartAt,
            },
          });

          // Build product/package description from items for the AI prompt
          const mainProductName =
            savedOrder.items[0]?.product.name ?? "your product";
          const packageDescription = (savedOrder.items as Array<{ quantity: number; product: { name: string } }>)
            .map((item) => `${item.quantity}x ${item.product.name}`)
            .join(", ");

          // Trigger attempt 1 — awaited so Vercel doesn't terminate the function
          // before the HTTP request to Vapi completes.
          try {
            await triggerOutboundCall(
              {
                id: savedOrder.id,
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
              1,
              1,
              "confirmation",
            );
            console.log(
              `${logPrefix} | AI agent assigned — attempt 1 fired for orderNumber=${savedOrder.orderNumber}`,
            );
          } catch (err) {
            Sentry.captureException(err, {
              extra: {
                context: `${logPrefix} | AI call attempt 1 failed — scheduling retry in 5 min`,
                orderNumber: savedOrder.orderNumber,
              },
            });
            console.error(`${logPrefix} | AI call attempt 1 failed:`, err);
            // Write aiNextCallAt = now + 5 min so the cron picks it up shortly
            try {
              await db.order.update({
                where: { id: savedOrder.id },
                data: { aiNextCallAt: new Date(Date.now() + 5 * 60 * 1000) },
              });
            } catch {
              // If the DB update also fails, Sentry already has the original error
            }
          }
        }
      } catch (aiErr) {
        // AI trigger failure must never fail the order creation response
        Sentry.captureException(aiErr, {
          extra: {
            context: `${logPrefix} | AI agent setup failed`,
            orderNumber: savedOrder.orderNumber,
          },
        });
      }
    }
  } catch (error) {
    Sentry.captureException(error, { extra: { context: logPrefix } });
    return {
      success: false,
      error: "Failed to create order",
    };
  }

  // revalidatePath is outside the try-catch: a DB-saved order always returns success: true
  // even in the (very unlikely) event that revalidatePath itself throws.
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/orders");

  console.log(`${logPrefix} | SUCCESS orderNumber=${savedOrder!.orderNumber}`);
  return { success: true, order: savedOrder! };
}

/**
 * Update order status (Sales Rep & Admin)
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  userId: string,
  userRole: string,
) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { assignedTo: true },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Sales reps can only update their own orders
    if (userRole === "SALES_REP" && order.assignedToId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const updateData: any = { status };

    // Update timestamps based on status
    if (status === OrderStatus.CONFIRMED) {
      updateData.confirmedAt = new Date();
    } else if (status === OrderStatus.DISPATCHED) {
      updateData.dispatchedAt = new Date();
    } else if (status === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
      // Deduct inventory on delivery
      await updateInventoryOnDelivery(orderId, userId);
    } else if (status === OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
    }

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: updateData,
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

    // Check for low stock on all products in the order when delivered
    if (status === OrderStatus.DELIVERED) {
      for (const item of updatedOrder.items) {
        await checkAndNotifyLowStock(item.productId);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/admin");

    return { success: true, order: updatedOrder };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to update order status" };
  }
}

/**
 * Assign agent to order (Sales Rep & Admin)
 */
export async function assignAgentToOrder(
  orderId: string,
  agentId: string,
  userId: string,
  userRole: string,
) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Sales reps can only update their own orders
    if (userRole === "SALES_REP" && order.assignedToId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: { agentId },
      include: {
        agent: true,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin");

    return { success: true, order: updatedOrder };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to assign agent" };
  }
}

/**
 * Add note to order
 */
export async function addOrderNote(
  orderId: string,
  note: string,
  isFollowUp: boolean,
  followUpDate: Date | null,
  userId: string,
  userRole: string,
) {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Sales reps can only add notes to their own orders
    if (userRole === "SALES_REP" && order.assignedToId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const orderNote = await db.orderNote.create({
      data: {
        orderId,
        note,
        isFollowUp,
        followUpDate,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin");

    return { success: true, note: orderNote };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to add note" };
  }
}

/**
 * Get orders for sales rep
 */
export async function getSalesRepOrders(salesRepId: string) {
  try {
    const orders = await db.order.findMany({
      where: { assignedToId: salesRepId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        agent: true,
        notes: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, orders };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to fetch orders" };
  }
}

/**
 * Get all orders (Admin only)
 */
export async function getAllOrders() {
  try {
    const orders = await db.order.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
        assignedTo: true,
        agent: true,
        notes: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, orders };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to fetch orders" };
  }
}

// lib/queries/orders.ts

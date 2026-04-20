/**
 * WhatsApp Group Event Receiver
 *
 * Receives events from the Digital Ocean WhatsApp service when a delivery
 * agent replies in a WhatsApp group.
 *
 * The WhatsApp service must pass `organizationId` in every event so we can
 * scope order lookups correctly (orderNumber is unique per org, not globally).
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import { getWhatsAppMessage, type CallStage } from "@/lib/ai-agent";
import { triggerOutboundCall } from "@/lib/vapi";
import { createBulkNotifications } from "@/app/actions/notifications";
import { revalidatePath } from "next/cache";

interface GroupEvent {
  type: "agent_reply" | "message_sent" | "send_message";
  organizationId?: string; // Which org this WhatsApp service belongs to
  orderId?: string;
  orderNumber?: number;
  replyText?: string;
  quotedMessageId?: string;
  groupId?: string;
  senderPhone?: string;
  senderName?: string;
  messageId?: string;
  message?: string;
  targetGroupId?: string;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.WHATSAPP_SERVICE_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: GroupEvent;
  try {
    body = (await req.json()) as GroupEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    switch (body.type) {
      case "agent_reply":
        return await handleAgentReply(body);
      case "message_sent":
        return await handleMessageSent(body);
      default:
        return NextResponse.json({ ok: true });
    }
  } catch (error) {
    Sentry.captureException(error, {
      extra: { eventType: body.type, orderId: body.orderId, organizationId: body.organizationId },
    });
    console.error(`[whatsapp/group-event] ${body.type} error:`, error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Handle agent reply
// ---------------------------------------------------------------------------

async function handleAgentReply(body: GroupEvent) {
  const { orderId, orderNumber, replyText, senderName, organizationId } = body;

  if (!replyText) {
    return NextResponse.json({ error: "No reply text" }, { status: 400 });
  }

  // Find order — by orderId (globally unique) or orderNumber + organizationId
  let order;
  if (orderId) {
    order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
  } else if (orderNumber && organizationId) {
    // orderNumber is unique per org, not globally — must scope by org
    order = await db.order.findFirst({
      where: { organizationId, orderNumber },
      include: { items: { include: { product: true } } },
    });
  } else if (orderNumber) {
    // No organizationId — attempt a best-effort lookup (ambiguous in multi-tenant)
    console.warn(`[whatsapp/group-event] orderNumber lookup without organizationId — may be ambiguous`);
    order = await db.order.findFirst({
      where: { orderNumber },
      include: { items: { include: { product: true } } },
    });
  }

  if (!order) {
    console.warn(`[whatsapp/group-event] Order not found: orderId=${orderId} orderNumber=${orderNumber}`);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const reply = replyText.toLowerCase().trim();
  const status = parseAgentReply(reply);
  const agentLabel = senderName ?? "Delivery agent";

  console.log(`[whatsapp/group-event] Agent reply for order #${order.orderNumber}: "${replyText}" → ${status}`);

  switch (status) {
    case "delivered":
      return await handleDelivered(order, agentLabel, replyText);
    case "dispatched":
      return await handleDispatched(order, agentLabel, replyText);
    case "not_available":
      return await handleNotAvailable(order, agentLabel, replyText);
    default:
      await db.orderNote.create({
        data: {
          orderId: order.id,
          note: `[WhatsApp Group] ${agentLabel}: "${replyText}" — status unclear, needs manual review`,
        },
      });
      return NextResponse.json({ ok: true, parsed: "unknown", note: "saved for review" });
  }
}

// ---------------------------------------------------------------------------
// Status parsers
// ---------------------------------------------------------------------------

type ParsedStatus = "delivered" | "dispatched" | "not_available" | "unknown";

function parseAgentReply(reply: string): ParsedStatus {
  if (/\b(delivered|completed|done|received|successful|dropped)\b/i.test(reply)) return "delivered";
  if (/\b(dispatched|on\s*(the\s*)?(way|move|road)|heading|going|en\s*route|left|moving|transit)\b/i.test(reply)) return "dispatched";
  if (/\b(not\s*(available|around|home|there|picking|answering)|didn'?t\s*(pick|answer|come|open|respond)|no\s*(response|answer|show)|unavailable|absent|couldn'?t\s*(reach|find|deliver)|rejected|refused|rescheduled?|postpone)/i.test(reply)) return "not_available";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Status handlers
// ---------------------------------------------------------------------------

type OrderWithItems = NonNullable<Awaited<ReturnType<typeof db.order.findUnique>>> & { items: any[] };

async function getOrgAdminIds(organizationId: string): Promise<string[]> {
  const members = await db.organizationMember.findMany({
    where: { organizationId, role: { in: ["OWNER", "ADMIN"] }, isActive: true },
    select: { userId: true },
  });
  return members.map((m) => m.userId);
}

async function handleDelivered(order: OrderWithItems, agentLabel: string, rawReply: string) {
  await db.order.update({
    where: { id: order.id },
    data: { status: "DELIVERED", deliveredAt: new Date() },
  });

  await db.orderNote.create({
    data: { orderId: order.id, note: `[WhatsApp Group] ${agentLabel}: "${rawReply}" → Order marked as DELIVERED` },
  });

  const adminIds = await getOrgAdminIds(order.organizationId);
  await createBulkNotifications({
    userIds: adminIds,
    organizationId: order.organizationId,
    type: "ORDER_DELIVERED",
    title: `Order #${order.orderNumber} Delivered`,
    message: `${agentLabel} confirmed delivery for ${order.customerName}`,
    link: `/dashboard/admin/orders/${order.id}`,
    orderId: order.id,
  });

  const customerMsg = buildCustomerWhatsApp(order, "delivery");
  await db.orderNote.create({
    data: { orderId: order.id, note: `[WhatsApp → ${order.customerWhatsapp ?? order.customerPhone}] ${customerMsg}` },
  });

  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true, parsed: "delivered", orderId: order.id });
}

async function handleDispatched(order: OrderWithItems, agentLabel: string, rawReply: string) {
  await db.order.update({
    where: { id: order.id },
    data: { status: "DISPATCHED", dispatchedAt: new Date() },
  });

  await db.orderNote.create({
    data: { orderId: order.id, note: `[WhatsApp Group] ${agentLabel}: "${rawReply}" → Order marked as DISPATCHED` },
  });

  const customerMsg = buildCustomerWhatsApp(order, "dispatch");
  await db.orderNote.create({
    data: { orderId: order.id, note: `[WhatsApp → ${order.customerWhatsapp ?? order.customerPhone}] ${customerMsg}` },
  });

  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true, parsed: "dispatched", orderId: order.id });
}

async function handleNotAvailable(order: OrderWithItems, agentLabel: string, rawReply: string) {
  await db.order.update({
    where: { id: order.id },
    data: { status: "POSTPONED" },
  });

  await db.orderNote.create({
    data: { orderId: order.id, note: `[WhatsApp Group] ${agentLabel}: "${rawReply}" → Customer not available, order POSTPONED` },
  });

  const adminIds = await getOrgAdminIds(order.organizationId);
  await createBulkNotifications({
    userIds: adminIds,
    organizationId: order.organizationId,
    type: "ORDER_STATUS_CHANGED",
    title: `Order #${order.orderNumber} — Customer Not Available`,
    message: `${agentLabel}: "${rawReply}". Order postponed.`,
    link: `/dashboard/admin/orders/${order.id}`,
    orderId: order.id,
  });

  const whatsappNumber = order.customerWhatsapp ?? order.customerPhone;
  const msg =
    `Hi ${order.customerName}, our delivery agent tried to reach you for Order #${order.orderNumber} but you weren't available.\n\n` +
    `Please reply to this message with a good time for redelivery, or call us back. We want to make sure you get your order! 🙏`;

  await db.orderNote.create({
    data: { orderId: order.id, note: `[WhatsApp → ${whatsappNumber}] ${msg}` },
  });

  // If AI agent is assigned, trigger a follow-up call
  if (order.assignedToId) {
    const aiMember = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: order.organizationId, userId: order.assignedToId } },
      select: { isAiAgent: true },
    });

    if (aiMember?.isAiAgent && process.env.VAPI_ENABLED === "true") {
      try {
        const productName = order.items[0]?.product?.name ?? "your product";
        const packageDesc = order.items.map((i: any) => `${i.quantity}x ${i.product.name}`).join(", ");

        await triggerOutboundCall(
          {
            id: order.id,
            organizationId: order.organizationId,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerWhatsapp: order.customerWhatsapp ?? null,
            deliveryAddress: order.deliveryAddress,
            city: order.city,
            state: order.state,
            currency: order.currency,
            totalAmount: order.totalAmount,
            productName,
            packageName: packageDesc,
            aiCallAttempts: order.aiCallAttempts + 1,
            aiCycleNumber: order.aiCycleNumber,
          },
          order.aiCallAttempts + 1,
          order.aiCycleNumber,
          "dispatch",
        );
      } catch (err) {
        Sentry.captureException(err, { extra: { orderId: order.id, context: "AI call after customer not available" } });
      }
    }
  }

  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true, parsed: "not_available", orderId: order.id });
}

// ---------------------------------------------------------------------------
// Handle message sent confirmation
// ---------------------------------------------------------------------------

async function handleMessageSent(body: GroupEvent) {
  const { orderId, messageId } = body;

  if (!orderId || !messageId) {
    return NextResponse.json({ error: "Missing orderId or messageId" }, { status: 400 });
  }

  await db.order.update({
    where: { id: orderId },
    data: { agentWhatsappMessageId: messageId },
  });

  console.log(`[whatsapp/group-event] Message sent confirmation: orderId=${orderId} messageId=${messageId}`);
  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCustomerWhatsApp(order: OrderWithItems, stage: CallStage): string {
  const productName = order.items[0]?.product?.name ?? "your product";
  const packageDesc = order.items.map((i: any) => `${i.quantity}x ${i.product.name}`).join(", ");

  return getWhatsAppMessage(
    {
      id: order.id,
      organizationId: order.organizationId,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerWhatsapp: order.customerWhatsapp,
      deliveryAddress: order.deliveryAddress,
      city: order.city,
      state: order.state,
      currency: order.currency,
      totalAmount: order.totalAmount,
      productName,
      packageName: packageDesc,
      aiCallAttempts: order.aiCallAttempts,
      aiCycleNumber: order.aiCycleNumber,
    },
    "ANSWERED",
    stage,
  );
}

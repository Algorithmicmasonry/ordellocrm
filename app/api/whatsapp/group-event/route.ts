/**
 * WhatsApp Group Event Receiver
 *
 * Receives events from the Railway WhatsApp service when a delivery agent
 * replies in a WhatsApp group. The Railway service detects:
 *
 * 1. Quoted replies to a delivery assignment message (agent swipe-replies)
 * 2. Any message mentioning an order number as fallback
 *
 * Events carry the agent's reply text, which we parse to determine:
 * - "delivered" → mark order DELIVERED, notify customer
 * - "dispatched" / "on the way" → mark order DISPATCHED, notify customer
 * - "not available" / "didn't pick" → mark order POSTPONED, notify customer
 *
 * Also handles:
 * - Delivery assignment requests: AI sends assignment message to group
 * - Message send confirmations: Railway confirms message was sent + returns message ID
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import { getWhatsAppMessage, type CallStage } from "@/lib/ai-agent";
import { triggerOutboundCall } from "@/lib/vapi";
import { createBulkNotifications } from "@/app/actions/notifications";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GroupEvent {
  type: "agent_reply" | "message_sent" | "send_message";
  // agent_reply fields
  orderId?: string;
  orderNumber?: number;
  replyText?: string;
  quotedMessageId?: string; // the message ID that was quoted/swiped
  groupId?: string;
  senderPhone?: string;
  senderName?: string;
  // message_sent fields (confirmation from Railway)
  messageId?: string;
  // send_message fields (request to send)
  message?: string;
  targetGroupId?: string;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // Verify shared secret
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
      extra: { eventType: body.type, orderId: body.orderId },
    });
    console.error(`[whatsapp/group-event] ${body.type} error:`, error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Handle agent reply
// ---------------------------------------------------------------------------

async function handleAgentReply(body: GroupEvent) {
  const { orderId, orderNumber, replyText, senderName } = body;

  if (!replyText) {
    return NextResponse.json({ error: "No reply text" }, { status: 400 });
  }

  // Find the order — by orderId or orderNumber
  let order;
  if (orderId) {
    order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
  } else if (orderNumber) {
    order = await db.order.findUnique({
      where: { orderNumber },
      include: { items: { include: { product: true } } },
    });
  }

  if (!order) {
    console.warn(
      `[whatsapp/group-event] Order not found: orderId=${orderId} orderNumber=${orderNumber}`,
    );
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const reply = replyText.toLowerCase().trim();
  const status = parseAgentReply(reply);
  const agentLabel = senderName ?? "Delivery agent";

  console.log(
    `[whatsapp/group-event] Agent reply for order #${order.orderNumber}: "${replyText}" → parsed as: ${status}`,
  );

  switch (status) {
    case "delivered":
      return await handleDelivered(order, agentLabel, replyText);

    case "dispatched":
      return await handleDispatched(order, agentLabel, replyText);

    case "not_available":
      return await handleNotAvailable(order, agentLabel, replyText);

    case "unknown":
    default:
      // Save the reply as a note for human review
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
  // Delivered
  if (
    /\b(delivered|completed|done|received|successful|dropped)\b/i.test(reply)
  ) {
    return "delivered";
  }

  // Dispatched / on the way
  if (
    /\b(dispatched|on\s*(the\s*)?(way|move|road)|heading|going|en\s*route|left|moving|transit)\b/i.test(reply)
  ) {
    return "dispatched";
  }

  // Customer not available
  if (
    /\b(not\s*(available|around|home|there|picking|answering)|didn'?t\s*(pick|answer|come|open|respond)|no\s*(response|answer|show)|unavailable|absent|couldn'?t\s*(reach|find|deliver)|rejected|refused|rescheduled?|postpone)/i.test(reply)
  ) {
    return "not_available";
  }

  return "unknown";
}

// ---------------------------------------------------------------------------
// Status handlers
// ---------------------------------------------------------------------------

async function handleDelivered(
  order: Awaited<ReturnType<typeof db.order.findUnique>> & { items: any[] },
  agentLabel: string,
  rawReply: string,
) {
  await db.order.update({
    where: { id: order!.id },
    data: {
      status: "DELIVERED",
      deliveredAt: new Date(),
    },
  });

  await db.orderNote.create({
    data: {
      orderId: order!.id,
      note: `[WhatsApp Group] ${agentLabel}: "${rawReply}" → Order marked as DELIVERED`,
    },
  });

  // Notify admins
  const admins = await db.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });

  await createBulkNotifications({
    userIds: admins.map((a) => a.id),
    type: "ORDER_DELIVERED",
    title: `Order #${order!.orderNumber} Delivered`,
    message: `${agentLabel} confirmed delivery for ${order!.customerName}`,
    link: `/dashboard/admin/orders/${order!.id}`,
    orderId: order!.id,
  });

  // Queue WhatsApp delivery confirmation to customer
  const customerMsg = buildCustomerWhatsApp(order!, "delivery");
  await db.orderNote.create({
    data: {
      orderId: order!.id,
      note: `[WhatsApp → ${order!.customerWhatsapp ?? order!.customerPhone}] ${customerMsg}`,
    },
  });

  revalidatePath("/dashboard");

  return NextResponse.json({ ok: true, parsed: "delivered", orderId: order!.id });
}

async function handleDispatched(
  order: Awaited<ReturnType<typeof db.order.findUnique>> & { items: any[] },
  agentLabel: string,
  rawReply: string,
) {
  await db.order.update({
    where: { id: order!.id },
    data: {
      status: "DISPATCHED",
      dispatchedAt: new Date(),
    },
  });

  await db.orderNote.create({
    data: {
      orderId: order!.id,
      note: `[WhatsApp Group] ${agentLabel}: "${rawReply}" → Order marked as DISPATCHED`,
    },
  });

  // Queue WhatsApp dispatch notification to customer
  const customerMsg = buildCustomerWhatsApp(order!, "dispatch");
  await db.orderNote.create({
    data: {
      orderId: order!.id,
      note: `[WhatsApp → ${order!.customerWhatsapp ?? order!.customerPhone}] ${customerMsg}`,
    },
  });

  revalidatePath("/dashboard");

  return NextResponse.json({ ok: true, parsed: "dispatched", orderId: order!.id });
}

async function handleNotAvailable(
  order: Awaited<ReturnType<typeof db.order.findUnique>> & { items: any[] },
  agentLabel: string,
  rawReply: string,
) {
  await db.order.update({
    where: { id: order!.id },
    data: {
      status: "POSTPONED",
    },
  });

  await db.orderNote.create({
    data: {
      orderId: order!.id,
      note: `[WhatsApp Group] ${agentLabel}: "${rawReply}" → Customer not available, order POSTPONED`,
    },
  });

  // Notify admins
  const admins = await db.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });

  await createBulkNotifications({
    userIds: admins.map((a) => a.id),
    type: "ORDER_STATUS_CHANGED",
    title: `Order #${order!.orderNumber} — Customer Not Available`,
    message: `${agentLabel}: "${rawReply}". Order postponed.`,
    link: `/dashboard/admin/orders/${order!.id}`,
    orderId: order!.id,
  });

  // Send WhatsApp to customer asking them to respond
  const whatsappNumber = order!.customerWhatsapp ?? order!.customerPhone;
  const msg =
    `Hi ${order!.customerName}, our delivery agent tried to reach you for Order #${order!.orderNumber} but you weren't available.\n\n` +
    `Please reply to this message with a good time for redelivery, or call us back. We want to make sure you get your order! 🙏`;

  await db.orderNote.create({
    data: {
      orderId: order!.id,
      note: `[WhatsApp → ${whatsappNumber}] ${msg}`,
    },
  });

  // If AI agent is assigned, trigger a call to the customer
  if (order!.assignedToId) {
    const assignedUser = await db.user.findUnique({
      where: { id: order!.assignedToId },
      select: { isAiAgent: true },
    });

    if (assignedUser?.isAiAgent && process.env.VAPI_ENABLED === "true") {
      try {
        const productName = (order as any).items[0]?.product?.name ?? "your product";
        const packageDesc = (order as any).items
          .map((item: any) => `${item.quantity}x ${item.product.name}`)
          .join(", ");

        await triggerOutboundCall(
          {
            id: order!.id,
            orderNumber: order!.orderNumber,
            customerName: order!.customerName,
            customerPhone: order!.customerPhone,
            customerWhatsapp: order!.customerWhatsapp ?? null,
            deliveryAddress: order!.deliveryAddress,
            city: order!.city,
            state: order!.state,
            currency: order!.currency,
            totalAmount: order!.totalAmount,
            productName,
            packageName: packageDesc,
            aiCallAttempts: order!.aiCallAttempts + 1,
            aiCycleNumber: order!.aiCycleNumber,
          },
          order!.aiCallAttempts + 1,
          order!.aiCycleNumber,
          "dispatch",
        );
      } catch (err) {
        Sentry.captureException(err, {
          extra: { orderId: order!.id, context: "AI call after customer not available" },
        });
      }
    }
  }

  revalidatePath("/dashboard");

  return NextResponse.json({ ok: true, parsed: "not_available", orderId: order!.id });
}

// ---------------------------------------------------------------------------
// Handle message sent confirmation from Railway service
// ---------------------------------------------------------------------------

async function handleMessageSent(body: GroupEvent) {
  const { orderId, messageId } = body;

  if (!orderId || !messageId) {
    return NextResponse.json({ error: "Missing orderId or messageId" }, { status: 400 });
  }

  // Save the WhatsApp message ID so we can match replies later
  await db.order.update({
    where: { id: orderId },
    data: { agentWhatsappMessageId: messageId },
  });

  console.log(
    `[whatsapp/group-event] Message sent confirmation: orderId=${orderId} messageId=${messageId}`,
  );

  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCustomerWhatsApp(
  order: NonNullable<Awaited<ReturnType<typeof db.order.findUnique>>> & { items: any[] },
  stage: CallStage,
): string {
  const productName = order.items[0]?.product?.name ?? "your product";
  const packageDesc = order.items
    .map((item: any) => `${item.quantity}x ${item.product.name}`)
    .join(", ");

  return getWhatsAppMessage(
    {
      id: order.id,
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

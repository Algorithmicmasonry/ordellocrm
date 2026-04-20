/**
 * Vapi Webhook Handler
 *
 * Receives two types of events from Vapi:
 * 1. "tool-calls" — AI invoked a tool during a live call
 * 2. "end-of-call-report" — call ended; persist transcript, schedule retries
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import { scheduleNextCall } from "@/lib/vapi";
import { getWhatsAppMessage, type CallOutcome, type CallStage } from "@/lib/ai-agent";
import { createNotification, createBulkNotifications } from "@/app/actions/notifications";
import { getAvailableAgents, buildDeliveryAssignmentMessage } from "@/lib/agent-matcher";
import { revalidatePath } from "next/cache";

interface VapiToolCall {
  id: string;
  type: string;
  function: { name: string; arguments: Record<string, unknown> };
}

interface CallMetadata {
  orderId?: string;
  attemptNumber?: number;
  cycleNumber?: number;
  stage?: CallStage;
}

interface VapiMessage {
  type: string;
  call?: { id?: string; metadata?: CallMetadata };
  toolCallList?: VapiToolCall[];
  endedReason?: string;
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  durationSeconds?: number;
}

export async function POST(req: NextRequest) {
  let body: VapiMessage;

  try {
    body = (await req.json()) as VapiMessage;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messageType = body.type;

  try {
    if (messageType === "tool-calls") return await handleToolCalls(body);
    if (messageType === "end-of-call-report") {
      await handleEndOfCallReport(body);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error, {
      extra: { messageType, orderId: body.call?.metadata?.orderId },
    });
    console.error(`[vapi-webhook] ${messageType} error:`, error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Tool-calls handler — fetches order once to get organizationId
// ---------------------------------------------------------------------------

async function handleToolCalls(body: VapiMessage) {
  const toolCalls = body.toolCallList ?? [];
  const metadata = body.call?.metadata;
  const orderId = metadata?.orderId;

  if (!orderId) {
    return NextResponse.json({
      results: toolCalls.map((tc) => ({
        toolCallId: tc.id,
        result: "Error: no orderId in call metadata",
      })),
    });
  }

  // Fetch org context from the order once — passed to tools that need it
  const orderBase = await db.order.findUnique({
    where: { id: orderId },
    select: { organizationId: true },
  });
  const organizationId = orderBase?.organizationId;

  const results = [];

  for (const tc of toolCalls) {
    const fnName = tc.function.name;
    const args = tc.function.arguments;
    let result: string;

    try {
      switch (fnName) {
        case "confirmOrder":
          result = await toolConfirmOrder(orderId);
          break;
        case "postponeOrder":
          result = await toolPostponeOrder(orderId, args);
          break;
        case "cancelOrder":
          result = await toolCancelOrder(orderId, args);
          break;
        case "updateDeliveryDetails":
          result = await toolUpdateDeliveryDetails(orderId, args);
          break;
        case "addNote":
          result = await toolAddNote(orderId, args);
          break;
        case "scheduleFollowUp":
          result = await toolScheduleFollowUp(orderId, args, metadata);
          break;
        case "requestWhatsAppMessage":
          result = await toolRequestWhatsApp(orderId, args, metadata);
          break;
        case "reportDeliveryDispute":
          result = await toolReportDeliveryDispute(orderId, args, organizationId);
          break;
        case "assignToDeliveryAgent":
          result = await toolAssignToDeliveryAgent(orderId, args, organizationId);
          break;
        default:
          result = `Unknown tool: ${fnName}`;
      }
    } catch (err) {
      Sentry.captureException(err, { extra: { tool: fnName, orderId, args } });
      result = `Tool ${fnName} failed: ${err instanceof Error ? err.message : "unknown error"}`;
    }

    results.push({ toolCallId: tc.id, result });
  }

  return NextResponse.json({ results });
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

async function toolConfirmOrder(orderId: string): Promise<string> {
  const order = await db.order.update({
    where: { id: orderId },
    data: { status: "CONFIRMED", confirmedAt: new Date(), aiCallStatus: "REACHED" },
  });
  revalidatePath("/dashboard");
  return `Order #${order.orderNumber} confirmed successfully.`;
}

async function toolPostponeOrder(orderId: string, args: Record<string, unknown>): Promise<string> {
  const reason = (args.reason as string) ?? "Customer requested postponement";
  const order = await db.order.update({
    where: { id: orderId },
    data: { status: "POSTPONED", aiCallStatus: "REACHED" },
  });
  await db.orderNote.create({ data: { orderId, note: `Order postponed by AI agent. Reason: ${reason}` } });
  revalidatePath("/dashboard");
  return `Order #${order.orderNumber} postponed. Reason: ${reason}`;
}

async function toolCancelOrder(orderId: string, args: Record<string, unknown>): Promise<string> {
  const reason = (args.reason as string) ?? "Customer requested cancellation";
  const order = await db.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED", cancelledAt: new Date(), aiCallStatus: "REACHED" },
  });
  await db.orderNote.create({ data: { orderId, note: `Order cancelled by AI agent. Reason: ${reason}` } });
  revalidatePath("/dashboard");
  return `Order #${order.orderNumber} cancelled. Reason: ${reason}`;
}

async function toolUpdateDeliveryDetails(orderId: string, args: Record<string, unknown>): Promise<string> {
  const updates: Record<string, unknown> = {};
  const changes: string[] = [];

  if (args.deliveryAddress && typeof args.deliveryAddress === "string") {
    updates.deliveryAddress = args.deliveryAddress;
    changes.push(`address → "${args.deliveryAddress}"`);
  }
  if (args.city && typeof args.city === "string") {
    updates.city = args.city;
    changes.push(`city → "${args.city}"`);
  }
  if (args.state && typeof args.state === "string") {
    updates.state = args.state;
    changes.push(`state → "${args.state}"`);
  }
  if (args.deliveryPreference && typeof args.deliveryPreference === "string") {
    updates.deliverySlot = args.deliveryPreference;
    changes.push(`delivery preference → "${args.deliveryPreference}"`);
  }

  if (Object.keys(updates).length === 0) return "No delivery details provided to update.";

  const order = await db.order.update({ where: { id: orderId }, data: updates });
  return `Order #${order.orderNumber} updated: ${changes.join(", ")}`;
}

async function toolAddNote(orderId: string, args: Record<string, unknown>): Promise<string> {
  const note = (args.note as string) ?? (args.message as string) ?? "";
  if (!note.trim()) return "No note content provided.";
  await db.orderNote.create({ data: { orderId, note: `[AI Agent] ${note}` } });
  return "Note saved.";
}

async function toolScheduleFollowUp(
  orderId: string,
  args: Record<string, unknown>,
  metadata?: CallMetadata,
): Promise<string> {
  const dateStr = args.dateTime as string | undefined;
  const reason = (args.reason as string) ?? "Customer requested callback";

  let followUpDate: Date;
  if (dateStr) {
    followUpDate = new Date(dateStr);
    if (isNaN(followUpDate.getTime())) followUpDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
  } else {
    followUpDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
  }

  await db.orderNote.create({
    data: { orderId, note: `[AI Agent] Follow-up scheduled: ${reason}`, isFollowUp: true, followUpDate },
  });
  await db.order.update({
    where: { id: orderId },
    data: { aiCallStatus: "PENDING", aiNextCallAt: followUpDate },
  });

  const formatted = followUpDate.toLocaleString("en-NG", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos",
  });
  return `Follow-up scheduled for ${formatted}. Reason: ${reason}`;
}

async function toolRequestWhatsApp(
  orderId: string,
  args: Record<string, unknown>,
  metadata?: CallMetadata,
): Promise<string> {
  const stage = (metadata?.stage as CallStage) ?? "confirmation";

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) return "Order not found.";

  const whatsappNumber = order.customerWhatsapp ?? order.customerPhone;
  const productName = order.items[0]?.product.name ?? "your product";
  const packageDesc = order.items.map((i) => `${i.quantity}x ${i.product.name}`).join(", ");

  const message = getWhatsAppMessage(
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

  const callLog = await db.aiCallLog.findFirst({ where: { orderId }, orderBy: { createdAt: "desc" } });
  if (callLog) {
    await db.aiCallLog.update({ where: { id: callLog.id }, data: { whatsappSent: true, whatsappSentAt: new Date() } });
  }

  await db.orderNote.create({ data: { orderId, note: `[WhatsApp → ${whatsappNumber}] ${message}` } });
  return `WhatsApp message queued for ${whatsappNumber}.`;
}

async function toolReportDeliveryDispute(
  orderId: string,
  args: Record<string, unknown>,
  organizationId?: string,
): Promise<string> {
  const description = (args.description as string) ?? "Customer reports they did not receive the order.";

  await db.orderNote.create({ data: { orderId, note: `[DELIVERY DISPUTE] ${description}` } });

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true, customerName: true, customerPhone: true, organizationId: true },
  });

  if (order) {
    const orgId = organizationId ?? order.organizationId;

    // Get admin members of this org
    const adminMembers = await db.organizationMember.findMany({
      where: { organizationId: orgId, role: { in: ["OWNER", "ADMIN"] }, isActive: true },
      select: { userId: true },
    });

    await createBulkNotifications({
      userIds: adminMembers.map((m) => m.userId),
      organizationId: orgId,
      type: "GENERAL",
      title: `⚠️ Delivery Dispute — Order #${order.orderNumber}`,
      message: `${order.customerName} (${order.customerPhone}) reports they did NOT receive their order. ${description}`,
      link: `/dashboard/admin/orders/${orderId}`,
      orderId,
    });
  }

  return "Delivery dispute reported. Admin team has been notified.";
}

async function toolAssignToDeliveryAgent(
  orderId: string,
  args: Record<string, unknown>,
  organizationId?: string,
): Promise<string> {
  const agentId = args.agentId as string | undefined;

  if (!agentId) {
    // No agent selected — return list so AI can choose
    const agents = await getAvailableAgents(organizationId);

    if (agents.length === 0) {
      return "No delivery agents are currently available. The admin will assign one manually.";
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { city: true, state: true, deliveryAddress: true },
    });

    const agentList = agents.map((a) => `- ID: ${a.id} | Name: ${a.name} | Location: ${a.location}`).join("\n");

    return (
      `Customer address: ${order?.deliveryAddress ?? ""}, ${order?.city ?? ""}, ${order?.state ?? ""}\n\n` +
      `Available delivery agents:\n${agentList}\n\n` +
      `Pick the agent whose location best covers the customer's address and call this tool again with their agentId.`
    );
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) return "Order not found.";

  // Verify agent belongs to this org
  const agent = await db.agent.findUnique({
    where: { id: agentId, organizationId: order.organizationId },
    select: { id: true, name: true, phone: true, whatsappGroupId: true },
  });
  if (!agent) return "Agent not found.";

  await db.order.update({ where: { id: orderId }, data: { agentId: agent.id } });

  const message = buildDeliveryAssignmentMessage({
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerWhatsapp: order.customerWhatsapp,
    deliveryAddress: order.deliveryAddress,
    city: order.city,
    state: order.state,
    currency: order.currency,
    totalAmount: order.totalAmount,
    items: order.items.map((item) => ({ quantity: item.quantity, productName: item.product.name })),
  });

  await db.orderNote.create({
    data: {
      orderId,
      note: `[AI Agent] Assigned to delivery agent: ${agent.name} (${agent.phone}).\n\nDelivery message:\n${message}`,
    },
  });

  if (agent.whatsappGroupId) {
    await db.orderNote.create({ data: { orderId, note: `[WhatsApp Group → ${agent.name}] ${message}` } });
  }

  revalidatePath("/dashboard");
  return `Order assigned to ${agent.name}. Delivery assignment message prepared.${agent.whatsappGroupId ? " Message will be sent to the agent's WhatsApp group." : " No WhatsApp group configured — message saved for manual sending."}`;
}

// ---------------------------------------------------------------------------
// End-of-call-report handler
// ---------------------------------------------------------------------------

async function handleEndOfCallReport(body: VapiMessage) {
  const metadata = body.call?.metadata;
  const orderId = metadata?.orderId;
  const vapiCallId = body.call?.id;

  if (!orderId) {
    console.warn("[vapi-webhook] end-of-call-report with no orderId — skipping");
    return;
  }

  const attemptNumber = metadata?.attemptNumber ?? 1;
  const cycleNumber = metadata?.cycleNumber ?? 1;
  const stage = metadata?.stage ?? "confirmation";
  const outcome = mapEndedReasonToOutcome(body.endedReason);

  const callLog = vapiCallId
    ? await db.aiCallLog.findFirst({ where: { vapiCallId } })
    : await db.aiCallLog.findFirst({ where: { orderId }, orderBy: { createdAt: "desc" } });

  if (callLog) {
    await db.aiCallLog.update({
      where: { id: callLog.id },
      data: {
        outcome,
        transcript: body.transcript ?? null,
        durationSecs: body.durationSeconds ? Math.round(body.durationSeconds) : null,
      },
    });
  }

  if (outcome === "ANSWERED") {
    await db.order.update({ where: { id: orderId }, data: { aiCallStatus: "REACHED" } });
    console.log(`[vapi-webhook] end-of-call orderId=${orderId} outcome=ANSWERED`);
    return;
  }

  console.log(`[vapi-webhook] end-of-call orderId=${orderId} outcome=${outcome} — scheduling retry`);

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { aiCycleStartAt: true, customerWhatsapp: true, customerPhone: true, organizationId: true },
  });

  // scheduleNextCall now requires organizationId as 2nd param
  await scheduleNextCall(
    orderId,
    order?.organizationId ?? "",
    attemptNumber + 1,
    cycleNumber,
    order?.aiCycleStartAt ?? undefined,
  );

  if (attemptNumber === 1 && order) {
    const whatsappNumber = order.customerWhatsapp ?? order.customerPhone;

    const fullOrder = await db.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });

    if (fullOrder) {
      const productName = fullOrder.items[0]?.product.name ?? "your product";
      const packageDesc = fullOrder.items.map((i) => `${i.quantity}x ${i.product.name}`).join(", ");

      const message = getWhatsAppMessage(
        {
          id: fullOrder.id,
          organizationId: fullOrder.organizationId,
          orderNumber: fullOrder.orderNumber,
          customerName: fullOrder.customerName,
          customerPhone: fullOrder.customerPhone,
          customerWhatsapp: fullOrder.customerWhatsapp,
          deliveryAddress: fullOrder.deliveryAddress,
          city: fullOrder.city,
          state: fullOrder.state,
          currency: fullOrder.currency,
          totalAmount: fullOrder.totalAmount,
          productName,
          packageName: packageDesc,
          aiCallAttempts: fullOrder.aiCallAttempts,
          aiCycleNumber: fullOrder.aiCycleNumber,
        },
        outcome as CallOutcome,
        stage,
      );

      await db.orderNote.create({
        data: { orderId, note: `[WhatsApp → ${whatsappNumber}] (missed call follow-up) ${message}` },
      });

      if (callLog) {
        await db.aiCallLog.update({
          where: { id: callLog.id },
          data: { whatsappSent: true, whatsappSentAt: new Date() },
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapEndedReasonToOutcome(endedReason?: string): CallOutcome {
  if (!endedReason) return "FAILED";
  const reason = endedReason.toLowerCase();
  if (reason.includes("assistant-ended-call") || reason.includes("customer-ended-call")) return "ANSWERED";
  if (reason.includes("no-answer") || reason.includes("did-not-answer")) return "NO_ANSWER";
  if (reason.includes("busy")) return "BUSY";
  if (reason.includes("voicemail")) return "VOICEMAIL";
  return "FAILED";
}

/**
 * Vapi Webhook Handler
 *
 * Receives two types of events from Vapi:
 *
 * 1. "tool-calls" — the AI assistant invoked a tool during a live call.
 *    We execute the tool (DB update, notification, etc.) and return results
 *    so the AI can continue the conversation.
 *
 * 2. "end-of-call-report" — the call has ended. We persist the transcript,
 *    record the outcome, schedule retries if unanswered, and optionally
 *    trigger a WhatsApp follow-up.
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import { scheduleNextCall } from "@/lib/vapi";
import {
  getWhatsAppMessage,
  type CallOutcome,
  type CallStage,
} from "@/lib/ai-agent";
import { createNotification, createBulkNotifications } from "@/app/actions/notifications";
import { getAvailableAgents, buildDeliveryAssignmentMessage } from "@/lib/agent-matcher";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VapiToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface CallMetadata {
  orderId?: string;
  attemptNumber?: number;
  cycleNumber?: number;
  stage?: CallStage;
}

interface VapiMessage {
  type: string;
  call?: {
    id?: string;
    metadata?: CallMetadata;
  };
  toolCallList?: VapiToolCall[];
  // end-of-call-report fields
  endedReason?: string;
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  durationSeconds?: number;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let body: VapiMessage;

  try {
    body = (await req.json()) as VapiMessage;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messageType = body.type;

  try {
    if (messageType === "tool-calls") {
      return await handleToolCalls(body);
    }

    if (messageType === "end-of-call-report") {
      await handleEndOfCallReport(body);
      return NextResponse.json({ ok: true });
    }

    // Other message types (status-update, transcript, etc.) — acknowledge
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
// Tool-calls handler
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
          result = await toolReportDeliveryDispute(orderId, args);
          break;
        case "assignToDeliveryAgent":
          result = await toolAssignToDeliveryAgent(orderId, args);
          break;
        default:
          result = `Unknown tool: ${fnName}`;
      }
    } catch (err) {
      Sentry.captureException(err, {
        extra: { tool: fnName, orderId, args },
      });
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
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      aiCallStatus: "REACHED",
    },
  });

  revalidatePath("/dashboard");
  return `Order #${order.orderNumber} confirmed successfully.`;
}

async function toolPostponeOrder(
  orderId: string,
  args: Record<string, unknown>,
): Promise<string> {
  const reason = (args.reason as string) ?? "Customer requested postponement";

  const order = await db.order.update({
    where: { id: orderId },
    data: {
      status: "POSTPONED",
      aiCallStatus: "REACHED",
    },
  });

  await db.orderNote.create({
    data: {
      orderId,
      note: `Order postponed by AI agent. Reason: ${reason}`,
    },
  });

  revalidatePath("/dashboard");
  return `Order #${order.orderNumber} postponed. Reason: ${reason}`;
}

async function toolCancelOrder(
  orderId: string,
  args: Record<string, unknown>,
): Promise<string> {
  const reason = (args.reason as string) ?? "Customer requested cancellation";

  const order = await db.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      aiCallStatus: "REACHED",
    },
  });

  await db.orderNote.create({
    data: {
      orderId,
      note: `Order cancelled by AI agent. Reason: ${reason}`,
    },
  });

  revalidatePath("/dashboard");
  return `Order #${order.orderNumber} cancelled. Reason: ${reason}`;
}

async function toolUpdateDeliveryDetails(
  orderId: string,
  args: Record<string, unknown>,
): Promise<string> {
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

  if (Object.keys(updates).length === 0) {
    return "No delivery details provided to update.";
  }

  const order = await db.order.update({
    where: { id: orderId },
    data: updates,
  });

  return `Order #${order.orderNumber} updated: ${changes.join(", ")}`;
}

async function toolAddNote(
  orderId: string,
  args: Record<string, unknown>,
): Promise<string> {
  const note = (args.note as string) ?? (args.message as string) ?? "";
  if (!note.trim()) return "No note content provided.";

  await db.orderNote.create({
    data: {
      orderId,
      note: `[AI Agent] ${note}`,
    },
  });

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
    if (isNaN(followUpDate.getTime())) {
      // If AI passed something unparseable, default to 2 hours from now
      followUpDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
    }
  } else {
    followUpDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
  }

  // Save note with follow-up date
  await db.orderNote.create({
    data: {
      orderId,
      note: `[AI Agent] Follow-up scheduled: ${reason}`,
      isFollowUp: true,
      followUpDate,
    },
  });

  // Schedule the next call at the requested time
  await db.order.update({
    where: { id: orderId },
    data: {
      aiCallStatus: "PENDING",
      aiNextCallAt: followUpDate,
    },
  });

  const formatted = followUpDate.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
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
  const packageDesc = order.items
    .map((item) => `${item.quantity}x ${item.product.name}`)
    .join(", ");

  const message = getWhatsAppMessage(
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

  // Mark WhatsApp as requested — the actual sending is handled by the
  // WhatsApp service (Railway) which polls or receives events.
  // For now, save the message to the latest call log.
  const callLog = await db.aiCallLog.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });

  if (callLog) {
    await db.aiCallLog.update({
      where: { id: callLog.id },
      data: { whatsappSent: true, whatsappSentAt: new Date() },
    });
  }

  // Save the WhatsApp message as a note so it's visible in the dashboard
  await db.orderNote.create({
    data: {
      orderId,
      note: `[WhatsApp → ${whatsappNumber}] ${message}`,
    },
  });

  return `WhatsApp message queued for ${whatsappNumber}.`;
}

async function toolReportDeliveryDispute(
  orderId: string,
  args: Record<string, unknown>,
): Promise<string> {
  const description =
    (args.description as string) ??
    "Customer reports they did not receive the order.";

  // Save detailed note
  await db.orderNote.create({
    data: {
      orderId,
      note: `[DELIVERY DISPUTE] ${description}`,
    },
  });

  // Notify all admins
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true, customerName: true, customerPhone: true },
  });

  if (order) {
    const admins = await db.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true },
    });

    await createBulkNotifications({
      userIds: admins.map((a) => a.id),
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
): Promise<string> {
  const agentId = args.agentId as string | undefined;

  if (!agentId) {
    // No agent selected yet — return the list so the AI can choose
    const agents = await getAvailableAgents();

    if (agents.length === 0) {
      return "No delivery agents are currently available. The admin will assign one manually.";
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { city: true, state: true, deliveryAddress: true },
    });

    const agentList = agents
      .map((a) => `- ID: ${a.id} | Name: ${a.name} | Location: ${a.location}`)
      .join("\n");

    return (
      `Customer address: ${order?.deliveryAddress ?? ""}, ${order?.city ?? ""}, ${order?.state ?? ""}\n\n` +
      `Available delivery agents:\n${agentList}\n\n` +
      `Pick the agent whose location best covers the customer's address and call this tool again with their agentId.`
    );
  }

  // Agent selected — assign and build delivery message
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });

  if (!order) return "Order not found.";

  const agent = await db.agent.findUnique({
    where: { id: agentId },
    select: { id: true, name: true, phone: true, whatsappGroupId: true },
  });

  if (!agent) return "Agent not found.";

  // Assign agent to order
  await db.order.update({
    where: { id: orderId },
    data: { agentId: agent.id },
  });

  // Build the delivery assignment message
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
    items: order.items.map((item) => ({
      quantity: item.quantity,
      productName: item.product.name,
    })),
  });

  // Save the delivery assignment as a note
  await db.orderNote.create({
    data: {
      orderId,
      note: `[AI Agent] Assigned to delivery agent: ${agent.name} (${agent.phone}).\n\nDelivery message for WhatsApp group:\n${message}`,
    },
  });

  // If agent has a WhatsApp group, queue the message for the Railway service
  if (agent.whatsappGroupId) {
    await db.orderNote.create({
      data: {
        orderId,
        note: `[WhatsApp Group → ${agent.name}] ${message}`,
      },
    });
  }

  revalidatePath("/dashboard");

  return `Order assigned to ${agent.name} (covers ${agent.phone}). Delivery assignment message has been prepared.${agent.whatsappGroupId ? " Message will be sent to the agent's WhatsApp group." : " No WhatsApp group configured for this agent — message saved for manual sending."}`;
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

  // Map Vapi endedReason to our CallOutcome
  const outcome = mapEndedReasonToOutcome(body.endedReason);

  // Find the call log for this call
  const callLog = vapiCallId
    ? await db.aiCallLog.findFirst({ where: { vapiCallId } })
    : await db.aiCallLog.findFirst({
        where: { orderId },
        orderBy: { createdAt: "desc" },
      });

  // Update call log with outcome, transcript, and duration
  if (callLog) {
    await db.aiCallLog.update({
      where: { id: callLog.id },
      data: {
        outcome,
        transcript: body.transcript ?? null,
        durationSecs: body.durationSeconds
          ? Math.round(body.durationSeconds)
          : null,
      },
    });
  }

  // If the customer answered and the call stage is confirmation,
  // the order status has already been updated by tool calls (confirmOrder, etc.)
  // We just need to handle the unanswered/failed cases.
  if (outcome === "ANSWERED") {
    // Call was answered — the AI handled it via tool calls.
    // Mark the call status as REACHED if not already set by a tool.
    await db.order.update({
      where: { id: orderId },
      data: { aiCallStatus: "REACHED" },
    });

    console.log(
      `[vapi-webhook] end-of-call orderId=${orderId} outcome=ANSWERED attempt=${attemptNumber}/${cycleNumber}`,
    );
    return;
  }

  // Unanswered / failed — schedule next attempt
  console.log(
    `[vapi-webhook] end-of-call orderId=${orderId} outcome=${outcome} attempt=${attemptNumber}/${cycleNumber} — scheduling retry`,
  );

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { aiCycleStartAt: true, customerWhatsapp: true, customerPhone: true },
  });

  await scheduleNextCall(
    orderId,
    attemptNumber + 1,
    cycleNumber,
    order?.aiCycleStartAt ?? undefined,
  );

  // Send a "we tried calling you" WhatsApp for first missed call in a cycle
  if (attemptNumber === 1 && order) {
    const whatsappNumber = order.customerWhatsapp ?? order.customerPhone;

    // Fetch full order for WhatsApp message
    const fullOrder = await db.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });

    if (fullOrder) {
      const productName = fullOrder.items[0]?.product.name ?? "your product";
      const packageDesc = fullOrder.items
        .map((item) => `${item.quantity}x ${item.product.name}`)
        .join(", ");

      const message = getWhatsAppMessage(
        {
          id: fullOrder.id,
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

      // Save WhatsApp message as note
      await db.orderNote.create({
        data: {
          orderId,
          note: `[WhatsApp → ${whatsappNumber}] (missed call follow-up) ${message}`,
        },
      });

      // Mark on call log
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

/**
 * Maps Vapi's endedReason to our AiCallOutcome enum.
 *
 * Vapi endedReason values:
 * - "assistant-ended-call" / "customer-ended-call" → ANSWERED
 * - "customer-did-not-answer" → NO_ANSWER
 * - "customer-busy" → BUSY
 * - "voicemail" → VOICEMAIL
 * - Everything else (error, silence, etc.) → FAILED
 */
function mapEndedReasonToOutcome(endedReason?: string): CallOutcome {
  if (!endedReason) return "FAILED";

  const reason = endedReason.toLowerCase();

  if (
    reason.includes("assistant-ended-call") ||
    reason.includes("customer-ended-call") ||
    reason === "assistant-ended-call" ||
    reason === "customer-ended-call"
  ) {
    return "ANSWERED";
  }

  if (reason.includes("no-answer") || reason.includes("did-not-answer")) {
    return "NO_ANSWER";
  }

  if (reason.includes("busy")) {
    return "BUSY";
  }

  if (reason.includes("voicemail")) {
    return "VOICEMAIL";
  }

  return "FAILED";
}

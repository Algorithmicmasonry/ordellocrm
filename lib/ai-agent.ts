/**
 * AI Agent core logic
 * Handles call scheduling, WhatsApp message templates, calling window rules,
 * and Vapi system prompt generation.
 *
 * No external dependencies — pure scheduling and template logic.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CallStage = "confirmation" | "dispatch" | "delivery";

export type CallOutcome =
  | "ANSWERED"
  | "NO_ANSWER"
  | "BUSY"
  | "FAILED"
  | "VOICEMAIL";

export interface OrderContext {
  id: string;
  organizationId: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  customerWhatsapp: string | null;
  deliveryAddress: string;
  city: string;
  state: string;
  currency: string;
  totalAmount: number;
  productName: string;
  packageName: string;
  aiCallAttempts: number;
  aiCycleNumber: number;
}

// ---------------------------------------------------------------------------
// Calling window — cycle 2+ must respect 8am–9pm WAT (UTC+1)
// ---------------------------------------------------------------------------

const CALLING_WINDOW_START_HOUR = 8; // 8am WAT
const CALLING_WINDOW_END_HOUR = 21; // 9pm WAT
const WAT_OFFSET_MS = 1 * 60 * 60 * 1000; // UTC+1

function toWATHour(date: Date): number {
  const watMs = date.getTime() + WAT_OFFSET_MS;
  return new Date(watMs).getUTCHours();
}

function nextCallingWindowStart(from: Date): Date {
  // Find the next 8am WAT from the given time
  const watMs = from.getTime() + WAT_OFFSET_MS;
  const watDate = new Date(watMs);
  const next = new Date(watDate);
  next.setUTCHours(CALLING_WINDOW_START_HOUR, 0, 0, 0);
  // If 8am today has already passed, push to tomorrow
  if (next.getTime() <= watDate.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  // Convert back to UTC
  return new Date(next.getTime() - WAT_OFFSET_MS);
}

export function shouldRespectCallingWindow(cycleNumber: number): boolean {
  return cycleNumber > 1;
}

export function isWithinCallingWindow(date: Date): boolean {
  const hour = toWATHour(date);
  return hour >= CALLING_WINDOW_START_HOUR && hour < CALLING_WINDOW_END_HOUR;
}

/**
 * Adjusts a proposed call time to respect the calling window if required.
 * Cycle 1 = any time. Cycle 2+ = must be within 8am–9pm WAT.
 */
export function adjustForCallingWindow(
  proposedTime: Date,
  cycleNumber: number,
): Date {
  if (!shouldRespectCallingWindow(cycleNumber)) return proposedTime;
  if (isWithinCallingWindow(proposedTime)) return proposedTime;
  return nextCallingWindowStart(proposedTime);
}

// ---------------------------------------------------------------------------
// Call scheduling — when to fire each attempt
// ---------------------------------------------------------------------------

/**
 * Returns the DateTime for the next call attempt.
 *
 * Attempt 1: immediately (now)
 * Attempt 2: 30 minutes after attempt 1
 * Attempt 3: 2 hours after attempt 2
 * Attempt 4: next day at 10am WAT
 * Attempt 5: same day as attempt 4 at 5pm WAT
 * Cycle 2+ attempt 1: 14 days after cycle start, adjusted to calling window
 */
export function getNextCallTime(
  attemptNumber: number,
  cycleNumber: number,
  now: Date = new Date(),
  cycleStartAt?: Date,
): Date {
  let proposedTime: Date;

  if (cycleNumber > 1 && attemptNumber === 1) {
    // Start of a new cycle — 14 days after this cycle began
    const base = cycleStartAt ?? now;
    proposedTime = new Date(base.getTime() + 14 * 24 * 60 * 60 * 1000);
    return adjustForCallingWindow(proposedTime, cycleNumber);
  }

  switch (attemptNumber) {
    case 1:
      proposedTime = now;
      break;
    case 2:
      proposedTime = new Date(now.getTime() + 30 * 60 * 1000); // +30 min
      break;
    case 3:
      proposedTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hrs
      break;
    case 4: {
      // Tomorrow 10am WAT
      const watMs = now.getTime() + WAT_OFFSET_MS;
      const tomorrow = new Date(watMs);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(10, 0, 0, 0);
      proposedTime = new Date(tomorrow.getTime() - WAT_OFFSET_MS);
      break;
    }
    case 5: {
      // Tomorrow 5pm WAT (same day as attempt 4)
      const watMs = now.getTime() + WAT_OFFSET_MS;
      const tomorrow = new Date(watMs);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(17, 0, 0, 0);
      proposedTime = new Date(tomorrow.getTime() - WAT_OFFSET_MS);
      break;
    }
    default:
      proposedTime = now;
  }

  return adjustForCallingWindow(proposedTime, cycleNumber);
}

// ---------------------------------------------------------------------------
// Currency formatting
// ---------------------------------------------------------------------------

// Store name constants — used consistently across WhatsApp messages and system prompts.
// Display name is used in text messages. Spoken name includes phonetic guide for TTS.
const STORE_DISPLAY_NAME = "Ofure Quality Store";
const STORE_SPOKEN_NAME = "Ofure (pronounced or-fu-ray) Quality Store";

function formatAmount(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    NGN: "₦",
    GHS: "GH₵",
    USD: "$",
    GBP: "£",
    EUR: "€",
  };
  const symbol = symbols[currency] ?? currency;
  return `${symbol}${amount.toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// WhatsApp message templates
// ---------------------------------------------------------------------------

/**
 * Returns the appropriate WhatsApp message based on call outcome and stage.
 *
 * Stages:
 *  - confirmation: first contact, confirming the order
 *  - dispatch: order is being dispatched
 *  - delivery: order has been delivered
 */
export function getWhatsAppMessage(
  order: OrderContext,
  outcome: CallOutcome,
  stage: CallStage,
  storeName: string = STORE_DISPLAY_NAME,
): string {
  const amount = formatAmount(order.totalAmount, order.currency);
  const greeting = `Hi ${order.customerName}`;

  if (stage === "confirmation") {
    if (outcome === "ANSWERED") {
      // Sent after a successful confirmation call
      return (
        `${greeting}, thank you for confirming your order with ${storeName}! 🎉\n\n` +
        `Here's your order summary:\n` +
        `📦 *Order #${order.orderNumber}*\n` +
        `Product: ${order.productName}\n` +
        `Package: ${order.packageName}\n` +
        `Amount: *${amount}* (Pay on Delivery)\n` +
        `Delivery to: ${order.deliveryAddress}, ${order.city}, ${order.state}\n\n` +
        `We'll notify you once your order is on its way. Thank you for choosing ${storeName}! 🙏`
      );
    } else {
      // Sent after a missed call (NO_ANSWER, BUSY, FAILED, VOICEMAIL)
      return (
        `${greeting}, we just tried to reach you regarding your recent order with ${storeName}.\n\n` +
        `📦 *Order #${order.orderNumber}*\n` +
        `Product: ${order.productName}\n` +
        `Amount: *${amount}* (Pay on Delivery)\n\n` +
        `We'll try calling you again shortly. If you have any questions, please reply to this message. 😊`
      );
    }
  }

  if (stage === "dispatch") {
    return (
      `${greeting}, great news! 🚚\n\n` +
      `Your order *#${order.orderNumber}* from ${storeName} is on its way to you!\n\n` +
      `📍 Delivering to: ${order.deliveryAddress}, ${order.city}, ${order.state}\n` +
      `💰 Amount to pay: *${amount}* (Cash on Delivery)\n\n` +
      `Please ensure you're available to receive your package. We'll call you shortly to confirm. 🙏`
    );
  }

  if (stage === "delivery") {
    return (
      `${greeting}, we hope you've received your order from ${storeName}! 📦✅\n\n` +
      `*Order #${order.orderNumber}* — ${order.productName}\n\n` +
      `We'd love to hear your feedback! How was your experience? Reply to this message anytime. 😊\n\n` +
      `Thank you for shopping with us! 🙏`
    );
  }

  return `${greeting}, thank you for your order #${order.orderNumber} with ${storeName}.`;
}

// ---------------------------------------------------------------------------
// Vapi system prompt generator
// ---------------------------------------------------------------------------

/**
 * Generates the dynamic system prompt injected into the Vapi assistant
 * at call-creation time via assistantOverrides.
 *
 * Placeholders like {{customerName}} are resolved by Vapi using
 * assistantOverrides.variableValues — but we also pre-fill them here
 * so the prompt is readable in logs and the assistant has full context.
 */
export function generateSystemPrompt(
  order: OrderContext,
  stage: CallStage,
  agentName: string = "Amara",
): string {
  const amount = formatAmount(order.totalAmount, order.currency);

  if (stage === "confirmation") {
    return `You are ${agentName}, a friendly and professional sales assistant for ${STORE_SPOKEN_NAME}.

You are making an outbound call to confirm a new customer order. The customer just placed this order on our website.

PRONUNCIATION NOTE: The store name is "Ofure Quality Store" — pronounce "Ofure" as "or-fu-ray". Always say the full name "Ofure Quality Store" when referring to the store.

CUSTOMER DETAILS:
- Name: ${order.customerName}
- Phone: ${order.customerPhone}
- Order #: ${order.orderNumber}
- Product: ${order.productName}
- Package: ${order.packageName}
- Amount: ${amount} (Cash on Delivery)
- Delivery Address: ${order.deliveryAddress}, ${order.city}, ${order.state}

YOUR GOALS ON THIS CALL:
1. Confirm you are speaking with ${order.customerName}
2. Confirm the product and package they ordered
3. Confirm their delivery address is correct — if they say it's wrong, tell them "No problem, I'll send you a WhatsApp message right after this call — just reply with the correct address and we'll update it." Call addNote with "Customer says address is incorrect — WhatsApp sent for correction" and call requestWhatsAppMessage. Do NOT try to take the new address over the phone (Nigerian addresses are hard to capture accurately by voice).
4. Ask what time of day works best for delivery — when they answer (even if vague, like "morning" or "after 3"), accept it as-is, call updateDeliveryDetails with deliveryPreference set to exactly what they said, then call addNote to record it (e.g. "Customer prefers morning delivery")
5. Confirm they understand it is Cash on Delivery for ${amount}
6. Confirm their WhatsApp number for delivery updates
7. Call confirmOrder once everything above is confirmed
8. Call requestWhatsAppMessage to send them a WhatsApp summary after the call

TOOLS AVAILABLE TO YOU:
- confirmOrder: Call this when the customer has confirmed all details
- scheduleFollowUp: Call this when the customer asks to be called back at a specific time — provide the exact date and time they requested and a short reason. This keeps the order active and schedules the next call. Do NOT use this to postpone the order.
- postponeOrder: Call this ONLY if the customer explicitly says they no longer want the order right now and asks for it to be put on hold or postponed to a later date. This changes the order status.
- cancelOrder: Call this if the customer wants to cancel entirely
- updateDeliveryDetails: Call this whenever the customer gives a corrected address OR a delivery time preference
- addNote: Call this to log any important information — delivery preference, customer comments, access instructions, anything relevant
- requestWhatsAppMessage: Call this at the end of every answered call to send the customer a WhatsApp summary
- assignToDeliveryAgent: Call this AFTER confirmOrder to assign a delivery agent. First call with no arguments — it returns the list of available agents with their locations. Then pick the agent whose location best covers the customer's address and call again with agentId set to that agent's ID. Use your knowledge of Nigerian geography (cities, states, LGAs) to match — e.g. Ikoyi is in Lagos, Wuse is in Abuja.

TOOL USAGE RULES:
- If customer gives a delivery time preference → ALWAYS call updateDeliveryDetails first, then addNote
- If customer says "call me back later/tomorrow/at 3pm" → ALWAYS use scheduleFollowUp (NOT postponeOrder)
- If customer confirms everything → call confirmOrder, then assignToDeliveryAgent, then requestWhatsAppMessage
- addNote should be called for ANY piece of information that a human sales rep would want to remember

TONE & STYLE:
- Warm, friendly, and professional
- Nigerian English is perfectly fine — speak naturally
- Be brief and respectful of the customer's time
- Do NOT read out the order details robotically — have a natural conversation

OBJECTION HANDLING:
- "I didn't place this order" → Apologise, verify their name and phone, offer to cancel
- "I changed my mind" → Acknowledge, ask if there's anything that could change their mind, if no then use cancelOrder
- "Call me back later / I'm busy" → Ask for a specific time, then use scheduleFollowUp with that time
- "How much is delivery?" → Delivery is free, it is pay on delivery
- "Is this legit?" → Confirm the store name "Ofure Quality Store", remind them of the Facebook ad they saw for the product, reassure them`;
  }

  if (stage === "dispatch") {
    return `You are ${agentName}, a friendly sales assistant for ${STORE_SPOKEN_NAME}.

PRONUNCIATION NOTE: The store name is "Ofure Quality Store" — pronounce "Ofure" as "or-fu-ray".

You are calling to notify a customer that their order is on its way to them right now.

CUSTOMER DETAILS:
- Name: ${order.customerName}
- Order #: ${order.orderNumber}
- Product: ${order.productName}
- Amount to collect: ${amount} (Cash on Delivery)
- Delivery Address: ${order.deliveryAddress}, ${order.city}, ${order.state}

YOUR GOALS:
1. Inform the customer their order has been dispatched and is on the way
2. Let them know that our delivery agent will call them directly to arrange the handover — so they should stay alert and keep their phone close
3. Remind them of the Cash on Delivery amount: ${amount} — they should have the exact cash ready
4. If they ask to reschedule → call scheduleFollowUp with their preferred time and note "Customer requested delivery reschedule"
5. Call requestWhatsAppMessage at the end to send them a WhatsApp dispatch notification

TOOLS AVAILABLE TO YOU:
- scheduleFollowUp: If customer cannot receive the delivery and wants a specific callback time
- addNote: Log any important details the customer mentions
- requestWhatsAppMessage: Send WhatsApp dispatch notification — call this at the end of every answered call
- updateDeliveryDetails: If the customer gives a corrected delivery address — but prefer telling them you'll send a WhatsApp so they can reply with the correct address (voice capture of Nigerian addresses is unreliable)

TONE: Brief and upbeat. This is good news — their order is coming!`;
  }

  if (stage === "delivery") {
    return `You are ${agentName}, a friendly sales assistant for ${STORE_SPOKEN_NAME}.

PRONUNCIATION NOTE: The store name is "Ofure Quality Store" — pronounce "Ofure" as "or-fu-ray".

You are calling to confirm the customer has received their order and to collect feedback.

CUSTOMER DETAILS:
- Name: ${order.customerName}
- Order #: ${order.orderNumber}
- Product: ${order.productName}

YOUR GOALS:
1. Ask if the customer received their order
2. If YES: Ask if everything was in good condition, thank them, call requestWhatsAppMessage
3. If NO (customer says they did NOT receive the order): This is a serious issue — follow the DISPUTE HANDLING steps below immediately
4. Keep it brief — 1 to 2 minutes maximum

DISPUTE HANDLING — if the customer says they did NOT receive the order:
- Do NOT argue or accuse anyone
- Express sincere apology and concern: "I'm so sorry to hear that, this is unacceptable and we will investigate immediately"
- Ask: "Just to confirm — did anyone call you today saying they wanted to deliver a product to you? Or did someone call but the delivery didn't happen?"
- Call addNote with a detailed note: "DELIVERY DISPUTE: Customer states they did not receive order #${order.orderNumber}. [Include exactly what the customer said]"
- Call reportDeliveryDispute immediately — this alerts the admin team so they can investigate the delivery agent
- Let the customer know: "I have flagged this urgently to our team. Someone will contact you within the hour to resolve this."
- Do NOT promise a replacement — only the admin can authorise that

TOOLS AVAILABLE TO YOU:
- addNote: Log any feedback, complaints, or important details from the call
- reportDeliveryDispute: Call this IMMEDIATELY if the customer says they did not receive the order — provides the orderId and a description of what the customer said. This notifies the admin.
- requestWhatsAppMessage: Send WhatsApp delivery confirmation — call this at the end of every answered call
- scheduleFollowUp: If the customer is unavailable and wants to be called back

TONE: Warm and attentive. If there is a dispute, shift to serious and empathetic — the customer is upset and needs to feel heard.`;
  }

  return "";
}

// ---------------------------------------------------------------------------
// Variable values for Vapi assistantOverrides
// ---------------------------------------------------------------------------

/**
 * Returns the variableValues object to pass to Vapi when creating a call.
 * These populate {{placeholder}} tokens in the Vapi assistant's prompt template.
 */
export function getVapiVariables(order: OrderContext): Record<string, string> {
  return {
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerWhatsapp: order.customerWhatsapp ?? order.customerPhone,
    orderNumber: String(order.orderNumber),
    productName: order.productName,
    packageName: order.packageName,
    totalAmount: formatAmount(order.totalAmount, order.currency),
    deliveryAddress: order.deliveryAddress,
    city: order.city,
    state: order.state,
    storeName: STORE_DISPLAY_NAME,
    storeSpokenName: STORE_SPOKEN_NAME,
  };
}

/**
 * Agent Matcher — provides agent data for AI-driven delivery assignment.
 *
 * Instead of hardcoded location matching, the Vapi AI agent receives the list
 * of available delivery agents with their coverage areas and picks the best
 * match based on the customer's address. This handles edge cases like
 * Nigerian addresses in local languages, multi-state agents, and customers
 * who don't specify their state.
 *
 * Also contains the delivery assignment message builder (same format as
 * the dashboard "Send to Agent" button).
 */

import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentOption {
  id: string;
  name: string;
  phone: string;
  location: string;
  whatsappGroupId: string | null;
}

// ---------------------------------------------------------------------------
// Fetch available agents for AI selection
// ---------------------------------------------------------------------------

/**
 * Returns all active delivery agents so the AI can pick the best one
 * for a given customer address.
 */
export async function getAvailableAgents(): Promise<AgentOption[]> {
  const agents = await db.agent.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      phone: true,
      location: true,
      whatsappGroupId: true,
    },
    orderBy: { name: "asc" },
  });

  return agents;
}

// ---------------------------------------------------------------------------
// Delivery assignment message builder
// ---------------------------------------------------------------------------

/**
 * Builds the delivery assignment message (same format as the dashboard
 * "Send to Agent" button).
 */
export function buildDeliveryAssignmentMessage(order: {
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  customerWhatsapp: string | null;
  deliveryAddress: string;
  city: string;
  state: string;
  currency: string;
  totalAmount: number;
  items: { quantity: number; productName: string }[];
}): string {
  const symbols: Record<string, string> = {
    NGN: "₦",
    GHS: "GH₵",
    USD: "$",
    GBP: "£",
    EUR: "€",
  };
  const symbol = symbols[order.currency] ?? order.currency;

  // Strip country code prefix and add leading 0
  function normalizePhone(phone: string): string {
    const stripped = phone.replace(/^\+\d{1,3}/, "").trim();
    return stripped.startsWith("0") ? stripped : `0${stripped}`;
  }

  const barePhone = normalizePhone(order.customerPhone);
  const bareWhatsapp = normalizePhone(
    order.customerWhatsapp ?? order.customerPhone,
  );

  const itemsList = order.items
    .map((item) => `${item.quantity}x ${item.productName}`)
    .join(", ");

  return `🚚 *DELIVERY ASSIGNMENT*

*Order:* ${order.orderNumber}

*Full Name:* ${order.customerName}
*Phone:* ${barePhone}
*Whatsapp Number:* ${bareWhatsapp}

*Address:* ${order.deliveryAddress}, ${order.city}, ${order.state}

*Items:* ${itemsList}

*Total:* ${symbol}${order.totalAmount.toLocaleString()}

Please proceed with delivery. Thank you!`;
}

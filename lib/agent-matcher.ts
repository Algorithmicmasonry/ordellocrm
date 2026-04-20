/**
 * Agent Matcher — provides agent data for AI-driven delivery assignment.
 *
 * Instead of hardcoded location matching, the Vapi AI agent receives the list
 * of available delivery agents with their coverage areas and picks the best
 * match based on the customer's address.
 */

import { db } from "@/lib/db";

export interface AgentOption {
  id: string;
  name: string;
  phone: string;
  location: string;
  whatsappGroupId: string | null;
}

/**
 * Returns active delivery agents for an org so the AI can pick the best one.
 * organizationId is required — returns only that org's agents.
 */
export async function getAvailableAgents(organizationId: string): Promise<AgentOption[]> {
  const agents = await db.agent.findMany({
    where: {
      organizationId,
      isActive: true,
    },
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
    NGN: "₦", GHS: "GH₵", USD: "$", GBP: "£", EUR: "€",
  };
  const symbol = symbols[order.currency] ?? order.currency;

  function normalizePhone(phone: string): string {
    const stripped = phone.replace(/^\+\d{1,3}/, "").trim();
    return stripped.startsWith("0") ? stripped : `0${stripped}`;
  }

  const barePhone = normalizePhone(order.customerPhone);
  const bareWhatsapp = normalizePhone(order.customerWhatsapp ?? order.customerPhone);
  const itemsList = order.items.map((item) => `${item.quantity}x ${item.productName}`).join(", ");

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

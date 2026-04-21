import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";
import { RoundRobinClient } from "./_components";
import { getCurrentRoundRobinIndex } from "@/lib/round-robin";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Round-Robin Management | Ordo CRM",
  description: "Configure the lead distribution sequence for your sales team",
};

async function getRoundRobinData(organizationId: string) {
  const currentIndex = await getCurrentRoundRobinIndex(organizationId);

  const members = await db.organizationMember.findMany({
    where: { organizationId, role: "SALES_REP", isAiAgent: false },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  const repIds = members.map((m) => m.userId);
  const orders = await db.order.findMany({
    where: { organizationId, assignedToId: { in: repIds } },
    select: { assignedToId: true, status: true },
  });

  const ordersByRep = new Map<string, { assignedToId: string | null; status: string }[]>();
  for (const m of members) ordersByRep.set(m.userId, []);
  for (const o of orders) {
    if (o.assignedToId) ordersByRep.get(o.assignedToId)?.push(o);
  }

  const salesReps = members.map((m) => {
    const repOrders = ordersByRep.get(m.userId) ?? [];
    return {
      id: m.userId,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      isActive: m.isActive,
      totalOrders: repOrders.length,
      deliveredOrders: repOrders.filter((o) => o.status === "DELIVERED").length,
      isOnline: m.isActive,
    };
  });

  const activeSalesReps = salesReps.filter((r) => r.isActive);
  const nextRepIndex = activeSalesReps.length > 0 ? (currentIndex + 1) % activeSalesReps.length : 0;
  const nextRep = activeSalesReps[nextRepIndex] || null;

  return {
    salesReps,
    activeSalesReps,
    excludedSalesReps: salesReps.filter((r) => !r.isActive),
    currentIndex,
    nextRep,
    totalActive: activeSalesReps.length,
    totalExcluded: salesReps.filter((r) => !r.isActive).length,
  };
}

export default async function RoundRobinPage() {
  const ctx = await requireOrgContext();
  const data = await getRoundRobinData(ctx.organizationId);

  return <RoundRobinClient {...data} />;
}

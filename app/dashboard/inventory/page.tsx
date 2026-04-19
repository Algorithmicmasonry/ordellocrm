import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OrderStatus } from "@prisma/client";
import {
  AdminInventoryClient,
  AgentInventoryBreakdown,
} from "@/app/dashboard/admin/inventory/_components";
import { PushNotificationManager } from "@/app/_components/push-notification-manager";
import { InstallPrompt } from "@/app/_components/install-prompt";

async function getInventoryData() {
  // Fetch products with agent stock
  const products = await db.product.findMany({
    where: {
      isDeleted: false,
      isActive: true,
    },
    include: {
      agentStock: {
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
        },
      },
      productPrices: true, // Include pricing from ProductPrice table
      _count: {
        select: {
          orders: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Fetch agents with their stock
  const agents = await db.agent.findMany({
    where: {
      isActive: true,
    },
    include: {
      stock: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              currency: true,
              productPrices: true, // Include pricing from ProductPrice table
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Calculate stats using ProductPrice table
  const warehouseValue = products.reduce((sum, product) => {
    const productPrice = product.productPrices.find(
      (p) => p.currency === product.currency,
    );
    const price = productPrice?.price || 0;
    return sum + product.currentStock * price;
  }, 0);
  const agentValue = agents.reduce(
    (sum, agent) =>
      sum +
      agent.stock.reduce((stockSum, item) => {
        const productPrice = item.product.productPrices.find(
          (p) => p.currency === item.product.currency,
        );
        const price = productPrice?.price || 0;
        return stockSum + item.quantity * price;
      }, 0),
    0,
  );
  const totalValue = warehouseValue + agentValue;

  const activeAgents = agents.length;

  const warehouseStock = products.reduce(
    (sum, product) => sum + product.currentStock,
    0,
  );

  const totalAgentStock = agents.reduce(
    (sum, agent) =>
      sum + agent.stock.reduce((stockSum, item) => stockSum + item.quantity, 0),
    0,
  );

  const totalUnits = warehouseStock + totalAgentStock;

  const distributionRate =
    totalUnits > 0 ? Math.round((totalAgentStock / totalUnits) * 100) : 0;

  const lowStockProducts = products.filter(
    (product) => product.currentStock <= product.reorderPoint,
  );

  const soldRows = await db.orderItem.groupBy({
    by: ["productId"],
    where: {
      order: { status: OrderStatus.DELIVERED },
    },
    _sum: { quantity: true },
  });

  const unitsSold: Record<string, number> = {};
  for (const row of soldRows) {
    unitsSold[row.productId] = row._sum.quantity ?? 0;
  }

  return {
    products,
    agents,
    stats: {
      totalValue,
      totalUnits,
      activeAgents,
      distributionRate,
    },
    lowStockProducts,
    unitsSold,
  };
}

export default async function InventoryManagerPage() {
  // Authorization check
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  // Check if user is INVENTORY_MANAGER
  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (user?.role !== "INVENTORY_MANAGER") {
    redirect("/dashboard");
  }
  const role = user.role;
  const data = await getInventoryData();

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* PWA Components */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
        <InstallPrompt />
        <PushNotificationManager />
      </div>

      <Suspense fallback={<InventoryPageSkeleton />}>
        <AdminInventoryClient
          role={role}
          products={data.products}
          stats={data.stats}
          lowStockProducts={data.lowStockProducts}
          unitsSold={data.unitsSold}
        />
      </Suspense>

      <Suspense fallback={<AgentBreakdownSkeleton />}>
        <AgentInventoryBreakdown agents={data.agents} />
      </Suspense>
    </div>
  );
}

function InventoryPageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

function AgentBreakdownSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    </div>
  );
}

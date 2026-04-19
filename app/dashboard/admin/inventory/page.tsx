import { Suspense } from "react";
import { AdminInventoryClient, AgentInventoryBreakdown } from "./_components";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import type { Currency } from "@prisma/client";
import { OrderStatus } from "@prisma/client";

async function getInventoryData(currency?: Currency) {
  // Fetch products with agent stock
  // When using `include`, Prisma automatically includes all base model fields
  // So reorderPoint, currentStock, and all other Product fields will be available
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
  // Total value includes both warehouse and agent stock
  const warehouseValue = products.reduce((sum, product) => {
    // Filter by currency if provided
    if (currency && product.currency !== currency) return sum;

    const productPrice = product.productPrices.find(
      (p) => p.currency === (currency || product.currency)
    );
    const price = productPrice?.price || 0;
    return sum + product.currentStock * price;
  }, 0);

  const agentValue = agents.reduce(
    (sum, agent) =>
      sum +
      agent.stock.reduce((stockSum, item) => {
        // Filter by currency if provided
        if (currency && item.product.currency !== currency) return stockSum;

        const productPrice = item.product.productPrices.find(
          (p) => p.currency === (currency || item.product.currency)
        );
        const price = productPrice?.price || 0;
        return stockSum + item.quantity * price;
      }, 0),
    0,
  );
  const totalValue = warehouseValue + agentValue;

  const activeAgents = agents.length;

  // Calculate stock distribution
  // Warehouse stock (not with agents)
  const warehouseStock = products.reduce(
    (sum, product) => sum + product.currentStock,
    0,
  );

  // Total agent stock across all agents
  const totalAgentStock = agents.reduce(
    (sum, agent) =>
      sum + agent.stock.reduce((stockSum, item) => stockSum + item.quantity, 0),
    0,
  );

  // Total units includes both warehouse and agent stock
  const totalUnits = warehouseStock + totalAgentStock;

  // Calculate distribution rate (percentage of total inventory with agents)
  const distributionRate =
    totalUnits > 0 ? Math.round((totalAgentStock / totalUnits) * 100) : 0;

  // Get low stock products (at or below reorder point)
  // Includes both warehouse stock and agent stock
  const lowStockProducts = products.filter((product) => {
    const agentStockTotal = product.agentStock.reduce(
      (sum, s) => sum + s.quantity,
      0,
    );
    return (product.currentStock + agentStockTotal) <= product.reorderPoint;
  });

  // Units sold per product: sum quantity from delivered order items
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

interface InventoryPageProps {
  searchParams: Promise<{ currency?: Currency }>;
}

export default async function InventoryManagementPage({
  searchParams,
}: InventoryPageProps) {
  const params = await searchParams;
  const currency = params?.currency;
  const data = await getInventoryData(currency);

  return (
    <div className="space-y-4 sm:space-y-8">
      <Suspense fallback={<InventoryPageSkeleton />}>
        <AdminInventoryClient
          products={data.products}
          stats={data.stats}
          lowStockProducts={data.lowStockProducts}
          currency={currency}
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

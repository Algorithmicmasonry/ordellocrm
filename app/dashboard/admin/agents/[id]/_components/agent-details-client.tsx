"use client";

import { useState } from "react";
import { Agent, AgentStock, Product, ProductPrice, Currency } from "@prisma/client";
import { AgentProfileHeader } from "./agent-profile-header";
import { AgentStatsCards } from "./agent-stats-cards";
import { AgentPerformanceChart } from "./agent-performance-chart";
import { AgentStockTable } from "./agent-stock-table";
import { AgentOrdersTable } from "./agent-orders-table";
import { ReconcileStockModal } from "../../_components/reconcile-stock-modal";
import { AssignStockModal } from "../../_components/assign-stock-modal";
import { EditAgentModal } from "../../_components/edit-agent-modal";
import { reconcileAgentStock } from "@/app/actions/agents";

type TimePeriod = "week" | "month" | "year";

interface OrderStats {
  total: number;
  delivered: number;
  cancelled: number;
  inTransit: number;
  successRate: number;
  revenue: number;
}

interface ChartDataPoint {
  date: string;
  delivered: number;
  failed: number;
}

interface AgentWithRelations extends Agent {
  stock: (AgentStock & { product: Product & { productPrices: ProductPrice[] } })[];
  orders: any[];
}

interface AgentDetailsClientProps {
  agent: AgentWithRelations;
  currentStats: OrderStats;
  previousStats: OrderStats;
  stockValue: number;
  chartData: ChartDataPoint[];
  recentOrders: any[];
  totalOrders: number;
  period: TimePeriod;
  currency?: Currency;
}

export function AgentDetailsClient({
  agent,
  currentStats,
  previousStats,
  stockValue,
  chartData,
  recentOrders,
  totalOrders,
  period,
  currency,
}: AgentDetailsClientProps) {
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [showAssignStockModal, setShowAssignStockModal] = useState(false);
  const [showEditAgentModal, setShowEditAgentModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<
    (AgentStock & { product: Product; agent: { name: string } }) | null
  >(null);

  const handleReconcileClick = (stock: AgentStock & { product: Product }) => {
    setSelectedStock({
      ...stock,
      agent: { name: agent.name },
    });
    setShowReconcileModal(true);
  };

  return (
    <div className="space-y-6">
      <AgentProfileHeader
        agent={agent}
        period={period}
        onAssignStock={() => setShowAssignStockModal(true)}
        onEdit={() => setShowEditAgentModal(true)}
      />

      <AgentStatsCards
        currentStats={currentStats}
        previousStats={previousStats}
        stockValue={stockValue}
        currency={currency}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <AgentPerformanceChart data={chartData} period={period} />
        <div className="lg:col-span-2">
          <AgentStockTable
            stock={agent.stock}
            onReconcile={handleReconcileClick}
          />
        </div>
      </div>

      <AgentOrdersTable orders={recentOrders} totalOrders={totalOrders} />

      {/* Reconcile Stock Modal */}
      <ReconcileStockModal
        open={showReconcileModal}
        onOpenChange={setShowReconcileModal}
        agentStock={selectedStock}
        onReconcile={reconcileAgentStock}
      />

      {/* Assign Stock Modal */}
      <AssignStockModal
        open={showAssignStockModal}
        onOpenChange={setShowAssignStockModal}
        agent={agent}
      />

      {/* Edit Agent Modal */}
      <EditAgentModal
        open={showEditAgentModal}
        onOpenChange={setShowEditAgentModal}
        agent={agent}
      />
    </div>
  );
}

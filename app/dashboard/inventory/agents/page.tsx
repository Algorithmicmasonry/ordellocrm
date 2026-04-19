import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  AgentsStats,
  AgentsTable,
} from "@/app/dashboard/admin/agents/_components";
import {
  getAgentStats,
  getAgentsWithMetrics,
  getUniqueZones,
} from "@/app/dashboard/admin/agents/actions";

export default async function InventoryAgentsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    redirect("/login");
  }

  // Check if user is INVENTORY_MANAGER
  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (user?.role !== "INVENTORY_MANAGER") {
    redirect("/dashboard");
  }

  // Fetch data in parallel
  const [statsResponse, agentsResponse, zonesResponse] = await Promise.all([
    getAgentStats(),
    getAgentsWithMetrics(),
    getUniqueZones(),
  ]);

  // Handle errors
  if (!statsResponse.success || !agentsResponse.success) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Agent Stock Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage inventory distributed to delivery agents
          </p>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {statsResponse.error ||
              agentsResponse.error ||
              "Failed to load agent data"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold">Agent Stock Management</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Monitor and manage inventory distributed to delivery agents
        </p>
      </div>

      {/* KPI Cards */}
      {statsResponse.data && (
        <AgentsStats
          totalAgents={statsResponse.data.totalAgents}
          activeAgents={statsResponse.data.activeAgents}
          totalStockValue={statsResponse.data.totalStockValue}
          totalDefectiveValue={statsResponse.data.totalDefectiveValue}
          totalMissingValue={statsResponse.data.totalMissingValue}
          pendingDeliveries={statsResponse.data.pendingDeliveries}
        />
      )}

      {/* Agents Table */}
      {agentsResponse.data && (
        <AgentsTable
          agents={agentsResponse.data}
          zones={zonesResponse.data || []}
          basePath="/dashboard/inventory"
        />
      )}
    </div>
  );
}

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardHeader, CurrencyFilter } from "../_components";
import { AgentsStats, AgentsTable, ExportAgentsButton } from "./_components";
import { getAgentStats, getAgentsWithMetrics, getUniqueZones } from "./actions";
import type { Currency } from "@prisma/client";

type SearchParams = {
  currency?: Currency;
};

export default async function AdminAgentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const searchParameter = await searchParams;
  const currency = searchParameter.currency;

  // Fetch data in parallel
  const [statsResponse, agentsResponse, zonesResponse] = await Promise.all([
    getAgentStats(currency),
    getAgentsWithMetrics(),
    getUniqueZones(),
  ]);

  // TODO: Rewrite reconciliation logic to handle numbers as numbers instead of strings
  // Handle errors
  if (!statsResponse.success || !agentsResponse.success) {
    return (
      <div className="space-y-6">
        <DashboardHeader
          heading="Agent Logistics & Performance Directory"
          text="Manage and monitor external delivery agents and their performance metrics across regions"
        />
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
    <div className="space-y-4 sm:space-y-6">
      <DashboardHeader
        heading="Agent Logistics & Performance Directory"
        text="Manage and monitor external delivery agents and their performance metrics across regions"
      />

      {/* Currency Filter and Export Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CurrencyFilter />
        {agentsResponse.data && (
          <div className="w-full sm:w-auto">
            <ExportAgentsButton agents={agentsResponse.data} />
          </div>
        )}
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
          currency={currency}
        />
      )}

      {/* Agents Table */}
      {agentsResponse.data && (
        <AgentsTable
          agents={agentsResponse.data}
          zones={zonesResponse.data || []}
        />
      )}
    </div>
  );
}

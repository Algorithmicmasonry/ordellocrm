import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getLowStockReport,
  getAgentDistributionStats,
  getStockMovementHistory,
  getReorderRecommendations,
} from "./actions";
import {
  LowStockReport,
  AgentDistributionOverview,
  StockMovementChart,
  ReorderRecommendations,
} from "./_components";

export default async function InventoryReportsPage() {
  // Authentication check
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

  // Fetch all reports data in parallel
  const [lowStockData, distributionData, movementData, reorderData] =
    await Promise.all([
      getLowStockReport(),
      getAgentDistributionStats(),
      getStockMovementHistory(30),
      getReorderRecommendations(),
    ]);

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold">Inventory Reports</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Comprehensive inventory analytics and actionable insights
        </p>
      </div>

      <Tabs defaultValue="low-stock" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="low-stock" className="text-xs sm:text-sm">Low Stock</TabsTrigger>
          <TabsTrigger value="distribution" className="text-xs sm:text-sm">Distribution</TabsTrigger>
          <TabsTrigger value="movement" className="text-xs sm:text-sm">Movement</TabsTrigger>
          <TabsTrigger value="reorder" className="text-xs sm:text-sm">Reorder</TabsTrigger>
        </TabsList>

        <TabsContent value="low-stock" className="space-y-4">
          {lowStockData.success && lowStockData.data ? (
            <LowStockReport products={lowStockData.data} />
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {lowStockData.error || "Failed to load low stock report"}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          {distributionData.success && distributionData.data ? (
            <AgentDistributionOverview data={distributionData.data} />
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {distributionData.error ||
                  "Failed to load distribution overview"}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="movement" className="space-y-4">
          {movementData.success && movementData.data ? (
            <StockMovementChart products={movementData.data} />
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {movementData.error || "Failed to load stock movement history"}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reorder" className="space-y-4">
          {reorderData.success && reorderData.data ? (
            <ReorderRecommendations recommendations={reorderData.data} />
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {reorderData.error ||
                  "Failed to load reorder recommendations"}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

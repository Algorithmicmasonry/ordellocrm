import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAgentDetails } from "@/app/dashboard/admin/agents/[id]/actions";
import { AgentDetailsClient } from "@/app/dashboard/admin/agents/[id]/_components";

type TimePeriod = "week" | "month" | "year";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}

export default async function InventoryAgentDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const period = (query.period || "month") as TimePeriod;

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

  // Fetch agent data with metrics
  const agentData = await getAgentDetails(id, period);

  if (!agentData.success || !agentData.data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground">
            Agent Not Found
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {agentData.error || "The requested agent could not be found."}
          </p>
        </div>
      </div>
    );
  }

  return <AgentDetailsClient {...agentData.data} period={period} />;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const agentData = await getAgentDetails(id, "month");

    if (agentData.success && agentData.data?.agent) {
      return {
        title: `${agentData.data.agent.name} - Agent Stock Details`,
        description: `Stock inventory and details for ${agentData.data.agent.name}`,
      };
    }
  } catch (error) {
    console.error("Error generating metadata:", error);
  }

  return {
    title: "Agent Stock Details",
    description: "View agent stock inventory and details",
  };
}

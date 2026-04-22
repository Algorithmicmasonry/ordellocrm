import { redirect } from "next/navigation";
import { requireOrgContext } from "@/lib/org-context";
import { getAgentDetails } from "./actions";
import { AgentDetailsClient } from "./_components";
import type { Currency } from "@prisma/client";

type TimePeriod = "week" | "month" | "year";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; currency?: Currency; tz?: string }>;
}

export default async function AgentDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const period = (query.period || "month") as TimePeriod;
  const currency = query.currency;
  const timezone = query.tz;

  const ctx = await requireOrgContext();
  if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
    redirect("/dashboard");
  }

  // Fetch agent data with metrics
  const agentData = await getAgentDetails(id, period, currency, timezone);

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

  return <AgentDetailsClient {...agentData.data} period={period} currency={currency} />;
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
        title: `${agentData.data.agent.name} - Agent Details`,
        description: `Performance metrics and inventory details for ${agentData.data.agent.name}`,
      };
    }
  } catch (error) {
    console.error("Error generating metadata:", error);
  }

  return {
    title: "Agent Details",
    description: "View agent performance and inventory",
  };
}

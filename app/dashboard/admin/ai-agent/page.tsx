import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getAiDashboardData, getHumanSalesReps } from "./actions";
import { AiDashboardClient } from "./_components";

export const metadata = {
  title: "AI Agent Dashboard - Ordo CRM",
  description: "Monitor AI agent call activity, transcripts, and pipeline",
};

export default async function AiAgentDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [result, salesReps] = await Promise.all([
    getAiDashboardData(),
    getHumanSalesReps(),
  ]);

  if (!result.success) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-4xl font-black leading-tight tracking-tight">
            AI Agent Dashboard
          </h1>
        </div>
        <div className="p-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          Failed to load dashboard data: {result.error}
        </div>
      </div>
    );
  }

  const vapiEnabled = process.env.VAPI_ENABLED === "true";

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/admin"
          className="text-muted-foreground hover:text-primary font-medium"
        >
          Dashboard
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" />
        <span className="font-medium">AI Agent</span>
      </div>

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black leading-tight tracking-tight">
            AI Agent Dashboard
          </h1>
          <p className="text-muted-foreground text-lg mt-1">
            Monitor AI call activity, outcomes, and the order pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              vapiEnabled
                ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200"
                : "bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200"
            }`}
          >
            <div
              className={`size-2 rounded-full ${
                vapiEnabled ? "bg-green-500" : "bg-yellow-500"
              }`}
            />
            {vapiEnabled ? "AI Active" : "AI Disabled"}
          </div>

          <Link
            href="/dashboard/admin/ai-sandbox"
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted/50 transition-colors"
          >
            Sandbox
          </Link>
        </div>
      </div>

      {/* Vapi disabled warning */}
      {!vapiEnabled && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4 space-y-1">
          <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
            AI Agent is disabled
          </p>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Set <code className="font-mono bg-yellow-100 dark:bg-yellow-900 px-1 rounded">VAPI_ENABLED=true</code> in
            your environment variables to enable outbound AI calls. Orders will still be assigned to the AI user but no
            calls will be placed.
          </p>
        </div>
      )}

      {/* Dashboard content */}
      <AiDashboardClient
        stats={result.stats}
        recentCalls={result.recentCalls}
        pipelineOrders={result.pipelineOrders}
        salesReps={salesReps}
      />
    </div>
  );
}

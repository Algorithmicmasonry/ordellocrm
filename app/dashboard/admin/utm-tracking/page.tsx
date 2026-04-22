import { redirect } from "next/navigation";
import { requireOrgContext } from "@/lib/org-context";
import { DashboardHeader } from "../_components";
import { getUTMPageData } from "./actions";
import { UTMDashboardClient } from "./_components/utm-dashboard-client";

export default async function UTMTrackingPage() {
  const ctx = await requireOrgContext();
  if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
    redirect("/dashboard");
  }

  const result = await getUTMPageData();

  return (
    <div className="space-y-6 w-full min-w-0">
      <DashboardHeader
        heading="Ad Tracking"
        text="Orders placed via tracked links — grouped by campaign and creative"
      />

      {result.success && result.data ? (
        <UTMDashboardClient data={result.data} />
      ) : (
        <div className="flex items-center justify-center min-h-[300px]">
          <p className="text-muted-foreground">{result.error ?? "Failed to load data"}</p>
        </div>
      )}
    </div>
  );
}

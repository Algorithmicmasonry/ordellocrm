import { redirect } from "next/navigation";
import { requireOrgContext } from "@/lib/org-context";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { previewStockCorrections } from "@/app/actions/stock-correction";
import { StockCorrectionClient } from "./_components/stock-correction-client";

export const metadata = {
  title: "Stock Correction - Ordo CRM",
  description: "Fix inventory discrepancies caused by the double-deduction bug",
};

export default async function StockCorrectionPage() {
  const ctx = await requireOrgContext();
  if (ctx.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const preview = await previewStockCorrections();

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/admin"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Dashboard
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" />
        <Link
          href="/dashboard/admin/settings"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Settings
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" />
        <span className="font-medium">Stock Correction</span>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Stock Correction Tool
        </h1>
        <p className="text-muted-foreground mt-1">
          Fix warehouse inventory levels affected by the double-deduction bug.
          When agent-fulfilled orders were delivered, stock was incorrectly
          deducted from the warehouse balance (even though it was already
          deducted when distributed to the agent).
        </p>
      </div>

      <StockCorrectionClient preview={preview} />
    </div>
  );
}

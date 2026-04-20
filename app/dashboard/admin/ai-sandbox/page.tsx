import { redirect } from "next/navigation";
import { requireOrgContext } from "@/lib/org-context";
import { db } from "@/lib/db";
import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";
import { SandboxOrdersTable } from "./_components/sandbox-orders-table";
import { getSandboxOrders } from "./actions";

export const metadata = {
  title: "AI Sandbox - Ordo CRM",
  description: "Test the AI agent with sandbox orders",
};

export default async function AiSandboxPage() {
  const ctx = await requireOrgContext();
  if (ctx.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch active products with packages for the product selector
  const products = await db.product.findMany({
    where: { organizationId: ctx.organizationId, isActive: true, isDeleted: false },
    include: {
      packages: { where: { isActive: true }, select: { id: true } },
    },
    orderBy: { name: "asc" },
  });

  const productsWithPackages = products.filter((p) => p.packages.length > 0);

  const ordersResult = await getSandboxOrders();
  const sandboxOrders = ordersResult.success ? ordersResult.data : [];

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
        <span className="font-medium">AI Sandbox</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-black leading-tight tracking-tight">
          AI Agent Sandbox
        </h1>
        <p className="text-muted-foreground text-lg mt-1">
          Test the AI agent with sandbox orders that don&apos;t affect real inventory or revenue.
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4 space-y-1">
        <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
          ⚠ Sandbox Mode
        </p>
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          Orders submitted via the sandbox form are assigned directly to the AI agent and will trigger a real Vapi call (if <code className="font-mono bg-yellow-100 dark:bg-yellow-900 px-1 rounded">VAPI_ENABLED=true</code>). No stock is deducted and sandbox orders are hidden from all dashboards and reports.
        </p>
      </div>

      {/* Product Selector + Open Form */}
      <div className="rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Open Test Form</h2>
        <p className="text-sm text-muted-foreground">
          Select a product below and open its sandbox order form in a new tab. The form behaves exactly like the live customer form but marks the order as a sandbox test.
        </p>

        {productsWithPackages.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No active products with packages found. Add packages in{" "}
            <Link href="/dashboard/admin/inventory" className="underline text-primary">
              Inventory
            </Link>{" "}
            first.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            {productsWithPackages.map((product) => (
              <Link
                key={product.id}
                href={`/order-form/sandbox?product=${product.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm font-medium"
              >
                <ExternalLink className="size-4 text-muted-foreground" />
                {product.name}
                <span className="text-xs text-muted-foreground">
                  ({product.packages.length} pkg{product.packages.length !== 1 ? "s" : ""})
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Sandbox Orders Table */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Sandbox Orders</h2>
        <SandboxOrdersTable orders={sandboxOrders} />
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { requireOrgContext } from "@/lib/org-context";

export default async function DashboardPage() {
  const ctx = await requireOrgContext();

  if (ctx.role === "OWNER" || ctx.role === "ADMIN") {
    redirect("/dashboard/admin");
  } else if (ctx.role === "SALES_REP") {
    redirect("/dashboard/sales-rep");
  } else if (ctx.role === "INVENTORY_MANAGER") {
    redirect("/dashboard/inventory");
  }

  // Fallback: keep the user in the app even if a new role is added later.
  redirect("/dashboard/admin");
}

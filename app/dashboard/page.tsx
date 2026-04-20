import { redirect } from "next/navigation";
import { requireOrgContext } from "@/lib/org-context";

export default async function DashboardPage() {
  const ctx = await requireOrgContext();

  if (ctx.role === "ADMIN") {
    redirect("/dashboard/admin");
  } else if (ctx.role === "SALES_REP") {
    redirect("/dashboard/sales-rep");
  } else if (ctx.role === "INVENTORY_MANAGER") {
    redirect("/dashboard/inventory");
  }

  redirect("/login");
}
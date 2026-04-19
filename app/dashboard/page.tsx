import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    redirect("/login");
  }

  // Redirect to role-specific dashboard
  if (session.user.role === "ADMIN") {
    redirect("/dashboard/admin");
  } else if (session.user.role === "SALES_REP") {
    redirect("/dashboard/sales-rep");
  } else if (session.user.role === "INVENTORY_MANAGER") {
    redirect("/dashboard/inventory");
  }

  // Fallback
  redirect("/login");
}
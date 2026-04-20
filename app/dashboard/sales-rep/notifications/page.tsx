import { redirect } from "next/navigation";
import { requireOrgContext } from "@/lib/org-context";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { NotificationsClient } from "@/app/dashboard/notifications/_components";

export default async function SalesRepNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  const ctx = await requireOrgContext();
  if (ctx.role !== "SALES_REP") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const filter = params.filter || "all";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/sales-rep"
          className="text-muted-foreground hover:text-primary font-medium"
        >
          Dashboard
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" />
        <span className="font-medium">Notifications</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Stay updated on your assigned orders and activity updates
        </p>
      </div>

      <NotificationsClient
        initialPage={page}
        initialFilter={filter}
        basePath="/dashboard/sales-rep/notifications"
      />
    </div>
  );
}

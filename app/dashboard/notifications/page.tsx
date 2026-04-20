import { redirect } from "next/navigation";
import { requireOrgContext } from "@/lib/org-context";
import { NotificationsClient } from "./_components/notifications-client";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  await requireOrgContext();

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const filter = params.filter || "all"; // all, unread

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Stay updated on orders, status changes, and important activities
        </p>
      </div>

      <NotificationsClient
        initialPage={page}
        initialFilter={filter}
        basePath="/dashboard/notifications"
      />
    </div>
  );
}

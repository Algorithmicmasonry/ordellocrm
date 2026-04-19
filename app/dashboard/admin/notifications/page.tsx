import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NotificationsClient } from "../../notifications/_components";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  // Authentication check
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || !session.user) {
    redirect("/login");
  }

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
        basePath="/dashboard/admin/notifications"
      />
    </div>
  );
}

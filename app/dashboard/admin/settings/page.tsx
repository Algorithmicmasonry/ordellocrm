import { redirect } from "next/navigation";
import { requireOrgContext } from "@/lib/org-context";
import { db } from "@/lib/db";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PushNotificationManager } from "@/app/_components/push-notification-manager";
import { InstallPrompt } from "@/app/_components/install-prompt";

export const metadata = {
  title: "Settings - Ordello CRM",
  description: "Manage your account settings and preferences",
};

export default async function AdminSettingsPage() {
  const ctx = await requireOrgContext();
  if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
    redirect("/dashboard");
  }

  const user = await db.user.findUnique({
    where: { id: ctx.userId },
    select: { name: true },
  });

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/admin"
          className="text-muted-foreground hover:text-primary font-medium"
        >
          Dashboard
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" />
        <span className="font-medium">Settings</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-black leading-tight tracking-tight">
          Settings
        </h1>
        <p className="text-muted-foreground text-lg mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4 sm:gap-6 max-w-4xl">
        {/* PWA Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Progressive Web App</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Install Ordello as an app and manage notifications
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <InstallPrompt />
            <PushNotificationManager />
          </div>
        </div>

        {/* User Information */}
        <div className="space-y-4 pt-6 border-t">
          <div>
            <h2 className="text-xl font-bold">Account Information</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your account details
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-6 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{user?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{ctx.userEmail}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium capitalize">
                  {ctx.role.toLowerCase().replace("_", " ")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

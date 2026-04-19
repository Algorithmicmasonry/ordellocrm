"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Loader2, Trash2, CheckCheck } from "lucide-react";
import {
  getUserNotifications,
  markAllAsRead,
  deleteAllRead,
} from "@/app/actions/notifications";
import { NotificationItem } from "@/app/_components/notification-item";
import type { Notification } from "@prisma/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import toast from "react-hot-toast";

interface NotificationsClientProps {
  initialPage: number;
  initialFilter: string;
  basePath?: string;
}

export function NotificationsClient({
  initialPage,
  initialFilter,
  basePath = "/dashboard/notifications",
}: NotificationsClientProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialFilter);
  const [page, setPage] = useState(initialPage);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Move fetchNotifications inside useEffect to avoid the warning
  useEffect(() => {
    let isMounted = true;

    async function fetchNotifications() {
      if (!isMounted) return;

      setLoading(true);
      const result = await getUserNotifications({
        page,
        limit: 20,
        unreadOnly: filter === "unread",
      });

      if (!isMounted) return;

      if (result.success && result.data) {
        setNotifications(result.data.notifications);
        setPagination(result.data.pagination);
      }
      setLoading(false);
    }

    fetchNotifications();

    return () => {
      isMounted = false;
    };
  }, [page, filter, refreshTrigger]);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setPage(1);
    router.push(`${basePath}?filter=${newFilter}`);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    router.push(`${basePath}?page=${newPage}&filter=${filter}`);
  };

  const handleMarkAllRead = async () => {
    setActionLoading("mark-all");
    const result = await markAllAsRead();
    if (result.success) {
      toast.success("All notifications marked as read");
      setRefreshTrigger((prev) => prev + 1); // Trigger refresh
    } else {
      toast.error(result.error || "Failed to mark all as read");
    }
    setActionLoading(null);
  };

  const handleDeleteAllRead = async () => {
    setActionLoading("delete-all");
    const result = await deleteAllRead();
    if (result.success) {
      toast.success(`Deleted ${result.count || 0} read notifications`);
      setRefreshTrigger((prev) => prev + 1); // Trigger refresh
    } else {
      toast.error(result.error || "Failed to delete notifications");
    }
    setActionLoading(null);
  };

  const handleNotificationUpdate = () => {
    setRefreshTrigger((prev) => prev + 1); // Trigger refresh
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-4">
      {/* Filter and Actions */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Tabs value={filter} onValueChange={handleFilterChange}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={actionLoading === "mark-all"}
              >
                {actionLoading === "mark-all" ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <CheckCheck className="size-4 mr-2" />
                )}
                Mark all read
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    notifications.filter((n) => n.isRead).length === 0 ||
                    actionLoading === "delete-all"
                  }
                >
                  {actionLoading === "delete-all" ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="size-4 mr-2" />
                  )}
                  Delete read
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete read notifications?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all notifications you&apos;ve
                    already read. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAllRead}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Bell className="size-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {filter === "unread"
                ? "No unread notifications"
                : "No notifications yet"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {filter === "unread"
                ? "You're all caught up! Check back later for new updates."
                : "You'll see updates about orders and activities here."}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onUpdate={handleNotificationUpdate}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} (
            {pagination.total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

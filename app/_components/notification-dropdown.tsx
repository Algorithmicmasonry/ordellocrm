"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import {
  getRecentNotifications,
  markAllAsRead,
} from "@/app/actions/notifications";
import { NotificationItem } from "./notification-item";
import type { Notification } from "@prisma/client";

interface NotificationDropdownProps {
  onViewAll: () => void;
  onUpdate: () => void;
}

export function NotificationDropdown({
  onViewAll,
  onUpdate,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  async function handleMarkAllRead() {
    setMarkingAllRead(true);
    const result = await markAllAsRead();
    if (result.success) {
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true })),
      );
      onUpdate();
    }
    setMarkingAllRead(false);
  }

  // Move fetchNotifications inside useEffect
  useEffect(() => {
    async function fetchNotifications() {
      setLoading(true);
      const result = await getRecentNotifications();
      if (result.success && result.data) {
        setNotifications(result.data);
      }
      setLoading(false);
    }

    fetchNotifications();
  }, []);

  // Create a separate function for manual refresh if needed
  const refreshNotifications = async () => {
    setLoading(true);
    const result = await getRecentNotifications();
    if (result.success && result.data) {
      setNotifications(result.data);
    }
    setLoading(false);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div>
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markingAllRead}
            className="h-7 text-xs"
          >
            {markingAllRead ? (
              <Loader2 className="size-3 mr-1 animate-spin" />
            ) : (
              <CheckCheck className="size-3 mr-1" />
            )}
            Mark all read
          </Button>
        )}
      </div>
      <Separator />

      {/* Notifications List */}
      <ScrollArea className="h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Bell className="size-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No notifications yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You&pos;ll see updates about orders and activities here
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onUpdate={() => {
                  refreshNotifications();
                  onUpdate();
                }}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAll}
              className="w-full text-xs"
            >
              View all notifications
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

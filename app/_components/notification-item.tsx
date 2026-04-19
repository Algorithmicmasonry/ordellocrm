"use client";

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { markAsRead } from "@/app/actions/notifications";
import type { Notification, NotificationType } from "@prisma/client";
import {
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Package,
  Bell,
} from "lucide-react";

interface NotificationItemProps {
  notification: Notification;
  onUpdate: () => void;
}

const iconMap: Record<NotificationType, React.ReactNode> = {
  ORDER_ASSIGNED: <ShoppingBag className="size-4" />,
  ORDER_STATUS_CHANGED: <CheckCircle2 className="size-4" />,
  ORDER_DELIVERED: <Package className="size-4" />,
  ORDER_NOTE_ADDED: <MessageSquare className="size-4" />,
  LOW_STOCK_ALERT: <AlertCircle className="size-4" />,
  NEW_ORDER: <ShoppingBag className="size-4" />,
  GENERAL: <Bell className="size-4" />,
};

const colorMap: Record<NotificationType, string> = {
  ORDER_ASSIGNED: "text-blue-600 bg-blue-100",
  ORDER_STATUS_CHANGED: "text-purple-600 bg-purple-100",
  ORDER_DELIVERED: "text-green-600 bg-green-100",
  ORDER_NOTE_ADDED: "text-orange-600 bg-orange-100",
  LOW_STOCK_ALERT: "text-red-600 bg-red-100",
  NEW_ORDER: "text-blue-600 bg-blue-100",
  GENERAL: "text-gray-600 bg-gray-100",
};

export function NotificationItem({
  notification,
  onUpdate,
}: NotificationItemProps) {
  const router = useRouter();

  const handleClick = async () => {
    // Mark as read if not already read
    if (!notification.isRead) {
      await markAsRead(notification.id);
      onUpdate();
    }

    // Navigate to link if available
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50",
        !notification.isRead && "bg-blue-50/50 dark:bg-blue-950/20",
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center size-9 rounded-full shrink-0",
          colorMap[notification.type],
        )}
      >
        {iconMap[notification.type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium leading-tight",
              !notification.isRead && "font-semibold",
            )}
          >
            {notification.title}
          </p>
          {!notification.isRead && (
            <div className="size-2 rounded-full bg-blue-600 shrink-0 mt-1" />
          )}
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>

        <p className="text-[10px] text-muted-foreground">{timeAgo}</p>
      </div>
    </div>
  );
}

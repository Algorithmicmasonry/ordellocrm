"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * Create a notification for a specific user
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  orderId,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  orderId?: string;
}) {
  try {
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        orderId,
      },
    });

    // Revalidate notification-related paths
    revalidatePath("/dashboard");

    return { success: true, data: notification };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false, error: "Failed to create notification" };
  }
}

/**
 * Create notifications for multiple users at once
 */
export async function createBulkNotifications({
  userIds,
  type,
  title,
  message,
  link,
  orderId,
}: {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  orderId?: string;
}) {
  try {
    const notifications = await db.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title,
        message,
        link,
        orderId,
      })),
    });

    revalidatePath("/dashboard");

    return { success: true, count: notifications.count };
  } catch (error) {
    console.error("Error creating bulk notifications:", error);
    return { success: false, error: "Failed to create notifications" };
  }
}

/**
 * Get notifications for the current user
 */
export async function getUserNotifications({
  page = 1,
  limit = 20,
  unreadOnly = false,
}: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
} = {}) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const skip = (page - 1) * limit;

    const where: any = {
      userId: session.user.id,
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip,
      }),
      db.notification.count({ where }),
    ]);

    return {
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { success: false, error: "Failed to fetch notifications" };
  }
}

/**
 * Get unread notification count for current user
 */
export async function getUnreadCount() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const count = await db.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    });

    return { success: true, count };
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return { success: false, error: "Failed to fetch unread count" };
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify notification belongs to user
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== session.user.id) {
      return { success: false, error: "Notification not found" };
    }

    await db.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: "Failed to mark as read" };
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllAsRead() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    await db.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error marking all as read:", error);
    return { success: false, error: "Failed to mark all as read" };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify notification belongs to user
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== session.user.id) {
      return { success: false, error: "Notification not found" };
    }

    await db.notification.delete({
      where: { id: notificationId },
    });

    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return { success: false, error: "Failed to delete notification" };
  }
}

/**
 * Delete all read notifications for current user
 */
export async function deleteAllRead() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await db.notification.deleteMany({
      where: {
        userId: session.user.id,
        isRead: true,
      },
    });

    revalidatePath("/dashboard");

    return { success: true, count: result.count };
  } catch (error) {
    console.error("Error deleting read notifications:", error);
    return { success: false, error: "Failed to delete notifications" };
  }
}

/**
 * Get recent notifications for dropdown (last 5 unread + 5 recent)
 */
export async function getRecentNotifications() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const [unread, recent] = await Promise.all([
      // Get latest unread notifications
      db.notification.findMany({
        where: {
          userId: session.user.id,
          isRead: false,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),
      // Get latest notifications overall
      db.notification.findMany({
        where: {
          userId: session.user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),
    ]);

    // Combine and deduplicate
    const notificationMap = new Map();
    [...unread, ...recent].forEach((notif) => {
      if (!notificationMap.has(notif.id)) {
        notificationMap.set(notif.id, notif);
      }
    });

    const notifications = Array.from(notificationMap.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    return { success: true, data: notifications };
  } catch (error) {
    console.error("Error fetching recent notifications:", error);
    return { success: false, error: "Failed to fetch recent notifications" };
  }
}

"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/lib/org-context";

/**
 * Create a notification for a specific user within an org
 */
export async function createNotification({
  userId,
  organizationId,
  type,
  title,
  message,
  link,
  orderId,
}: {
  userId: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  orderId?: string;
}) {
  try {
    const notification = await db.notification.create({
      data: { userId, organizationId, type, title, message, link, orderId },
    });

    revalidatePath("/dashboard");
    return { success: true, data: notification };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false, error: "Failed to create notification" };
  }
}

/**
 * Create notifications for multiple users at once within an org
 */
export async function createBulkNotifications({
  userIds,
  organizationId,
  type,
  title,
  message,
  link,
  orderId,
}: {
  userIds: string[];
  organizationId: string;
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
        organizationId,
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
 * Get notifications for the current user scoped to current org
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
    const ctx = await requireOrgContext();
    const skip = (page - 1) * limit;

    const where: any = {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      ...(unreadOnly && { isRead: false }),
    };

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
 * Get unread notification count for current user in current org
 */
export async function getUnreadCount() {
  try {
    const ctx = await requireOrgContext();

    const count = await db.notification.count({
      where: {
        userId: ctx.userId,
        organizationId: ctx.organizationId,
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
 * Mark a notification as read (must belong to current user + org)
 */
export async function markAsRead(notificationId: string) {
  try {
    const ctx = await requireOrgContext();

    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== ctx.userId || notification.organizationId !== ctx.organizationId) {
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
 * Mark all notifications as read for current user in current org
 */
export async function markAllAsRead() {
  try {
    const ctx = await requireOrgContext();

    await db.notification.updateMany({
      where: { userId: ctx.userId, organizationId: ctx.organizationId, isRead: false },
      data: { isRead: true },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error marking all as read:", error);
    return { success: false, error: "Failed to mark all as read" };
  }
}

/**
 * Delete a notification (must belong to current user + org)
 */
export async function deleteNotification(notificationId: string) {
  try {
    const ctx = await requireOrgContext();

    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== ctx.userId || notification.organizationId !== ctx.organizationId) {
      return { success: false, error: "Notification not found" };
    }

    await db.notification.delete({ where: { id: notificationId } });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return { success: false, error: "Failed to delete notification" };
  }
}

/**
 * Delete all read notifications for current user in current org
 */
export async function deleteAllRead() {
  try {
    const ctx = await requireOrgContext();

    const result = await db.notification.deleteMany({
      where: { userId: ctx.userId, organizationId: ctx.organizationId, isRead: true },
    });

    revalidatePath("/dashboard");
    return { success: true, count: result.count };
  } catch (error) {
    console.error("Error deleting read notifications:", error);
    return { success: false, error: "Failed to delete notifications" };
  }
}

/**
 * Get recent notifications for dropdown (scoped to user + org)
 */
export async function getRecentNotifications() {
  try {
    const ctx = await requireOrgContext();

    const [unread, recent] = await Promise.all([
      db.notification.findMany({
        where: { userId: ctx.userId, organizationId: ctx.organizationId, isRead: false },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.notification.findMany({
        where: { userId: ctx.userId, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const notificationMap = new Map();
    [...unread, ...recent].forEach((n) => {
      if (!notificationMap.has(n.id)) notificationMap.set(n.id, n);
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

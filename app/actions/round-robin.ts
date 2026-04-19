"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { resetRoundRobin, getCurrentRoundRobinIndex } from "@/lib/round-robin";
import { revalidatePath } from "next/cache";

/**
 * Skip the current sales rep in the round-robin sequence
 * Only accessible by ADMIN users
 */
export async function skipCurrentRep() {
  try {
    // Check authorization
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return { success: false, error: "Unauthorized - Please log in" };
    }

    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== "ADMIN") {
      return {
        success: false,
        error: "Unauthorized - Admin access required",
      };
    }

    // Get current index
    const currentIndex = await getCurrentRoundRobinIndex();

    // Get all active sales reps
    const salesReps = await db.user.findMany({
      where: {
        role: "SALES_REP",
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (salesReps.length === 0) {
      return { success: false, error: "No active sales reps available" };
    }

    // Calculate next index
    const nextIndex = (currentIndex + 1) % salesReps.length;

    // Update the round-robin index
    await db.systemSetting.upsert({
      where: { key: "last_assigned_sales_rep_index" },
      update: { value: nextIndex.toString() },
      create: {
        key: "last_assigned_sales_rep_index",
        value: nextIndex.toString(),
      },
    });

    revalidatePath("/dashboard/admin/round-robin");

    return {
      success: true,
      nextRep: salesReps[nextIndex],
      message: `Skipped to ${salesReps[nextIndex].name}`,
    };
  } catch (error: any) {
    console.error("Error skipping rep:", error);
    return {
      success: false,
      error: error.message || "Failed to skip rep",
    };
  }
}

/**
 * Reset round-robin sequence to default (alphabetical)
 * Only accessible by ADMIN users
 */
export async function resetRoundRobinSequence() {
  try {
    // Check authorization
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return { success: false, error: "Unauthorized - Please log in" };
    }

    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== "ADMIN") {
      return {
        success: false,
        error: "Unauthorized - Admin access required",
      };
    }

    // Reset the round-robin counter
    await resetRoundRobin();

    revalidatePath("/dashboard/admin/round-robin");
    revalidatePath("/dashboard/admin/sales-reps");

    return {
      success: true,
      message: "Round-robin sequence has been reset",
    };
  } catch (error: any) {
    console.error("Error resetting round-robin:", error);
    return {
      success: false,
      error: error.message || "Failed to reset sequence",
    };
  }
}

/**
 * Toggle sales rep inclusion in round-robin
 * Only accessible by ADMIN users
 */
export async function toggleRepInclusion(userId: string, isActive: boolean) {
  try {
    // Check authorization
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return { success: false, error: "Unauthorized - Please log in" };
    }

    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== "ADMIN") {
      return {
        success: false,
        error: "Unauthorized - Admin access required",
      };
    }

    // Check if user exists and is a sales rep
    const salesRep = await db.user.findUnique({
      where: { id: userId },
    });

    if (!salesRep || salesRep.role !== "SALES_REP") {
      return { success: false, error: "Sales rep not found" };
    }

    // Update the sales rep's active status
    const updatedRep = await db.user.update({
      where: { id: userId },
      data: { isActive },
    });

    revalidatePath("/dashboard/admin/round-robin");
    revalidatePath("/dashboard/admin/sales-reps");

    return {
      success: true,
      user: updatedRep,
      message: `${updatedRep.name} ${isActive ? "included in" : "excluded from"} round-robin`,
    };
  } catch (error: any) {
    console.error("Error toggling rep inclusion:", error);
    return {
      success: false,
      error: error.message || "Failed to toggle inclusion",
    };
  }
}

/**
 * Reorder the round-robin sequence
 * Note: Currently, the sequence is based on alphabetical order
 * This could be expanded to support custom ordering if needed
 */
export async function reorderRoundRobinSequence(repIds: string[]) {
  try {
    // Check authorization
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return { success: false, error: "Unauthorized - Please log in" };
    }

    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== "ADMIN") {
      return {
        success: false,
        error: "Unauthorized - Admin access required",
      };
    }

    // TODO: Implement custom ordering
    // For now, the sequence is based on alphabetical order by name
    // To implement custom ordering, we would need to add a 'sortOrder' field to the User model

    revalidatePath("/dashboard/admin/round-robin");

    return {
      success: true,
      message:
        "Custom ordering is not yet implemented. Sequence is alphabetical by name.",
    };
  } catch (error: any) {
    console.error("Error reordering sequence:", error);
    return {
      success: false,
      error: error.message || "Failed to reorder sequence",
    };
  }
}

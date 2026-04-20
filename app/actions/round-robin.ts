"use server";

import { db } from "@/lib/db";
import { resetRoundRobin, getCurrentRoundRobinIndex } from "@/lib/round-robin";
import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/lib/org-context";

/**
 * Skip the current sales rep in the round-robin sequence (Admin only)
 */
export async function skipCurrentRep() {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Admin access required" };
    }

    const currentIndex = await getCurrentRoundRobinIndex(ctx.organizationId);

    // Get active SALES_REP members of this org
    const members = await db.organizationMember.findMany({
      where: { organizationId: ctx.organizationId, role: "SALES_REP", isActive: true },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    });

    if (members.length === 0) {
      return { success: false, error: "No active sales reps available" };
    }

    const nextIndex = (currentIndex + 1) % members.length;

    await db.systemSetting.upsert({
      where: { organizationId_key: { organizationId: ctx.organizationId, key: "round_robin_index" } },
      update: { value: nextIndex.toString() },
      create: { organizationId: ctx.organizationId, key: "round_robin_index", value: nextIndex.toString() },
    });

    revalidatePath("/dashboard/admin/round-robin");

    return {
      success: true,
      nextRep: members[nextIndex].user,
      message: `Skipped to ${members[nextIndex].user.name}`,
    };
  } catch (error: any) {
    console.error("Error skipping rep:", error);
    return { success: false, error: error.message || "Failed to skip rep" };
  }
}

/**
 * Reset round-robin sequence to start (Admin only)
 */
export async function resetRoundRobinSequence() {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Admin access required" };
    }

    await resetRoundRobin(ctx.organizationId);

    revalidatePath("/dashboard/admin/round-robin");
    revalidatePath("/dashboard/admin/sales-reps");

    return { success: true, message: "Round-robin sequence has been reset" };
  } catch (error: any) {
    console.error("Error resetting round-robin:", error);
    return { success: false, error: error.message || "Failed to reset sequence" };
  }
}

/**
 * Toggle a sales rep's inclusion in round-robin (Admin only)
 * In Ordello this updates OrganizationMember.isActive, not User.isActive
 */
export async function toggleRepInclusion(userId: string, isActive: boolean) {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Admin access required" };
    }

    // Verify this user is a SALES_REP in this org
    const member = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: ctx.organizationId, userId } },
      include: { user: { select: { name: true } } },
    });

    if (!member || member.role !== "SALES_REP") {
      return { success: false, error: "Sales rep not found in this organization" };
    }

    const updatedMember = await db.organizationMember.update({
      where: { organizationId_userId: { organizationId: ctx.organizationId, userId } },
      data: { isActive },
      include: { user: { select: { name: true } } },
    });

    revalidatePath("/dashboard/admin/round-robin");
    revalidatePath("/dashboard/admin/sales-reps");

    return {
      success: true,
      message: `${updatedMember.user.name} ${isActive ? "included in" : "excluded from"} round-robin`,
    };
  } catch (error: any) {
    console.error("Error toggling rep inclusion:", error);
    return { success: false, error: error.message || "Failed to toggle inclusion" };
  }
}

/**
 * Reorder the round-robin sequence (Admin only)
 */
export async function reorderRoundRobinSequence(_repIds: string[]) {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Admin access required" };
    }

    revalidatePath("/dashboard/admin/round-robin");

    return {
      success: true,
      message: "Custom ordering is not yet implemented. Sequence is alphabetical by name.",
    };
  } catch (error: any) {
    console.error("Error reordering sequence:", error);
    return { success: false, error: error.message || "Failed to reorder sequence" };
  }
}

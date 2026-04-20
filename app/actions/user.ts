"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { resetRoundRobin } from "@/lib/round-robin";
import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/lib/org-context";
import type { OrgMemberRole } from "@prisma/client";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// getCurrentUser — returns user + their membership in the current org
// ---------------------------------------------------------------------------
export async function getCurrentUser() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, image: true },
    });

    return user;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// getAllSalesReps — returns SALES_REP members of the current org
// ---------------------------------------------------------------------------
export async function getAllSalesReps() {
  try {
    const ctx = await requireOrgContext();

    const members = await db.organizationMember.findMany({
      where: { organizationId: ctx.organizationId, role: "SALES_REP", isActive: true },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    });

    const salesReps = members.map((m) => ({
      id: m.userId,
      name: m.user.name,
      email: m.user.email,
      isAiAgent: m.isAiAgent,
    }));

    return { success: true, salesReps };
  } catch (error) {
    console.error("Error fetching sales reps:", error);
    return { success: false, error: "Failed to fetch sales reps" };
  }
}

// ---------------------------------------------------------------------------
// getAllMembers — returns all members of the current org (for user management page)
// ---------------------------------------------------------------------------
export async function getAllMembers() {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Admin access required" };
    }

    const members = await db.organizationMember.findMany({
      where: { organizationId: ctx.organizationId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });

    return { success: true, members };
  } catch (error) {
    console.error("Error fetching members:", error);
    return { success: false, error: "Failed to fetch members" };
  }
}

// ---------------------------------------------------------------------------
// createSalesRep — creates a User (if needed) + adds them to this org
// ---------------------------------------------------------------------------
interface CreateSalesRepData {
  name: string;
  email: string;
  password: string;
  role?: OrgMemberRole;
  isActive?: boolean;
}

export async function createSalesRep(data: CreateSalesRepData) {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Admin access required" };
    }

    // Check if this user is already a member of this org
    let user = await db.user.findUnique({ where: { email: data.email } });

    if (user) {
      const existingMember = await db.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: ctx.organizationId, userId: user.id } },
      });
      if (existingMember) {
        return { success: false, error: "This user is already a member of your organization" };
      }
    } else {
      // Create new user via Better Auth
      await auth.api.signUpEmail({
        body: { email: data.email, password: data.password, name: data.name },
      });
      user = await db.user.findUnique({ where: { email: data.email } });
      if (!user) return { success: false, error: "Failed to create user account" };

      // Mark email as verified (admin-created accounts)
      await db.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    }

    const role = data.role || "SALES_REP";

    // Add as org member
    const member = await db.organizationMember.create({
      data: {
        organizationId: ctx.organizationId,
        userId: user.id,
        role,
        isActive: data.isActive !== undefined ? data.isActive : true,
        joinedAt: new Date(),
      },
    });

    // Reset round-robin when adding new sales reps
    if (role === "SALES_REP" && member.isActive) {
      await resetRoundRobin(ctx.organizationId);
    }

    revalidatePath("/dashboard/admin/sales-reps");
    revalidatePath("/dashboard/admin/users");
    return { success: true, user, member };
  } catch (error: any) {
    console.error("Error creating sales rep:", error);
    return { success: false, error: error.message || "Failed to create sales rep" };
  }
}

// ---------------------------------------------------------------------------
// updateSalesRep — updates User fields + OrganizationMember fields
// ---------------------------------------------------------------------------
interface UpdateSalesRepData {
  name?: string;
  email?: string;
  password?: string;
  role?: OrgMemberRole;
  isActive?: boolean;
}

export async function updateSalesRep(userId: string, data: UpdateSalesRepData) {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Admin access required" };
    }

    // Verify this user is a member of this org
    const member = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: ctx.organizationId, userId } },
    });
    if (!member) return { success: false, error: "User not found in this organization" };

    const existingUser = await db.user.findUnique({ where: { id: userId } });
    if (!existingUser) return { success: false, error: "User not found" };

    // Check email uniqueness if changing
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await db.user.findUnique({ where: { email: data.email } });
      if (emailExists) return { success: false, error: "Email already in use" };
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (data.password?.trim()) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    // Update User (global identity fields)
    const [user] = await Promise.all([
      db.user.update({
        where: { id: userId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.email && { email: data.email }),
          ...(hashedPassword && { password: hashedPassword }),
        },
      }),
      // Update OrganizationMember (org-specific fields)
      db.organizationMember.update({
        where: { organizationId_userId: { organizationId: ctx.organizationId, userId } },
        data: {
          ...(data.role && { role: data.role }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      }),
    ]);

    revalidatePath("/dashboard/admin/sales-reps");
    revalidatePath(`/dashboard/admin/sales-reps/${userId}`);
    revalidatePath("/dashboard/admin/users");
    return { success: true, user };
  } catch (error: any) {
    console.error("Error updating sales rep:", error);
    return { success: false, error: error.message || "Failed to update sales rep" };
  }
}

// ---------------------------------------------------------------------------
// toggleSalesRepStatus — updates OrganizationMember.isActive (not User)
// ---------------------------------------------------------------------------
export async function toggleSalesRepStatus(userId: string, isActive: boolean) {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Admin access required" };
    }

    const member = await db.organizationMember.update({
      where: { organizationId_userId: { organizationId: ctx.organizationId, userId } },
      data: { isActive },
      include: { user: { select: { name: true } } },
    });

    revalidatePath("/dashboard/admin/sales-reps");
    revalidatePath("/dashboard/admin/users");
    return { success: true, message: `${member.user.name} ${isActive ? "activated" : "deactivated"}` };
  } catch (error: any) {
    console.error("Error toggling status:", error);
    return { success: false, error: error.message || "Failed to toggle status" };
  }
}

// ---------------------------------------------------------------------------
// removeFromOrg — removes a member from this org (replaces deleteUser)
// ---------------------------------------------------------------------------
export async function removeFromOrg(userId: string) {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Admin access required" };
    }

    if (ctx.userId === userId) {
      return { success: false, error: "You cannot remove yourself from the organization" };
    }

    // Check for active orders in this org
    const activeOrders = await db.order.count({
      where: { organizationId: ctx.organizationId, assignedToId: userId, status: { in: ["NEW", "CONFIRMED", "DISPATCHED"] } },
    });

    if (activeOrders > 0) {
      return { success: false, error: `Cannot remove user with ${activeOrders} active order(s). Reassign them first.` };
    }

    await db.organizationMember.delete({
      where: { organizationId_userId: { organizationId: ctx.organizationId, userId } },
    });

    revalidatePath("/dashboard/admin/sales-reps");
    revalidatePath("/dashboard/admin/users");
    return { success: true, message: "Member removed from organization" };
  } catch (error: any) {
    console.error("Error removing from org:", error);
    return { success: false, error: error.message || "Failed to remove member" };
  }
}

// ---------------------------------------------------------------------------
// resetUserPassword
// ---------------------------------------------------------------------------
export async function resetUserPassword(userId: string) {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Admin access required" };
    }

    // Verify user is a member of this org
    const member = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: ctx.organizationId, userId } },
      include: { user: { select: { name: true } } },
    });
    if (!member) return { success: false, error: "User not found in this organization" };

    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await db.user.update({ where: { id: userId }, data: { password: hashedPassword } });

    revalidatePath("/dashboard/admin/users");
    return { success: true, tempPassword, message: `Password reset for ${member.user.name}` };
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return { success: false, error: error.message || "Failed to reset password" };
  }
}

// ---------------------------------------------------------------------------
// bulkDeactivateUsers — deactivates OrganizationMember.isActive
// ---------------------------------------------------------------------------
export async function bulkDeactivateUsers(userIds: string[]) {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Admin access required" };
    }

    if (userIds.includes(ctx.userId)) {
      return { success: false, error: "You cannot deactivate your own account" };
    }

    const result = await db.organizationMember.updateMany({
      where: { organizationId: ctx.organizationId, userId: { in: userIds } },
      data: { isActive: false },
    });

    revalidatePath("/dashboard/admin/sales-reps");
    revalidatePath("/dashboard/admin/users");
    return {
      success: true,
      count: result.count,
      message: `${result.count} member${result.count === 1 ? "" : "s"} deactivated`,
    };
  } catch (error: any) {
    console.error("Error bulk deactivating:", error);
    return { success: false, error: error.message || "Failed to deactivate" };
  }
}

// ---------------------------------------------------------------------------
// bulkResetPasswords
// ---------------------------------------------------------------------------
export async function bulkResetPasswords(userIds: string[]) {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Admin access required" };
    }

    // Only reset passwords for members of this org
    const members = await db.organizationMember.findMany({
      where: { organizationId: ctx.organizationId, userId: { in: userIds } },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (members.length === 0) return { success: false, error: "No valid members found" };

    const passwordResets: Array<{ userId: string; name: string; email: string; tempPassword: string }> = [];

    await db.$transaction(
      members.map((m) => {
        const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
        const hashedPassword = bcrypt.hashSync(tempPassword, 10);
        passwordResets.push({ userId: m.userId, name: m.user.name, email: m.user.email, tempPassword });
        return db.user.update({ where: { id: m.userId }, data: { password: hashedPassword } });
      })
    );

    revalidatePath("/dashboard/admin/users");
    return {
      success: true,
      passwordResets,
      message: `${passwordResets.length} password${passwordResets.length === 1 ? "" : "s"} reset`,
    };
  } catch (error: any) {
    console.error("Error bulk resetting passwords:", error);
    return { success: false, error: error.message || "Failed to reset passwords" };
  }
}

// ---------------------------------------------------------------------------
// Org-scoped system settings: Ghana Manager + AI Agent
// ---------------------------------------------------------------------------
const GHANA_MANAGER_KEY = "ghana_manager_id";
const AI_AGENT_KEY = "ai_agent_user_id";

export async function setGhanaManager(userId: string | null) {
  try {
    const ctx = await requireOrgContext();
    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") return { success: false, error: "Unauthorized" };

    if (userId) {
      await db.systemSetting.upsert({
        where: { organizationId_key: { organizationId: ctx.organizationId, key: GHANA_MANAGER_KEY } },
        update: { value: userId },
        create: { organizationId: ctx.organizationId, key: GHANA_MANAGER_KEY, value: userId },
      });
    } else {
      await db.systemSetting.deleteMany({
        where: { organizationId: ctx.organizationId, key: GHANA_MANAGER_KEY },
      });
    }

    revalidatePath("/dashboard/admin/users");
    return { success: true };
  } catch (error) {
    console.error("setGhanaManager error:", error);
    return { success: false, error: "Failed to update Ghana manager" };
  }
}

export async function getGhanaManagerId(organizationId: string): Promise<string | null> {
  const setting = await db.systemSetting.findUnique({
    where: { organizationId_key: { organizationId, key: GHANA_MANAGER_KEY } },
  });
  return setting?.value ?? null;
}

export async function setAiAgent(userId: string | null) {
  try {
    const ctx = await requireOrgContext();
    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") return { success: false, error: "Unauthorized" };

    // Clear isAiAgent from all members of this org
    await db.organizationMember.updateMany({
      where: { organizationId: ctx.organizationId, isAiAgent: true },
      data: { isAiAgent: false },
    });

    if (userId) {
      await db.organizationMember.update({
        where: { organizationId_userId: { organizationId: ctx.organizationId, userId } },
        data: { isAiAgent: true },
      });
      await db.systemSetting.upsert({
        where: { organizationId_key: { organizationId: ctx.organizationId, key: AI_AGENT_KEY } },
        update: { value: userId },
        create: { organizationId: ctx.organizationId, key: AI_AGENT_KEY, value: userId },
      });
    } else {
      await db.systemSetting.deleteMany({
        where: { organizationId: ctx.organizationId, key: AI_AGENT_KEY },
      });
    }

    revalidatePath("/dashboard/admin/users");
    return { success: true };
  } catch (error) {
    console.error("setAiAgent error:", error);
    return { success: false, error: "Failed to update AI agent" };
  }
}

export async function getAiAgentId(organizationId: string): Promise<string | null> {
  const setting = await db.systemSetting.findUnique({
    where: { organizationId_key: { organizationId, key: AI_AGENT_KEY } },
  });
  return setting?.value ?? null;
}

export async function getHumanSalesReps(organizationId: string) {
  const members = await db.organizationMember.findMany({
    where: { organizationId, role: "SALES_REP", isActive: true, isAiAgent: false },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return members.map((m) => ({ id: m.userId, name: m.user.name }));
}

// Aliases
export const createUser = createSalesRep;
export const updateUser = updateSalesRep;
export const deleteUser = removeFromOrg;
export const toggleUserStatus = toggleSalesRepStatus;

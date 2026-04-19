"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { resetRoundRobin } from "@/lib/round-robin";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function getCurrentUser() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return null;
    }

    // Fetch full user data including role
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
      },
    });

    return user;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}

/**
 * Get all active sales reps (for filtering/dropdown)
 */
export async function getAllSalesReps() {
  try {
    const salesReps = await db.user.findMany({
      where: {
        role: "SALES_REP",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return { success: true, salesReps };
  } catch (error) {
    console.error("Error fetching sales reps:", error);
    return { success: false, error: "Failed to fetch sales reps" };
  }
}

interface CreateSalesRepData {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * Create a new sales rep or user
 * Only accessible by ADMIN users
 */
export async function createSalesRep(data: CreateSalesRepData) {
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
      return { success: false, error: "Unauthorized - Admin access required" };
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return { success: false, error: "Email already exists" };
    }

    // Create user via Better Auth
    await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.name,
      },
    });

    // Update user with role and active status
    const user = await db.user.update({
      where: { email: data.email },
      data: {
        role: data.role || "SALES_REP",
        isActive: data.isActive !== undefined ? data.isActive : true,
        emailVerified: true,
      },
    });

    // Reset round-robin when adding new sales reps
    if (user.role === "SALES_REP" && user.isActive) {
      await resetRoundRobin();
    }

    // Revalidate paths
    revalidatePath("/dashboard/admin/sales-reps");
    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/admin");

    return { success: true, user };
  } catch (error: any) {
    console.error("Error creating sales rep:", error);
    return {
      success: false,
      error: error.message || "Failed to create sales rep",
    };
  }
}

interface UpdateSalesRepData {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * Update an existing sales rep or user
 * Only accessible by ADMIN users
 */
export async function updateSalesRep(
  userId: string,
  data: UpdateSalesRepData
) {
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
      return { success: false, error: "Unauthorized - Admin access required" };
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return { success: false, error: "User not found" };
    }

    // If email is being changed, check for uniqueness
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await db.user.findUnique({
        where: { email: data.email },
      });

      if (emailExists) {
        return { success: false, error: "Email already exists" };
      }
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (data.password && data.password.trim() !== "") {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    // Update user
    const user = await db.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(hashedPassword && { password: hashedPassword }),
        ...(data.role && { role: data.role }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    // Revalidate paths
    revalidatePath("/dashboard/admin/sales-reps");
    revalidatePath(`/dashboard/admin/sales-reps/${userId}`);
    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/admin");

    return { success: true, user };
  } catch (error: any) {
    console.error("Error updating sales rep:", error);
    return {
      success: false,
      error: error.message || "Failed to update sales rep",
    };
  }
}

/**
 * Toggle sales rep active status
 * Only accessible by ADMIN users
 */
export async function toggleSalesRepStatus(
  userId: string,
  isActive: boolean
) {
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
      return { success: false, error: "Unauthorized - Admin access required" };
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return { success: false, error: "User not found" };
    }

    // Update active status
    const user = await db.user.update({
      where: { id: userId },
      data: { isActive },
    });

    // Revalidate paths
    revalidatePath("/dashboard/admin/sales-reps");
    revalidatePath(`/dashboard/admin/sales-reps/${userId}`);
    revalidatePath("/dashboard/admin/users");

    return { success: true, user };
  } catch (error: any) {
    console.error("Error toggling sales rep status:", error);
    return {
      success: false,
      error: error.message || "Failed to toggle status",
    };
  }
}

/**
 * Delete a user (hard delete with validation)
 * Only accessible by ADMIN users
 * Prevents deletion if user has associated orders
 */
export async function deleteUser(userId: string) {
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
      select: { role: true, id: true },
    });

    if (!currentUser || currentUser.role !== "ADMIN") {
      return { success: false, error: "Unauthorized - Admin access required" };
    }

    // Prevent deleting yourself
    if (currentUser.id === userId) {
      return { success: false, error: "You cannot delete your own account" };
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          take: 1, // Just need to know if any exist
        },
      },
    });

    if (!existingUser) {
      return { success: false, error: "User not found" };
    }

    // Check if user has orders
    if (existingUser.orders.length > 0) {
      return {
        success: false,
        error:
          "Cannot delete user with existing orders. Consider deactivating instead.",
      };
    }

    // Delete user (also deletes sessions and accounts via cascade)
    await db.user.delete({
      where: { id: userId },
    });

    // Revalidate paths
    revalidatePath("/dashboard/admin/sales-reps");
    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/admin");

    return { success: true, message: "User deleted successfully" };
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return {
      success: false,
      error: error.message || "Failed to delete user",
    };
  }
}

/**
 * Reset user password to a temporary password
 * Only accessible by ADMIN users
 * Returns the temporary password for the admin to share with the user
 */
export async function resetUserPassword(userId: string) {
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
      return { success: false, error: "Unauthorized - Admin access required" };
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!existingUser) {
      return { success: false, error: "User not found" };
    }

    // Generate temporary password
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Update user password
    await db.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    // Revalidate paths
    revalidatePath("/dashboard/admin/users");

    return {
      success: true,
      tempPassword,
      message: `Password reset successfully for ${existingUser.name}`,
    };
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return {
      success: false,
      error: error.message || "Failed to reset password",
    };
  }
}

/**
 * Bulk deactivate users
 * Only accessible by ADMIN users
 */
export async function bulkDeactivateUsers(userIds: string[]) {
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
      select: { role: true, id: true },
    });

    if (!currentUser || currentUser.role !== "ADMIN") {
      return { success: false, error: "Unauthorized - Admin access required" };
    }

    // Prevent deactivating yourself
    if (userIds.includes(currentUser.id)) {
      return {
        success: false,
        error: "You cannot deactivate your own account",
      };
    }

    // Bulk update users to inactive
    const result = await db.user.updateMany({
      where: {
        id: {
          in: userIds,
        },
      },
      data: {
        isActive: false,
      },
    });

    // Revalidate paths
    revalidatePath("/dashboard/admin/sales-reps");
    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard/admin");

    return {
      success: true,
      count: result.count,
      message: `${result.count} user${result.count === 1 ? "" : "s"} deactivated successfully`,
    };
  } catch (error: any) {
    console.error("Error bulk deactivating users:", error);
    return {
      success: false,
      error: error.message || "Failed to deactivate users",
    };
  }
}

/**
 * Bulk reset passwords for multiple users
 * Only accessible by ADMIN users
 * Returns the temporary passwords for the admin to share with the users
 */
export async function bulkResetPasswords(userIds: string[]) {
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
      return { success: false, error: "Unauthorized - Admin access required" };
    }

    // Fetch users to reset
    const users = await db.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (users.length === 0) {
      return { success: false, error: "No valid users found" };
    }

    // Generate temporary passwords for each user
    const passwordResets: Array<{
      userId: string;
      name: string;
      email: string;
      tempPassword: string;
    }> = [];

    // Use a transaction to update all passwords
    await db.$transaction(
      users.map((user) => {
        const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
        const hashedPassword = bcrypt.hashSync(tempPassword, 10);

        passwordResets.push({
          userId: user.id,
          name: user.name,
          email: user.email,
          tempPassword,
        });

        return db.user.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
          },
        });
      })
    );

    // Revalidate paths
    revalidatePath("/dashboard/admin/users");

    return {
      success: true,
      passwordResets,
      message: `${passwordResets.length} password${passwordResets.length === 1 ? "" : "s"} reset successfully`,
    };
  } catch (error: any) {
    console.error("Error bulk resetting passwords:", error);
    return {
      success: false,
      error: error.message || "Failed to reset passwords",
    };
  }
}

// Aliases for User Management page (more generic naming)
export const createUser = createSalesRep;
export const updateUser = updateSalesRep;

const GHANA_MANAGER_KEY = "ghana_manager_id";

export async function setGhanaManager(userId: string | null) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    if (userId) {
      await db.systemSetting.upsert({
        where: { key: GHANA_MANAGER_KEY },
        update: { value: userId },
        create: { key: GHANA_MANAGER_KEY, value: userId },
      });
    } else {
      await db.systemSetting.deleteMany({ where: { key: GHANA_MANAGER_KEY } });
    }

    revalidatePath("/dashboard/admin/users");
    return { success: true };
  } catch (error) {
    console.error("setGhanaManager error:", error);
    return { success: false, error: "Failed to update Ghana manager" };
  }
}

export async function getGhanaManagerId(): Promise<string | null> {
  const setting = await db.systemSetting.findUnique({ where: { key: GHANA_MANAGER_KEY } });
  return setting?.value ?? null;
}
const AI_AGENT_KEY = "ai_agent_user_id";

export async function setAiAgent(userId: string | null) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    // Clear isAiAgent flag from all users first
    await db.user.updateMany({ where: { isAiAgent: true }, data: { isAiAgent: false } });

    if (userId) {
      await db.user.update({ where: { id: userId }, data: { isAiAgent: true } });
      await db.systemSetting.upsert({
        where: { key: AI_AGENT_KEY },
        update: { value: userId },
        create: { key: AI_AGENT_KEY, value: userId },
      });
    } else {
      await db.systemSetting.deleteMany({ where: { key: AI_AGENT_KEY } });
    }

    revalidatePath("/dashboard/admin/users");
    return { success: true };
  } catch (error) {
    console.error("setAiAgent error:", error);
    return { success: false, error: "Failed to update AI agent" };
  }
}

export async function getAiAgentId(): Promise<string | null> {
  const setting = await db.systemSetting.findUnique({ where: { key: AI_AGENT_KEY } });
  return setting?.value ?? null;
}

export const toggleUserStatus = toggleSalesRepStatus;
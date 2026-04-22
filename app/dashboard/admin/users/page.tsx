import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";
import { UsersClient } from "./_components";
import { Metadata } from "next";
import { getAiAgentId, getGhanaManagerId } from "@/app/actions/user";

export const metadata: Metadata = {
  title: "User Management | Ordello CRM",
  description:
    "Manage company-wide user roles, permissions, and security settings",
};

async function getUsersData(organizationId: string) {
  const members = await db.organizationMember.findMany({
    where: { organizationId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  // Flatten to user-like objects with role from OrganizationMember
  const allUsers = members.map((m) => ({
    ...m.user,
    role: m.role,
    isActive: m.isActive,
    memberCreatedAt: m.createdAt,
  }));

  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter((u) => u.isActive).length;
  const inactiveUsers = totalUsers - activeUsers;

  const adminCount = allUsers.filter(
    (u) => u.role === "ADMIN" || u.role === "OWNER",
  ).length;
  const salesRepCount = allUsers.filter((u) => u.role === "SALES_REP").length;
  const inventoryMgrCount = allUsers.filter(
    (u) => u.role === "INVENTORY_MANAGER",
  ).length;

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);
  const lastMonthStart = new Date(thisMonthStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

  const newUsersThisMonth = allUsers.filter(
    (u) => u.memberCreatedAt >= thisMonthStart,
  ).length;
  const newUsersLastMonth = allUsers.filter(
    (u) =>
      u.memberCreatedAt >= lastMonthStart && u.memberCreatedAt < thisMonthStart,
  ).length;
  const newUsersTrend =
    newUsersLastMonth > 0
      ? Math.round(
          ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100,
        )
      : 0;

  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const monthLabel = date.toLocaleDateString("en-US", { month: "short" });
    const usersInMonth = allUsers.filter(
      (u) => u.memberCreatedAt >= monthStart && u.memberCreatedAt <= monthEnd,
    ).length;
    monthlyData.push({ month: monthLabel, users: usersInMonth });
  }

  return {
    users: allUsers,
    stats: {
      totalUsers,
      activeUsers,
      inactiveUsers,
      newUsersThisMonth,
      newUsersTrend,
    },
    roleDistribution: {
      admin: adminCount,
      salesRep: salesRepCount,
      inventoryManager: inventoryMgrCount,
    },
    monthlyGrowth: monthlyData,
  };
}

export default async function UsersPage() {
  const ctx = await requireOrgContext();

  const [data, ghanaManagerId, aiAgentId] = await Promise.all([
    getUsersData(ctx.organizationId),
    getGhanaManagerId(ctx.organizationId),
    getAiAgentId(ctx.organizationId),
  ]);

  return (
    <UsersClient
      {...data}
      ghanaManagerId={ghanaManagerId}
      aiAgentId={aiAgentId}
    />
  );
}

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsersClient } from "./_components";
import { Metadata } from "next";
import { getAiAgentId, getGhanaManagerId } from "@/app/actions/user";

export const metadata: Metadata = {
  title: "User Management | Ordo CRM",
  description:
    "Manage company-wide user roles, permissions, and security settings",
};

async function getUsersData() {
  // Fetch all users
  const allUsers = await db.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  // Calculate stats
  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter((u) => u.isActive).length;
  const inactiveUsers = totalUsers - activeUsers;

  // Calculate users by role
  const adminCount = allUsers.filter((u) => u.role === "ADMIN").length;
  const salesRepCount = allUsers.filter((u) => u.role === "SALES_REP").length;
  const inventoryMgrCount = allUsers.filter(
    (u) => u.role === "INVENTORY_MANAGER",
  ).length;

  // Calculate new users this month
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const newUsersThisMonth = allUsers.filter(
    (u) => u.createdAt >= thisMonthStart,
  ).length;

  // Calculate previous month for trend
  const lastMonthStart = new Date(thisMonthStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

  const newUsersLastMonth = allUsers.filter(
    (u) => u.createdAt >= lastMonthStart && u.createdAt < thisMonthStart,
  ).length;

  const newUsersTrend =
    newUsersLastMonth > 0
      ? Math.round(
          ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100,
        )
      : 0;

  // Calculate user growth data for last 6 months
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const monthLabel = date.toLocaleDateString("en-US", { month: "short" });

    const usersInMonth = allUsers.filter(
      (u) => u.createdAt >= monthStart && u.createdAt <= monthEnd,
    ).length;

    monthlyData.push({
      month: monthLabel,
      users: usersInMonth,
    });
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
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const [data, ghanaManagerId, aiAgentId] = await Promise.all([
    getUsersData(),
    getGhanaManagerId(),
    getAiAgentId(),
  ]);

  return <UsersClient {...data} ghanaManagerId={ghanaManagerId} aiAgentId={aiAgentId} />;
}

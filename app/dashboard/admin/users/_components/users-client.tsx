"use client";

import {
    bulkDeactivateUsers,
    bulkResetPasswords,
    deleteUser,
    resetUserPassword,
    setAiAgent,
    setGhanaManager,
    toggleUserStatus,
} from "@/app/actions/user";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatRole, getInitials } from "@/lib/utils";
import { OrgMemberRole } from "@prisma/client";

interface UserWithMember {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: Date;
  role: OrgMemberRole;
  isActive: boolean;
  isAiAgent: boolean;
}
import {
    Bot,
    ChevronLeft,
    ChevronRight,
    Copy,
    Edit,
    KeyRound,
    Loader2,
    Search,
    Trash2,
    TrendingUp,
    Upload,
    UserCheck,
    UserPlus,
    Users
} from "lucide-react";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { DashboardHeader } from "../../_components";
import { AddUserModal } from "./add-user-modal";
import { EditUserModal } from "./edit-user-modal";

interface UsersClientProps {
  users: UserWithMember[];
  ghanaManagerId: string | null;
  aiAgentId: string | null;
  stats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    newUsersThisMonth: number;
    newUsersTrend: number;
  };
  roleDistribution: {
    admin: number;
    salesRep: number;
    inventoryManager: number;
  };
  monthlyGrowth: Array<{ month: string; users: number }>;
}

const roleColors: Record<OrgMemberRole, string> = {
  OWNER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ADMIN: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  SALES_REP: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  INVENTORY_MANAGER: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
};

const PIE_COLORS = ["#137fec", "#818cf8", "#cbd5e1"];

export default function UsersClient({
  users,
  ghanaManagerId: initialGhanaManagerId,
  aiAgentId: initialAiAgentId,
  stats,
  roleDistribution,
  monthlyGrowth,
}: UsersClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithMember | null>(null);
  const [isPending, startTransition] = useTransition();
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithMember | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [passwordResetDialogOpen, setPasswordResetDialogOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string>("");
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(
    null,
  );
  const [bulkPasswordResetDialogOpen, setBulkPasswordResetDialogOpen] =
    useState(false);
  const [bulkPasswordResets, setBulkPasswordResets] = useState<
    Array<{ userId: string; name: string; email: string; tempPassword: string }>
  >([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [ghanaManagerId, setGhanaManagerId] = useState<string | null>(initialGhanaManagerId);
  const [settingGhanaManager, setSettingGhanaManager] = useState<string | null>(null);
  const [aiAgentId, setAiAgentId] = useState<string | null>(initialAiAgentId);
  const [settingAiAgent, setSettingAiAgent] = useState<string | null>(null);

  const handleSetAiAgent = async (userId: string | null) => {
    setSettingAiAgent(userId ?? "clear");
    startTransition(async () => {
      const result = await setAiAgent(userId);
      if (result.success) {
        setAiAgentId(userId);
        toast.success(userId ? "AI agent designated" : "AI agent removed");
      } else {
        toast.error(result.error || "Failed to update AI agent");
      }
      setSettingAiAgent(null);
    });
  };

  const handleSetGhanaManager = async (userId: string | null) => {
    setSettingGhanaManager(userId ?? "clear");
    startTransition(async () => {
      const result = await setGhanaManager(userId);
      if (result.success) {
        setGhanaManagerId(userId);
        toast.success(userId ? "Ghana manager set" : "Ghana manager removed");
      } else {
        toast.error(result.error || "Failed to update Ghana manager");
      }
      setSettingGhanaManager(null);
    });
  };

  const itemsPerPage = 10;

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" ? true : user.role === roleFilter;

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
          ? user.isActive
          : !user.isActive;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  // Prepare pie chart data
  const pieData = [
    {
      name: "Sales Reps",
      value: roleDistribution.salesRep,
      percentage: (
        (roleDistribution.salesRep / stats.totalUsers) *
        100
      ).toFixed(0),
    },
    {
      name: "Admins",
      value: roleDistribution.admin,
      percentage: ((roleDistribution.admin / stats.totalUsers) * 100).toFixed(
        0,
      ),
    },
    {
      name: "Inv. Mgr",
      value: roleDistribution.inventoryManager,
      percentage: (
        (roleDistribution.inventoryManager / stats.totalUsers) *
        100
      ).toFixed(0),
    },
  ];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(paginatedUsers.map((u) => u.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelection = new Set(selectedUsers);
    if (checked) {
      newSelection.add(userId);
    } else {
      newSelection.delete(userId);
    }
    setSelectedUsers(newSelection);
  };

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    setTogglingUserId(userId);
    startTransition(async () => {
      const result = await toggleUserStatus(userId, isActive);
      if (result.success) {
        toast.success(`User ${isActive ? "activated" : "deactivated"}`);
      } else {
        toast.error(result.error || "Failed to update user status");
      }
      setTogglingUserId(null);
    });
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setDeletingUserId(userToDelete.id);
    startTransition(async () => {
      const result = await deleteUser(userToDelete.id);
      if (result.success) {
        toast.success("User deleted successfully");
        setDeleteDialogOpen(false);
        setUserToDelete(null);
      } else {
        toast.error(result.error || "Failed to delete user");
      }
      setDeletingUserId(null);
    });
  };

  const handleResetPassword = async (userId: string) => {
    setResetPasswordUserId(userId);
    startTransition(async () => {
      const result = await resetUserPassword(userId);
      if (result.success && result.tempPassword) {
        setTempPassword(result.tempPassword);
        setPasswordResetDialogOpen(true);
        toast.success(result.message || "Password reset successfully");
      } else {
        toast.error(result.error || "Failed to reset password");
      }
      setResetPasswordUserId(null);
    });
  };

  const handleBulkDeactivate = async () => {
    if (selectedUsers.size === 0) return;

    setBulkActionLoading(true);
    startTransition(async () => {
      const result = await bulkDeactivateUsers(Array.from(selectedUsers));
      if (result.success) {
        toast.success(result.message || "Users deactivated successfully");
        setSelectedUsers(new Set());
      } else {
        toast.error(result.error || "Failed to deactivate users");
      }
      setBulkActionLoading(false);
    });
  };

  const handleBulkPasswordReset = async () => {
    if (selectedUsers.size === 0) return;

    setBulkActionLoading(true);
    startTransition(async () => {
      const result = await bulkResetPasswords(Array.from(selectedUsers));
      if (result.success && result.passwordResets) {
        setBulkPasswordResets(result.passwordResets);
        setBulkPasswordResetDialogOpen(true);
        toast.success(result.message || "Passwords reset successfully");
        setSelectedUsers(new Set());
      } else {
        toast.error(result.error || "Failed to reset passwords");
      }
      setBulkActionLoading(false);
    });
  };

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Header */}
      <DashboardHeader
        heading="User Management"
        text=" Manage company-wide user roles, permissions, and security settings."
      />
      <div className="flex flex-col sm:flex-row gap-3 justify-end items-stretch sm:items-end">
        <Button variant="outline" className="w-full sm:w-auto">
          <Upload className="size-4 mr-2" />
          Export Data
        </Button>
        <Button onClick={() => setAddModalOpen(true)} className="w-full sm:w-auto">
          <UserPlus className="size-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Users
              </span>
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Users className="size-5" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold">
                {stats.totalUsers}
              </span>
              {stats.newUsersTrend !== 0 && (
                <span className="text-xs text-emerald-500 font-bold mt-2 flex items-center">
                  <TrendingUp className="size-3 mr-1" />
                  {stats.newUsersTrend > 0 ? "+" : ""}
                  {stats.newUsersTrend}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Users
              </span>
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <UserCheck className="size-5" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold">
                {stats.activeUsers}
              </span>
              <span className="text-xs text-muted-foreground mt-2">
                {stats.inactiveUsers} inactive
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                New Users (Month)
              </span>
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <UserPlus className="size-5" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold">
                {stats.newUsersThisMonth}
              </span>
              {stats.newUsersTrend !== 0 && (
                <span className="text-xs text-emerald-500 font-bold mt-2 flex items-center">
                  <TrendingUp className="size-3 mr-1" />
                  {stats.newUsersTrend > 0 ? "+" : ""}
                  {stats.newUsersTrend}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* User Growth Chart */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-bold">User Growth</h2>
              <p className="text-sm text-muted-foreground">
                Growth trend over the last 6 months
              </p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#137fec"
                  strokeWidth={2}
                  name="New Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Role Distribution Chart */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-bold">Role Distribution</h2>
              <p className="text-sm text-muted-foreground">
                Active roles by category
              </p>
            </div>
            <div className="flex items-center justify-center gap-10">
              <div className="relative">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      dataKey="value"
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold">{stats.totalUsers}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                    Total
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {pieData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="size-3 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[index] }}
                    />
                    <span className="text-sm font-medium">
                      {item.name} ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
              <div className="relative flex-1 sm:flex-none sm:min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SALES_REP">Sales Rep</SelectItem>
                  <SelectItem value="INVENTORY_MANAGER">
                    Inventory Manager
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {selectedUsers.size > 0 && (
          <div className="bg-muted border-b px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedUsers.size === paginatedUsers.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-semibold text-muted-foreground">
                {selectedUsers.size} user{selectedUsers.size > 1 ? "s" : ""}{" "}
                selected
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-red-600"
                onClick={handleBulkDeactivate}
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : null}
                Deactivate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkPasswordReset}
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : null}
                Bulk Password Reset
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      paginatedUsers.length > 0 &&
                      selectedUsers.size === paginatedUsers.length
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Name & Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={(checked) =>
                          handleSelectUser(user.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {getInitials(user.name)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold">{user.name}</span>
                            {ghanaManagerId === user.id && (
                              <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-1.5 py-0 gap-1">
                                <img src="/ghana flag.webp" alt="Ghana" className="size-3 object-cover rounded-sm" />
                                Ghana
                              </Badge>
                            )}
                            {aiAgentId === user.id && (
                              <Badge variant="outline" className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 text-[10px] px-1.5 py-0 gap-1">
                                <Bot className="size-3" />
                                AI Agent
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={roleColors[user.role]}
                      >
                        {formatRole(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Switch
                            checked={user.isActive}
                            disabled={togglingUserId === user.id}
                            onCheckedChange={(checked) =>
                              handleToggleStatus(user.id, checked)
                            }
                          />
                          {togglingUserId === user.id && isPending && (
                            <Loader2 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-3 animate-spin text-primary" />
                          )}
                        </div>
                        <span
                          className={`text-sm font-medium ${user.isActive ? "text-emerald-600" : "text-muted-foreground"}`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {user.role === "SALES_REP" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={ghanaManagerId === user.id ? "Remove Ghana Manager role" : "Set as Ghana Manager"}
                              onClick={() => handleSetGhanaManager(ghanaManagerId === user.id ? null : user.id)}
                              disabled={settingGhanaManager !== null}
                              className={ghanaManagerId === user.id ? "text-green-600 hover:text-green-700" : "text-muted-foreground hover:text-green-600"}
                            >
                              {settingGhanaManager === user.id || (settingGhanaManager === "clear" && ghanaManagerId === user.id) ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <img src="/ghana flag.webp" alt="Ghana" className="size-4 object-cover rounded-sm" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={aiAgentId === user.id ? "Remove AI Agent role" : "Set as AI Agent"}
                              onClick={() => handleSetAiAgent(aiAgentId === user.id ? null : user.id)}
                              disabled={settingAiAgent !== null}
                              className={aiAgentId === user.id ? "text-violet-600 hover:text-violet-700" : "text-muted-foreground hover:text-violet-600"}
                            >
                              {settingAiAgent === user.id || (settingAiAgent === "clear" && aiAgentId === user.id) ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Bot className="size-4" />
                              )}
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(user);
                            setEditModalOpen(true);
                          }}
                          title="Edit"
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reset Password"
                          onClick={() => handleResetPassword(user.id)}
                          disabled={resetPasswordUserId === user.id}
                        >
                          {resetPasswordUserId === user.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <KeyRound className="size-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          title="Delete"
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={deletingUserId === user.id}
                        >
                          {deletingUserId === user.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted">
          <span className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to{" "}
            {Math.min(startIndex + itemsPerPage, filteredUsers.length)} of{" "}
            {filteredUsers.length} users
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="icon"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modals */}
      <AddUserModal open={addModalOpen} onOpenChange={setAddModalOpen} />
      <EditUserModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={selectedUser}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.name}? This action
              cannot be undone. Users with existing orders cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingUserId !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteUser();
              }}
              disabled={deletingUserId !== null}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingUserId ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Reset Dialog */}
      <Dialog
        open={passwordResetDialogOpen}
        onOpenChange={setPasswordResetDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset Successful</DialogTitle>
            <DialogDescription>
              A temporary password has been generated for the user. Please share
              this password securely with them.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Temporary Password:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-lg font-mono font-bold bg-background px-3 py-2 rounded border">
                  {tempPassword}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(tempPassword);
                    toast.success("Password copied to clipboard");
                  }}
                  title="Copy to clipboard"
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              The user should change this password immediately after logging in.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Password Reset Dialog */}
      <Dialog
        open={bulkPasswordResetDialogOpen}
        onOpenChange={setBulkPasswordResetDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Password Reset Successful</DialogTitle>
            <DialogDescription>
              Temporary passwords have been generated for {bulkPasswordResets.length} user
              {bulkPasswordResets.length === 1 ? "" : "s"}. Please share these
              passwords securely with them.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 space-y-3">
            {bulkPasswordResets.map((reset) => (
              <div key={reset.userId} className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold">{reset.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {reset.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono font-bold bg-background px-3 py-2 rounded border">
                    {reset.tempPassword}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(reset.tempPassword);
                      toast.success(
                        `Password for ${reset.name} copied to clipboard`
                      );
                    }}
                    title="Copy to clipboard"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-3">
              Users should change these passwords immediately after logging in.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

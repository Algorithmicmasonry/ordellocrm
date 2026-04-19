"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wallet,
  Package,
  Coins,
  Flame,
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
  Download,
  Filter,
  Edit,
  Trash2,
  Search,
  Eye,
  ChevronDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { DashboardHeader } from "../../_components/dashboard-header";
import { PeriodFilter, DateRangePicker } from "../../_components";
import { CurrencyFilter } from "../../_components/currency-filter";
import type { TimePeriod } from "@/lib/types";
import type { Currency } from "@prisma/client";
import { AddExpenseModal } from "./add-expense-modal";
import { EditExpenseModal } from "./edit-expense-modal";
import { DeleteExpenseDialog } from "./delete-expense-dialog";
import { deleteExpense } from "@/app/actions/expenses";
import {
  exportToCSV,
  generateFilename,
  formatCurrencyForExport,
  formatDateForExport,
} from "@/lib/export-utils";
import { formatCurrency, getCurrencyName } from "@/lib/currency";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Expense {
  id: string;
  type: string;
  amount: number;
  batchQuantity: number | null;
  description: string | null;
  date: Date;
  productId: string | null;
  product: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Product {
  id: string;
  name: string;
}

interface ExpensesClientProps {
  expenses: Expense[];
  products: Product[];
  stats: {
    totalExpenses: number;
    productLinkedExpenses: number;
    generalExpenses: number;
    dailyBurnRate: number;
    trends: {
      totalExpenses: number | null;
      productLinkedExpenses: number | null;
      generalExpenses: number | null;
    };
  };
  profitImpact: {
    grossRevenue: number;
    costOfGoods: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    amount: number;
    primaryType: string;
  }>;
  maxProductExpense: number;
  monthlyComparison: Array<{
    operating: number;
    marketing: number;
    month: string;
  }>;
  maxMonthlyValue: number;
  charts: {
    expensesByType: Record<string, number>;
    dailyExpenses: Record<string, number>;
  };
  currentPeriod: TimePeriod;
  currency?: Currency;
}

const expenseTypeConfig: Record<string, { label: string; color: string }> = {
  ad_spend: {
    label: "Ad Spend",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  delivery: {
    label: "Delivery",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  clearing: {
    label: "Clearing & Shipping",
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  waybill: {
    label: "Waybill",
    color:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  },
  other: {
    label: "Other",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
};

const CHART_COLORS = [
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#8b5cf6", // purple
];

export default function ExpensesClient({
  expenses,
  products,
  stats,
  profitImpact,
  topProducts,
  maxProductExpense,
  monthlyComparison,
  maxMonthlyValue,
  charts,
  currentPeriod,
  currency,
}: ExpensesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(
    new Set(),
  );
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(
    null,
  );
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(Object.keys(expenseTypeConfig)),
  );
  const itemsPerPage = 10;
  const router = useRouter();

  // Filter expenses by search query and type
  const filteredExpenses = expenses.filter((expense) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      expense.description?.toLowerCase().includes(searchLower) ||
      expense.type.toLowerCase().includes(searchLower) ||
      expense.product?.name.toLowerCase().includes(searchLower);

    const matchesType = selectedTypes.has(expense.type);

    return matchesSearch && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedExpenses(new Set(paginatedExpenses.map((e) => e.id)));
    } else {
      setSelectedExpenses(new Set());
    }
  };

  const handleSelectExpense = (expenseId: string, checked: boolean) => {
    const newSelected = new Set(selectedExpenses);
    if (checked) {
      newSelected.add(expenseId);
    } else {
      newSelected.delete(expenseId);
    }
    setSelectedExpenses(newSelected);
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setEditModalOpen(true);
  };

  const handleDelete = (expense: Expense) => {
    setSelectedExpense(expense);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteClick = () => {
    if (selectedExpenses.size === 0) {
      toast.error("No expenses selected");
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      const deletePromises = Array.from(selectedExpenses).map((id) =>
        deleteExpense(id),
      );
      const results = await Promise.all(deletePromises);

      const failedCount = results.filter((r) => !r.success).length;
      if (failedCount > 0) {
        toast.error(`Failed to delete ${failedCount} expense(s)`);
      } else {
        toast.success(`Deleted ${selectedExpenses.size} expense(s)`);
      }

      setSelectedExpenses(new Set());
      setBulkDeleteDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete expenses");
    }
  };

  const handleExport = () => {
    try {
      // Export filtered or selected expenses to CSV
      const expensesToExport =
        selectedExpenses.size > 0
          ? expenses.filter((e) => selectedExpenses.has(e.id))
          : filteredExpenses;

      const headers = [
        "Date",
        "Type",
        "Amount",
        "Product",
        "Description",
        "Created At",
      ];

      const rows = expensesToExport.map((expense) => [
        formatDateForExport(expense.date),
        expenseTypeConfig[expense.type]?.label || expense.type,
        formatCurrencyForExport(expense.amount),
        expense.product?.name || "General Expense",
        expense.description || "",
        formatDateForExport(expense.createdAt),
      ]);

      const filename = generateFilename("expenses");
      exportToCSV(headers, rows, filename);

      const count =
        selectedExpenses.size > 0
          ? selectedExpenses.size
          : filteredExpenses.length;
      toast.success(`Exported ${count} expense(s) successfully!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export expenses");
    }
  };

  const handleTypeToggle = (type: string) => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setSelectedTypes(newTypes);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleSelectAllTypes = () => {
    setSelectedTypes(new Set(Object.keys(expenseTypeConfig)));
  };

  const handleClearAllTypes = () => {
    setSelectedTypes(new Set());
  };

  // Prepare chart data
  const expenseTypeData = Object.entries(charts.expensesByType).map(
    ([type, amount]) => ({
      name: expenseTypeConfig[type]?.label || type,
      value: amount,
      percentage: ((amount / stats.totalExpenses) * 100).toFixed(1),
    }),
  );

  const dailyExpenseData = Object.entries(charts.dailyExpenses)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      amount,
    }));

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Dashboard Header */}
      <DashboardHeader
        heading="Expense Management"
        text="Monitor and manage your e-commerce operational costs"
      />

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <PeriodFilter currentPeriod={currentPeriod} />
          <DateRangePicker />
          <CurrencyFilter />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={() => router.refresh()} className="w-full sm:w-auto">
            <RefreshCw className="size-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setAddModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="size-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Currency Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs font-medium">
          Currency: {getCurrencyName(currency || "NGN")}
        </Badge>
        <span className="text-xs text-muted-foreground">
          All amounts shown in this currency only
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Expenses
              </span>
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Wallet className="size-5" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold">
                {formatCurrency(stats.totalExpenses, currency || "NGN")}
              </span>
              {stats.trends.totalExpenses !== null && (
                <div
                  className={`flex items-center mt-2 text-sm font-bold ${
                    stats.trends.totalExpenses >= 0
                      ? "text-emerald-500"
                      : "text-rose-500"
                  }`}
                >
                  {stats.trends.totalExpenses >= 0 ? (
                    <TrendingUp className="size-3 mr-1" />
                  ) : (
                    <TrendingDown className="size-3 mr-1" />
                  )}
                  {Math.abs(stats.trends.totalExpenses)}%
                  <span className="text-muted-foreground font-normal ml-1">
                    vs last period
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Product-Linked
              </span>
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                <Package className="size-5" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold">
                {formatCurrency(stats.productLinkedExpenses, currency || "NGN")}
              </span>
              <span className="text-muted-foreground text-xs mt-2">
                {stats.totalExpenses > 0
                  ? (
                      (stats.productLinkedExpenses / stats.totalExpenses) *
                      100
                    ).toFixed(0)
                  : 0}
                % of total spending
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                General Expenses
              </span>
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                <Coins className="size-5" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold">
                {formatCurrency(stats.generalExpenses, currency || "NGN")}
              </span>
              <span className="text-muted-foreground text-xs mt-2">
                Operations & Overhead
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Daily Burn Rate
              </span>
              <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
                <Flame className="size-5" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold">
                {formatCurrency(stats.dailyBurnRate, currency || "NGN")}
              </span>
              <span className="text-muted-foreground text-xs mt-2">
                Average this period
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Impact Report */}
      <Card>
        <CardContent className="p-6 border-b">
          <h2 className="text-xl font-bold">Profit Impact Report</h2>
        </CardContent>
        <CardContent className="p-8 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">
                Gross Revenue
              </span>
              <span className="text-2xl font-black text-foreground">
                {formatCurrency(profitImpact.grossRevenue, currency || "NGN")}
              </span>
            </div>
            <span className="text-2xl font-bold text-muted-foreground">−</span>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">
                Cost of Goods
              </span>
              <span className="text-2xl font-black text-foreground">
                {formatCurrency(profitImpact.costOfGoods, currency || "NGN")}
              </span>
            </div>
            <span className="text-2xl font-bold text-muted-foreground">−</span>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">
                Total Expenses
              </span>
              <span className="text-2xl font-black text-foreground">
                {formatCurrency(profitImpact.totalExpenses, currency || "NGN")}
              </span>
            </div>
            <span className="text-2xl font-bold text-muted-foreground">=</span>
            <div className="flex flex-col p-4 bg-primary/10 rounded-lg border border-primary/20">
              <span className="text-xs uppercase tracking-wider text-primary font-bold mb-1">
                Net Profit
              </span>
              <span className="text-4xl font-black text-primary">
                {formatCurrency(profitImpact.netProfit, currency || "NGN")}
              </span>
            </div>
          </div>

          <div className="w-full bg-muted h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-slate-400 h-full"
              style={{
                width: `${profitImpact.grossRevenue > 0 ? (profitImpact.costOfGoods / profitImpact.grossRevenue) * 100 : 0}%`,
              }}
            />
            <div
              className="bg-slate-600 h-full"
              style={{
                width: `${profitImpact.grossRevenue > 0 ? (profitImpact.totalExpenses / profitImpact.grossRevenue) * 100 : 0}%`,
              }}
            />
            <div
              className="bg-primary h-full"
              style={{
                width: `${Math.max(0, profitImpact.profitMargin)}%`,
              }}
            />
          </div>

          <div className="flex gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-slate-400" />
              COGS (
              {profitImpact.grossRevenue > 0
                ? (
                    (profitImpact.costOfGoods / profitImpact.grossRevenue) *
                    100
                  ).toFixed(0)
                : 0}
              %)
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-slate-600" />
              Operating Expenses (
              {profitImpact.grossRevenue > 0
                ? (
                    (profitImpact.totalExpenses / profitImpact.grossRevenue) *
                    100
                  ).toFixed(0)
                : 0}
              %)
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-primary" />
              Profit Margin ({profitImpact.profitMargin.toFixed(0)}%)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid for Top Products and Monthly Comparison */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Top 5 Products by Expense */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-bold text-lg mb-6">
              Top 5 Products by Expense
            </h2>
            {topProducts.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No product-linked expenses found
              </p>
            ) : (
              <div className="flex flex-col gap-5">
                {topProducts.map((product, index) => {
                  const percentage =
                    maxProductExpense > 0
                      ? (product.amount / maxProductExpense) * 100
                      : 0;
                  return (
                    <Link
                      key={product.id}
                      href={`/dashboard/admin/expenses/analytics/${product.id}`}
                      className="flex flex-col gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-foreground hover:text-primary transition-colors">
                          {product.name}
                        </span>
                        <span className="font-bold">
                          {formatCurrency(product.amount, currency || "NGN")}{" "}
                          <span className="text-xs text-muted-foreground font-normal ml-1">
                            {expenseTypeConfig[product.primaryType]?.label ||
                              product.primaryType}
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            opacity: 1 - index * 0.15,
                          }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Comparison */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-10">
              <h2 className="font-bold text-lg">Monthly Comparison</h2>
              <div className="flex gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded bg-primary" />
                  Operating
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded bg-slate-300 dark:bg-slate-700" />
                  Marketing
                </div>
              </div>
            </div>

            <div className="relative flex items-end justify-between h-48 px-4 border-b pb-2">
              {monthlyComparison.map((month, index) => {
                const operatingHeight =
                  maxMonthlyValue > 0
                    ? (month.operating / maxMonthlyValue) * 100
                    : 0;
                const marketingHeight =
                  maxMonthlyValue > 0
                    ? (month.marketing / maxMonthlyValue) * 100
                    : 0;
                const isCurrentMonth = index === monthlyComparison.length - 1;

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-3 w-12 relative"
                    onMouseEnter={() => setHoveredMonthIndex(index)}
                    onMouseLeave={() => setHoveredMonthIndex(null)}
                  >
                    <div className="flex items-end gap-1 h-32">
                      <div
                        className="w-4 bg-primary rounded-t-sm transition-all cursor-pointer hover:opacity-80"
                        style={{ height: `${operatingHeight}%` }}
                      />
                      <div
                        className="w-4 bg-slate-300 dark:bg-slate-700 rounded-t-sm transition-all cursor-pointer hover:opacity-80"
                        style={{ height: `${marketingHeight}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs ${
                        isCurrentMonth
                          ? "font-bold text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {month.month}
                    </span>

                    {/* Tooltip */}
                    {hoveredMonthIndex === index && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-lg shadow-lg p-3 w-48 z-10 pointer-events-none">
                        <p className="font-semibold text-sm mb-2">
                          {month.month}
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="size-2 rounded bg-primary" />
                              <span className="text-muted-foreground">
                                Operating
                              </span>
                            </div>
                            <span className="font-semibold">
                              {formatCurrency(month.operating, currency || "NGN")}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="size-2 rounded bg-slate-300 dark:bg-slate-700" />
                              <span className="text-muted-foreground">
                                Marketing
                              </span>
                            </div>
                            <span className="font-semibold">
                              {formatCurrency(month.marketing, currency || "NGN")}
                            </span>
                          </div>
                          <div className="pt-1.5 mt-1.5 border-t border-border">
                            <div className="flex justify-between items-center text-xs font-semibold">
                              <span>Total</span>
                              <span>
                                {formatCurrency(
                                  month.operating + month.marketing,
                                  currency || "NGN"
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Expense Trends Chart */}
        <Card className="xl:col-span-2">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-6">Expense Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyExpenseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value, currency || "NGN")}
                />
                <Legend />
                <Bar dataKey="amount" fill="#3b82f6" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expenses by Type Chart */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-6">Expenses by Type</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={expenseTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseTypeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value, currency || "NGN")}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-6 space-y-3">
              {expenseTypeData.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="size-2 rounded-full"
                      style={{
                        backgroundColor:
                          CHART_COLORS[index % CHART_COLORS.length],
                      }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Bulk Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search descriptions or references..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              {selectedExpenses.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDeleteClick}
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete ({selectedExpenses.size})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="size-4 mr-2" />
                Export
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="size-4 mr-2" />
                    Filter
                    {selectedTypes.size < Object.keys(expenseTypeConfig).length && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                        {selectedTypes.size}
                      </span>
                    )}
                    <ChevronDown className="size-3 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.entries(expenseTypeConfig).map(([type, config]) => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={selectedTypes.has(type)}
                      onCheckedChange={() => handleTypeToggle(type)}
                    >
                      {config.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <div className="flex gap-2 p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllTypes}
                      className="flex-1 h-8"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAllTypes}
                      className="flex-1 h-8"
                    >
                      Clear
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="rounded text-primary focus:ring-primary"
                    checked={
                      paginatedExpenses.length > 0 &&
                      paginatedExpenses.every((e) => selectedExpenses.has(e.id))
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product / Ref</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExpenses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No expenses found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="rounded text-primary focus:ring-primary"
                        checked={selectedExpenses.has(expense.id)}
                        onChange={(e) =>
                          handleSelectExpense(expense.id, e.target.checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(expense.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          expenseTypeConfig[expense.type]?.color ||
                          expenseTypeConfig.other.color
                        }
                      >
                        {expenseTypeConfig[expense.type]?.label ||
                          expense.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium whitespace-nowrap">
                      {expense.product?.name || "General Expense"}
                    </TableCell>
                    <TableCell className="text-sm font-bold whitespace-nowrap">
                      {formatCurrency(expense.amount, currency || "NGN")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {expense.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {expense?.product?.id && (
                          <Link
                            target="_blank"
                            href={`/dashboard/admin/expenses/analytics/${expense.product.id}`}
                          >
                            <Button size="sm">
                              <Eye className="size-4 mr-2" />
                              Details
                            </Button>
                          </Link>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(expense)}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(expense)}
                        >
                          <Trash2 className="size-4 text-rose-500" />
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
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredExpenses.length)} of{" "}
            {filteredExpenses.length} expenses
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Modals */}
      <AddExpenseModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        products={products}
      />
      {selectedExpense && (
        <>
          <EditExpenseModal
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            expense={selectedExpense}
            products={products}
          />
          <DeleteExpenseDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            expense={selectedExpense}
          />
        </>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Expenses</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedExpenses.size} expense
              {selectedExpenses.size > 1 ? "s" : ""}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete {selectedExpenses.size} Expense
              {selectedExpenses.size > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

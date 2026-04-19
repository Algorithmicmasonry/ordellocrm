"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PeriodFilter, DateRangePicker } from "@/app/dashboard/admin/_components";
import type { TimePeriod } from "@/lib/types";
import {
  exportToCSV,
  generateFilename,
  formatCurrencyForExport,
  formatDateForExport,
} from "@/lib/export-utils";

interface ProductAnalyticsClientProps {
  product: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    cost: number;
  };
  stats: {
    totalRevenue: number;
    totalCOGS: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    totalUnitsSold: number;
    averageRevenuePerUnit: number;
    averageCostPerUnit: number;
  };
  expensesByType: Record<string, number>;
  monthlyBreakdown: Array<{
    month: string;
    revenue: number;
    cogs: number;
    expenses: number;
    profit: number;
    unitsSold: number;
  }>;
  maxMonthlyValue: number;
  recentExpenses: Array<{
    id: string;
    type: string;
    amount: number;
    description: string | null;
    date: Date;
  }>;
  totalExpenseCount: number;
  currentPeriod: TimePeriod;
}

const expenseTypeConfig: Record<string, { label: string; color: string }> = {
  ad_spend: { label: "Ad Spend", color: "#3b82f6" },
  delivery: { label: "Delivery", color: "#10b981" },
  shipping: { label: "Shipping", color: "#f59e0b" },
  clearing: { label: "Clearing", color: "#8b5cf6" },
  other: { label: "Other", color: "#6b7280" },
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#6b7280"];

export default function ProductAnalyticsClient({
  product,
  stats,
  expensesByType,
  monthlyBreakdown,
  recentExpenses,
  totalExpenseCount,
  currentPeriod,
}: ProductAnalyticsClientProps) {
  const handleExport = () => {
    try {
      // Create comprehensive product analytics report
      const headers = ["Metric", "Value"];
      const rows = [
        ["PRODUCT INFORMATION", ""],
        ["Product Name", product.name],
        ["Description", product.description || "N/A"],
        ["Price", formatCurrencyForExport(product.price)],
        ["Cost", formatCurrencyForExport(product.cost)],
        ["Period", currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)],
        ["", ""], // Empty row for spacing
        ["FINANCIAL SUMMARY", ""],
        ["Total Revenue", formatCurrencyForExport(stats.totalRevenue)],
        ["Total COGS", formatCurrencyForExport(stats.totalCOGS)],
        ["Total Expenses", formatCurrencyForExport(stats.totalExpenses)],
        ["Net Profit", formatCurrencyForExport(stats.netProfit)],
        ["Profit Margin", `${stats.profitMargin.toFixed(2)}%`],
        ["", ""], // Empty row for spacing
        ["SALES METRICS", ""],
        ["Total Units Sold", stats.totalUnitsSold.toString()],
        [
          "Average Revenue Per Unit",
          formatCurrencyForExport(stats.averageRevenuePerUnit),
        ],
        [
          "Average Cost Per Unit",
          formatCurrencyForExport(stats.averageCostPerUnit),
        ],
        ["", ""], // Empty row for spacing
        ["EXPENSES BY TYPE", ""],
        ["Type", "Amount", "Percentage"],
        ...Object.entries(expensesByType).map(([type, amount]) => [
          expenseTypeConfig[type]?.label || type,
          formatCurrencyForExport(amount),
          `${((amount / stats.totalExpenses) * 100).toFixed(1)}%`,
        ]),
        ["", ""], // Empty row for spacing
        ["MONTHLY BREAKDOWN", ""],
        [
          "Month",
          "Revenue",
          "COGS",
          "Expenses",
          "Profit",
          "Units Sold",
          "Profit Margin",
        ],
        ...monthlyBreakdown.map((month) => [
          month.month,
          formatCurrencyForExport(month.revenue),
          formatCurrencyForExport(month.cogs),
          formatCurrencyForExport(month.expenses),
          formatCurrencyForExport(month.profit),
          month.unitsSold.toString(),
          month.revenue > 0
            ? `${((month.profit / month.revenue) * 100).toFixed(1)}%`
            : "0%",
        ]),
        ["", ""], // Empty row for spacing
        ["RECENT EXPENSES", ""],
        ["Date", "Type", "Amount", "Description"],
        ...recentExpenses.map((expense) => [
          formatDateForExport(expense.date),
          expenseTypeConfig[expense.type]?.label || expense.type,
          formatCurrencyForExport(expense.amount),
          expense.description || "",
        ]),
      ];

      const filename = generateFilename(`product_analytics_${product.name.replace(/\s+/g, "_")}`);
      exportToCSV(headers, rows, filename);

      toast.success("Product analytics report exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };

  // Prepare pie chart data
  const pieChartData = Object.entries(expensesByType).map(([type, amount]) => ({
    name: expenseTypeConfig[type]?.label || type,
    value: amount,
    percentage: ((amount / stats.totalExpenses) * 100).toFixed(1),
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/admin/expenses">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl text-primary font-black tracking-tight">
                {product.name}
              </h1>
              <Badge variant="outline" className="text-xs">
                Product Analytics
              </Badge>
            </div>
            {product.description && (
              <p className="text-muted-foreground mt-1">
                {product.description}
              </p>
            )}
          </div>
        </div>
        <Button onClick={handleExport}>
          <Download className="size-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Period Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <PeriodFilter currentPeriod={currentPeriod} />
        <DateRangePicker />
      </div>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Revenue
              </span>
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <DollarSign className="size-5" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold">
                ₦{Math.round(stats.totalRevenue).toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground mt-2">
                {stats.totalUnitsSold} units sold
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Expenses
              </span>
              <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
                <Package className="size-5" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold">
                ₦{Math.round(stats.totalExpenses).toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground mt-2">
                {totalExpenseCount} expense records
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Net Profit
              </span>
              <div
                className={`p-2 rounded-lg ${
                  stats.netProfit >= 0
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-rose-500/10 text-rose-500"
                }`}
              >
                {stats.netProfit >= 0 ? (
                  <TrendingUp className="size-5" />
                ) : (
                  <TrendingDown className="size-5" />
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <span
                className={`text-3xl font-extrabold ${
                  stats.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                ₦{Math.round(stats.netProfit).toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground mt-2">
                {stats.profitMargin.toFixed(1)}% margin
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Avg. Revenue/Unit
              </span>
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <ShoppingCart className="size-5" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold">
                ₦{Math.round(stats.averageRevenuePerUnit).toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground mt-2">
                Cost: ₦{Math.round(stats.averageCostPerUnit).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Breakdown */}
      <Card>
        <CardContent className="p-6 border-b">
          <h2 className="text-xl font-bold">Profit Breakdown</h2>
        </CardContent>
        <CardContent className="p-8 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">
                Revenue
              </span>
              <span className="text-2xl font-black text-foreground">
                ₦{Math.round(stats.totalRevenue).toLocaleString()}
              </span>
            </div>
            <span className="text-2xl font-bold text-muted-foreground">−</span>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">
                COGS
              </span>
              <span className="text-2xl font-black text-foreground">
                ₦{Math.round(stats.totalCOGS).toLocaleString()}
              </span>
            </div>
            <span className="text-2xl font-bold text-muted-foreground">−</span>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">
                Expenses
              </span>
              <span className="text-2xl font-black text-foreground">
                ₦{Math.round(stats.totalExpenses).toLocaleString()}
              </span>
            </div>
            <span className="text-2xl font-bold text-muted-foreground">=</span>
            <div
              className={`flex flex-col p-4 rounded-lg border ${
                stats.netProfit >= 0
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-rose-500/10 border-rose-500/20"
              }`}
            >
              <span
                className={`text-xs uppercase tracking-wider font-bold mb-1 ${
                  stats.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                Net Profit
              </span>
              <span
                className={`text-4xl font-black ${
                  stats.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                ₦{Math.round(stats.netProfit).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="w-full bg-muted h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-slate-400 h-full"
              style={{
                width: `${(stats.totalCOGS / stats.totalRevenue) * 100}%`,
              }}
            />
            <div
              className="bg-slate-600 h-full"
              style={{
                width: `${(stats.totalExpenses / stats.totalRevenue) * 100}%`,
              }}
            />
            <div
              className={stats.netProfit >= 0 ? "bg-emerald-500 h-full" : ""}
              style={{
                width: `${Math.max(0, stats.profitMargin)}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Monthly Profit Trend */}
        <Card className="xl:col-span-2">
          <CardContent className="p-6">
            <h2 className="font-bold text-lg mb-6">6-Month Profit Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => `₦${value.toLocaleString()}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="cogs"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="COGS"
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Expenses"
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Profit"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Type Distribution */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-bold text-lg mb-6">Expense Distribution</h2>
            {pieChartData.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No expenses recorded
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) =>
                        `₦${value.toLocaleString()}`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-6 space-y-3">
                  {pieChartData.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="size-2 rounded-full"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <span className="text-muted-foreground">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-semibold">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses Table */}
      <Card>
        <CardContent className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">Recent Expenses</h2>
            <Badge variant="secondary">{totalExpenseCount} total</Badge>
          </div>
        </CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentExpenses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No expenses found
                  </TableCell>
                </TableRow>
              ) : (
                recentExpenses.map((expense) => (
                  <TableRow key={expense.id}>
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
                        style={{
                          backgroundColor:
                            expenseTypeConfig[expense.type]?.color + "20" ||
                            "#6b728020",
                          color:
                            expenseTypeConfig[expense.type]?.color || "#6b7280",
                          borderColor:
                            expenseTypeConfig[expense.type]?.color || "#6b7280",
                        }}
                      >
                        {expenseTypeConfig[expense.type]?.label ||
                          expense.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-bold whitespace-nowrap">
                      ₦{expense.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {expense.description || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

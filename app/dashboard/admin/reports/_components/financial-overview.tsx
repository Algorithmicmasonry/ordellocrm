"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimePeriod } from "@/lib/types";
import type { Currency } from "@prisma/client";
import { DollarSign, Download, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSearchParams } from "next/navigation";
import {
  exportToCSV,
  generateFilename,
  formatCurrencyForExport,
} from "@/lib/export-utils";
import toast from "react-hot-toast";

interface FinancialOverviewProps {
  data: {
    kpis: {
      revenue: { value: number; change: number };
      grossProfit: { value: number; change: number };
      netProfit: { value: number; change: number };
      burnRate: { value: number; change: number };
    };
    chartData: Array<{
      label: string;
      revenue: number;
      expenses: number;
    }>;
    expensesByCategory: Array<{
      category: string;
      total: number;
    }>;
  };
  period: TimePeriod;
  currency?: Currency;
}

const EXPENSE_COLORS = {
  ad_spend: "#137fec",
  delivery: "#38bdf8",
  shipping: "#94a3b8",
  clearing: "#cbd5e1",
  other: "#e2e8f0",
};

const EXPENSE_LABELS = {
  ad_spend: "Marketing",
  delivery: "Delivery",
  shipping: "Shipping",
  clearing: "Clearing",
  other: "Other",
};

export function FinancialOverview({
  data,
  period,
  currency = "NGN", // Add default value
}: FinancialOverviewProps) {
  const { kpis, chartData, expensesByCategory } = data;
  console.log("These are the kpis:", kpis);

  const searchParams = useSearchParams();

  // Check if using custom date range
  const hasCustomDateRange =
    searchParams.get("startDate") && searchParams.get("endDate");

  const handleExportCSV = () => {
    try {
      const headers = ["Metric", "Current Period", "Change"];
      const rows = [
        [
          "Revenue",
          formatCurrencyForExport(kpis.revenue.value, currency),
          `${kpis.revenue.change.toFixed(1)}%`,
        ],
        [
          "Gross Profit",
          formatCurrencyForExport(kpis.grossProfit.value, currency),
          `${kpis.grossProfit.change.toFixed(1)}%`,
        ],
        [
          "Net Profit",
          formatCurrencyForExport(kpis.netProfit.value, currency),
          `${kpis.netProfit.change.toFixed(1)}%`,
        ],
        [
          "Burn Rate",
          formatCurrencyForExport(kpis.burnRate.value, currency),
          `${kpis.burnRate.change.toFixed(1)}%`,
        ],
        ["", "", ""],
        ["Expense Categories", "", ""],
        ...expensesByCategory.map((cat) => [
          cat.category,
          formatCurrencyForExport(cat.total, currency),
          "",
        ]),
      ];
      const currencySuffix = currency ? `_${currency}` : "";
      const filename = generateFilename(`financial_overview${currencySuffix}`);
      exportToCSV(headers, rows, filename);
      toast.success("Financial overview exported!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };

  // Prepare donut chart data (top 5 for visual clarity)
  const donutData = expensesByCategory.slice(0, 5).map((item) => ({
    name:
      EXPENSE_LABELS[item.category as keyof typeof EXPENSE_LABELS] ||
      item.category,
    value: item.total,
    color:
      EXPENSE_COLORS[item.category as keyof typeof EXPENSE_COLORS] ||
      EXPENSE_COLORS.other,
  }));

  // Prepare ALL expense categories for the list
  const allExpensesData = expensesByCategory.map((item) => ({
    name:
      EXPENSE_LABELS[item.category as keyof typeof EXPENSE_LABELS] ||
      item.category,
    value: item.total,
    color:
      EXPENSE_COLORS[item.category as keyof typeof EXPENSE_COLORS] ||
      EXPENSE_COLORS.other,
  }));

  // Use actual total expenses from KPI data
  const totalExpenses = kpis.burnRate.value;

  // Get period label for chart title
  const getPeriodLabel = () => {
    if (hasCustomDateRange) {
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return `Custom range: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
      }
    }

    switch (period) {
      case "today":
        return "Hourly tracking for today";
      case "week":
        return "Daily tracking for this week";
      case "month":
        return "Daily tracking for this month";
      case "year":
        return "Monthly tracking for this year";
      default:
        return "Performance tracking";
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={handleExportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Revenue
              </p>
              {kpis.revenue.change >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <p className="text-3xl font-bold tracking-tight mb-2">
              {formatCurrency(kpis.revenue.value, currency)}
            </p>
            <div className="flex items-center gap-1">
              <span
                className={`text-sm font-semibold ${
                  kpis.revenue.change >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {kpis.revenue.change >= 0 ? "+" : ""}
                {kpis.revenue.change.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">
                vs last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Gross Profit
              </p>
              {kpis.grossProfit.change >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <p className="text-3xl font-bold tracking-tight mb-2">
              {formatCurrency(kpis.grossProfit.value, currency)}
            </p>
            <div className="flex items-center gap-1">
              <span
                className={`text-sm font-semibold ${
                  kpis.grossProfit.change >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {kpis.grossProfit.change >= 0 ? "+" : ""}
                {kpis.grossProfit.change.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">
                vs last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Net Profit
              </p>
              {kpis.netProfit.change >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <p className="text-3xl font-bold tracking-tight mb-2">
              {formatCurrency(kpis.netProfit.value, currency)}
            </p>
            <div className="flex items-center gap-1">
              <span
                className={`text-sm font-semibold ${
                  kpis.netProfit.change >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {kpis.netProfit.change >= 0 ? "+" : ""}
                {kpis.netProfit.change.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">
                vs last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Total Expenses
              </p>
              <DollarSign className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold tracking-tight mb-2">
              {formatCurrency(kpis.burnRate.value, currency)}
            </p>
            <div className="flex items-center gap-1">
              <span
                className={`text-sm font-semibold ${
                  kpis.burnRate.change >= 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {kpis.burnRate.change >= 0 ? "+" : ""}
                {kpis.burnRate.change.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">
                vs last period
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Revenue vs. Expenses</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {getPeriodLabel()}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary"></span>
                <span className="text-xs font-medium text-muted-foreground">
                  Revenue
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                <span className="text-xs font-medium text-muted-foreground">
                  Expenses
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#137fec" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#137fec" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7edf3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e7edf3",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => formatCurrency(value, currency)}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#137fec"
                strokeWidth={3}
                fill="url(#colorRevenue)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                strokeWidth={3}
                fill="#fef2f2"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Expense Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {expensesByCategory.length > 0 ? (
            <div className="flex items-center justify-between">
              <div className="relative w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-xl font-bold">
                    {formatCurrency(totalExpenses, currency)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 flex-1 ml-12 max-h-96 overflow-y-auto">
                {allExpensesData.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium text-muted-foreground">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        {formatCurrency(item.value, currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {((item.value / totalExpenses) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                No expenses recorded for this period
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimePeriod } from "@/lib/types";
import { ArrowDown, ArrowUp, Download, TrendingUp } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { exportToPDF, generateFilename } from "@/lib/export-utils";
import toast from "react-hot-toast";

interface ProfitLossStatementProps {
  data: {
    revenue: {
      current: number;
      previous: number;
      change: number;
    };
    cogs: {
      current: number;
      previous: number;
      change: number;
    };
    grossProfit: {
      current: number;
      previous: number;
      change: number;
    };
    expenses: Array<{
      type: string;
      current: number;
      previous: number;
      change: number;
    }>;
    totalExpenses: {
      current: number;
      previous: number;
      change: number;
    };
    netProfit: {
      current: number;
      previous: number;
      change: number;
    };
    margins: {
      gross: number;
      net: number;
    };
  };
  period: TimePeriod;
  currency?: import("@prisma/client").Currency;
}

const EXPENSE_LABELS: Record<string, string> = {
  ad_spend: "Marketing & Ad Spend",
  delivery: "Logistics & Delivery",
  shipping: "Shipping Costs",
  clearing: "Clearing & Customs",
  waybill: "Waybill Costs",
  payroll: "Salaries & Payroll",
  other: "Other Expenses",
};

export function ProfitLossStatement({
  data,
  period,
  currency,
}: ProfitLossStatementProps) {
  const {
    revenue,
    cogs,
    grossProfit,
    expenses,
    totalExpenses,
    netProfit,
    margins,
  } = data;
  const searchParams = useSearchParams();

  // Check if using custom date range
  const hasCustomDateRange =
    searchParams.get("startDate") && searchParams.get("endDate");

  const getChangeColor = (change: number) => {
    if (change > 0)
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (change < 0)
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="w-3 h-3" />;
    if (change < 0) return <ArrowDown className="w-3 h-3" />;
    return null;
  };

  const handleExportPDF = () => {
    try {
      const dateRange = hasCustomDateRange
        ? `${searchParams.get("startDate")} to ${searchParams.get("endDate")}`
        : period.charAt(0).toUpperCase() + period.slice(1);

      // Prepare table data
      const headers = [
        "Account Description",
        "Current Period",
        "Previous Period",
        "% Change",
      ];
      const rows = [
        ["REVENUE", "", "", ""],
        [
          "  Delivered Orders",
          formatCurrency(revenue.current, currency),
          formatCurrency(revenue.previous, currency),
          `${revenue.change > 0 ? "+" : ""}${revenue.change.toFixed(1)}%`,
        ],
        ["", "", "", ""],
        ["COST OF GOODS SOLD", "", "", ""],
        [
          "  Product Costs",
          formatCurrency(cogs.current, currency),
          formatCurrency(cogs.previous, currency),
          `${cogs.change > 0 ? "+" : ""}${cogs.change.toFixed(1)}%`,
        ],
        ["", "", "", ""],
        [
          "GROSS PROFIT",
          formatCurrency(grossProfit.current, currency),
          formatCurrency(grossProfit.previous, currency),
          `${grossProfit.change > 0 ? "+" : ""}${grossProfit.change.toFixed(1)}%`,
        ],
        ["", "", "", ""],
        ["OPERATING EXPENSES", "", "", ""],
        ...expenses.map((exp) => [
          `  ${EXPENSE_LABELS[exp.type] || exp.type}`,
          formatCurrency(exp.current, currency),
          formatCurrency(exp.previous, currency),
          `${exp.change > 0 ? "+" : ""}${exp.change.toFixed(1)}%`,
        ]),
        [
          "Total Operating Expenses",
          formatCurrency(totalExpenses.current, currency),
          formatCurrency(totalExpenses.previous, currency),
          `${totalExpenses.change > 0 ? "+" : ""}${totalExpenses.change.toFixed(1)}%`,
        ],
        ["", "", "", ""],
        [
          "NET PROFIT",
          formatCurrency(netProfit.current, currency),
          formatCurrency(netProfit.previous, currency),
          `${netProfit.change > 0 ? "+" : ""}${netProfit.change.toFixed(1)}%`,
        ],
        ["", "", "", ""],
        ["PROFIT MARGINS", "", "", ""],
        ["  Gross Margin", `${margins.gross.toFixed(2)}%`, "", ""],
        ["  Net Margin", `${margins.net.toFixed(2)}%`, "", ""],
      ];

      const filename = generateFilename("profit_loss_statement");
      exportToPDF("Profit & Loss Statement", headers, rows, filename, {
        orientation: "portrait",
        subtitle: `Period: ${dateRange}`,
        metadata: [
          { label: "Generated", value: new Date().toLocaleDateString() },
          { label: "Gross Margin", value: `${margins.gross.toFixed(2)}%` },
          { label: "Net Margin", value: `${margins.net.toFixed(2)}%` },
        ],
      });

      toast.success("Profit & Loss Statement exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF");
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={handleExportPDF}>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Financial Statement Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b">
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Account Description
                  </th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                    Current Period
                  </th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                    Previous Period
                  </th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">
                    % Change
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* Revenue Section */}
                <tr className="bg-primary/5">
                  <td
                    className="p-4 font-bold text-sm tracking-wide"
                    colSpan={4}
                  >
                    REVENUE
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 pl-8 text-sm font-medium">
                    Delivered Orders
                  </td>
                  <td className="p-4 text-right font-bold">
                    {formatCurrency(revenue.current, currency)}
                  </td>
                  <td className="p-4 text-right text-muted-foreground">
                    {formatCurrency(revenue.previous, currency)}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${getChangeColor(
                        revenue.change,
                      )}`}
                    >
                      {getChangeIcon(revenue.change)}
                      {Math.abs(revenue.change).toFixed(1)}%
                    </span>
                  </td>
                </tr>

                {/* COGS Section */}
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <td
                    className="p-4 font-bold text-sm tracking-wide"
                    colSpan={4}
                  >
                    COST OF GOODS SOLD (COGS)
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 pl-8 text-sm font-medium text-red-600 dark:text-red-400">
                    Product Sourcing Costs
                  </td>
                  <td className="p-4 text-right font-bold">
                    ({formatCurrency(cogs.current, currency)})
                  </td>
                  <td className="p-4 text-right text-muted-foreground">
                    ({formatCurrency(cogs.previous, currency)})
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${getChangeColor(
                        cogs.change,
                      )}`}
                    >
                      {getChangeIcon(cogs.change)}
                      {Math.abs(cogs.change).toFixed(1)}%
                    </span>
                  </td>
                </tr>

                {/* Gross Profit */}
                <tr className="bg-primary/10 border-t-2 border-primary/20 font-bold">
                  <td className="p-4 text-sm font-bold uppercase">
                    Gross Profit
                  </td>
                  <td className="p-4 text-right text-lg font-bold">
                    {formatCurrency(grossProfit.current, currency)}
                  </td>
                  <td className="p-4 text-right text-muted-foreground text-lg">
                    {formatCurrency(grossProfit.previous, currency)}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${getChangeColor(
                        grossProfit.change,
                      )}`}
                    >
                      {getChangeIcon(grossProfit.change)}
                      {Math.abs(grossProfit.change).toFixed(1)}%
                    </span>
                  </td>
                </tr>

                {/* Operating Expenses */}
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <td
                    className="p-4 font-bold text-sm tracking-wide"
                    colSpan={4}
                  >
                    OPERATING EXPENSES
                  </td>
                </tr>
                {expenses
                  .filter((exp) => exp.current > 0 || exp.previous > 0)
                  .map((expense) => (
                    <tr
                      key={expense.type}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-4 pl-8 text-sm font-medium">
                        {EXPENSE_LABELS[expense.type] || expense.type}
                      </td>
                      <td className="p-4 text-right font-bold">
                        ({formatCurrency(expense.current, currency)})
                      </td>
                      <td className="p-4 text-right text-muted-foreground">
                        ({formatCurrency(expense.previous, currency)})
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${getChangeColor(
                            expense.change,
                          )}`}
                        >
                          {getChangeIcon(expense.change)}
                          {Math.abs(expense.change).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}

                {/* Net Profit */}
                <tr className="bg-primary dark:bg-primary/90 text-primary-foreground font-bold border-t-2 border-primary">
                  <td className="p-6 text-base font-bold uppercase tracking-widest">
                    Net Profit
                  </td>
                  <td className="p-6 text-right text-2xl font-bold">
                    {formatCurrency(netProfit.current, currency)}
                  </td>
                  <td className="p-6 text-right opacity-80 text-2xl">
                    {formatCurrency(netProfit.previous, currency)}
                  </td>
                  <td className="p-6 text-center">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-white text-primary dark:bg-slate-900">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      {netProfit.change >= 0 ? "+" : ""}
                      {netProfit.change.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Gross Margin
            </p>
          </CardHeader>
          <CardContent>
            <h4 className="text-3xl font-bold mb-2">
              {margins.gross.toFixed(1)}%
            </h4>
            <p className="text-xs text-muted-foreground">
              Revenue minus cost of goods sold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Net Margin
            </p>
          </CardHeader>
          <CardContent>
            <h4 className="text-3xl font-bold mb-2">
              {margins.net.toFixed(1)}%
            </h4>
            <p className="text-xs text-muted-foreground">
              Net profit as percentage of revenue
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

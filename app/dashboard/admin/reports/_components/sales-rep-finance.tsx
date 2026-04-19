"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currency";
import type { TimePeriod } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import { Award, DollarSign, Download, Filter, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  exportToCSV,
  generateFilename,
  formatCurrencyForExport,
} from "@/lib/export-utils";
import toast from "react-hot-toast";

interface SalesRepFinanceProps {
  data: {
    teamMetrics: {
      teamROI: number;
      avgCPA: number;
      topPerformer: {
        name: string;
        revenue: number;
      } | null;
    };
    repPerformance: Array<{
      repId: string;
      repName: string;
      repEmail: string;
      revenue: number;
      cost: number;
      expenses: number;
      deliveredCount: number;
      netProfit: number;
      cpa: number;
      roi: number;
    }>;
  };
  period: TimePeriod;
  currency?: import("@prisma/client").Currency;
}

export function SalesRepFinance({
  data,
  period,
  currency = "NGN",
}: SalesRepFinanceProps) {
  const { teamMetrics, repPerformance } = data;
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Check if using custom date range
  const hasCustomDateRange =
    searchParams.get("startDate") && searchParams.get("endDate");

  const handleExportPayout = () => {
    try {
      const headers = [
        "Sales Rep Name",
        "Email",
        "Revenue",
        "Cost",
        "Expenses",
        "Delivered Orders",
        "Net Profit",
        "CPA",
        "ROI %",
      ];
      const rows = repPerformance.map((rep) => [
        rep.repName,
        rep.repEmail,
        formatCurrencyForExport(rep.revenue, currency),
        formatCurrencyForExport(rep.cost, currency),
        formatCurrencyForExport(rep.expenses, currency),
        rep.deliveredCount.toString(),
        formatCurrencyForExport(rep.netProfit, currency),
        formatCurrencyForExport(rep.cpa, currency),
        rep.roi.toFixed(1),
      ]);
      const currencySuffix = currency ? `_${currency}` : "";
      const filename = generateFilename(`sales_rep_payout${currencySuffix}`);
      exportToCSV(headers, rows, filename);
      toast.success("Sales rep payout report exported!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };

  // Filter performance data based on search
  const filteredPerformance = repPerformance.filter((rep) =>
    rep.repName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Pagination
  const totalPages = Math.ceil(filteredPerformance.length / itemsPerPage);
  const paginatedPerformance = filteredPerformance.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Prepare chart data (top 10 performers)
  const chartData = repPerformance.slice(0, 10).map((rep) => ({
    name: rep.repName.split(" ")[0], // First name only for chart
    revenue: rep.revenue,
    costs: rep.cost + rep.expenses,
  }));

  // Get ROI badge color
  const getROIBadgeColor = (roi: number) => {
    if (roi >= 400)
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (roi >= 250)
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  };

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={handleExportPayout}>
          <Download className="w-4 h-4 mr-2" />
          Payout Report
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Total Team ROI
              </p>
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold tracking-tight mb-2">
              {teamMetrics.teamROI.toFixed(0)}%
            </p>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">
                Net Profit / (COGS + Expenses)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Avg CPA
              </p>
              <DollarSign className="w-5 h-5 text-warning" />
            </div>
            <p className="text-3xl font-bold tracking-tight mb-2">
              {formatCurrency(teamMetrics.avgCPA, currency)}
            </p>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground italic">
                SUM(Expenses) / Delivered Orders
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Top Performer
              </p>
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-xl font-bold tracking-tight mb-2">
              {teamMetrics.topPerformer?.name || "N/A"}
            </p>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-green-600">
                {formatCurrency(
                  teamMetrics.topPerformer?.revenue || 0,
                  currency,
                )}
              </span>
              <span className="text-xs text-muted-foreground">Net Revenue</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs Direct Costs Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Revenue vs. Direct Costs</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Comparing Order Revenue (Delivered) against COGS + Product
                Expenses
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary"></span>
                <span className="text-xs font-medium text-muted-foreground">
                  Net Revenue
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                <span className="text-xs font-medium text-muted-foreground">
                  COGS + Expenses
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7edf3" />
              <XAxis
                dataKey="name"
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
              <Bar dataKey="revenue" fill="#137fec" radius={[4, 4, 0, 0]} />
              <Bar dataKey="costs" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Breakdown Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Performance Breakdown</CardTitle>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">
                Metrics aligned with Prisma Schema (Orders & Expenses)
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search Rep..."
                className="pl-8 pr-3 py-1.5 text-xs max-w-[200px]"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Sales Rep Name
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    Delivered
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                    Net Profit
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                    CPA
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    ROI %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {paginatedPerformance.length > 0 ? (
                  paginatedPerformance.map((rep) => (
                    <tr
                      key={rep.repId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-primary flex items-center justify-center font-bold text-xs">
                            {getInitials(rep.repName)}
                          </div>
                          <span className="font-semibold">{rep.repName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {formatCurrency(rep.revenue, currency)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {rep.deliveredCount}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-semibold ${
                          rep.netProfit >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {rep.netProfit >= 0 ? "+" : ""}
                        {formatCurrency(rep.netProfit, currency)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {formatCurrency(rep.cpa, currency)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`${getROIBadgeColor(
                            rep.roi,
                          )} px-2 py-1 rounded text-[10px] font-bold`}
                        >
                          {rep.roi.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-muted-foreground"
                    >
                      No sales reps found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer with Pagination */}
          {filteredPerformance.length > 0 && (
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <p className="text-xs text-muted-foreground font-medium italic">
                Calculated using live Prisma schema relationships: Order →
                OrderItem (COGS) | Expense → Product.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ),
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

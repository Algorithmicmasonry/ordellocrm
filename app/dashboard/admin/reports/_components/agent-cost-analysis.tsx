"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, parseCurrency } from "@/lib/currency";
import type { TimePeriod } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import {
  AlertTriangle,
  Download,
  Eye,
  Package,
  TrendingDown,
  TrendingUp,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
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

interface AgentCostAnalysisProps {
  data: {
    kpis: {
      totalDeliveryCosts: {
        value: number;
        change: number;
      };
      totalOrdersDelivered: {
        value: number;
      };
      totalStockValue: {
        value: number;
        units: number;
      };
      stockLoss: {
        value: number;
        percentage: number;
        breakdown: {
          defective: number;
          missing: number;
        };
      };
    };
    agentPerformance: Array<{
      agentId: string;
      agentName: string;
      location: string;
      totalDeliveries: number;
      successRate: number;
      stockValue: number;
      profitContribution: number;
      totalStockIssues: number;
      totalStockIssuesValue: number;
      defectiveCount: number;
      missingCount: number;
    }>;
  };
  period: TimePeriod;
  currency?: import("@prisma/client").Currency;
}

export function AgentCostAnalysis({
  data,
  period,
  currency,
}: AgentCostAnalysisProps) {
  const { kpis, agentPerformance } = data;
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Check if using custom date range
  const hasCustomDateRange =
    searchParams.get("startDate") && searchParams.get("endDate");

  // Pagination
  const totalPages = Math.ceil(agentPerformance.length / itemsPerPage);
  const paginatedPerformance = agentPerformance.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Prepare chart data (top 8 agents by delivery count)
  const topAgentsByDeliveries = agentPerformance.slice(0, 8).map((agent) => ({
    name: agent.agentName.split(" ")[0], // First name only
    deliveries: agent.totalDeliveries,
  }));

  // Prepare chart data for agents with most stock issues
  const agentsWithStockIssues = [...agentPerformance]
    .sort((a, b) => b.totalStockIssues - a.totalStockIssues)
    .slice(0, 8)
    .map((agent) => ({
      name: agent.agentName.split(" ")[0],
      defective: agent.defectiveCount,
      missing: agent.missingCount,
    }));

  // Prepare stock loss donut data
  const stockLossData = [
    {
      name: "Defective Stock",
      value: kpis.stockLoss.breakdown.defective,
      color: "#e73908",
    },
    {
      name: "Missing Units",
      value: kpis.stockLoss.breakdown.missing,
      color: "#f59e0b",
    },
  ];

  // Get success rate color
  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return "bg-green-600";
    if (rate >= 75) return "bg-primary";
    if (rate >= 60) return "bg-warning";
    return "bg-red-600";
  };

  const getSuccessRateTextColor = (rate: number) => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 75) return "text-primary";
    if (rate >= 60) return "text-warning";
    return "text-red-600";
  };

  const handleExportCSV = () => {
    try {
      const dateRange = hasCustomDateRange
        ? `${searchParams.get("startDate")} to ${searchParams.get("endDate")}`
        : period.charAt(0).toUpperCase() + period.slice(1);

      // Prepare agent performance data
      const headers = [
        "Agent Name",
        "Location",
        "Total Deliveries",
        "Success Rate",
        "Stock Value",
        "Profit Contribution",
        "Total Stock Issues",
        "Stock Issues Value",
        "Defective Count",
        "Missing Count",
      ];

      const rows = agentPerformance.map((agent) => [
        agent.agentName,
        agent.location,
        agent.totalDeliveries.toString(),
        `${agent.successRate.toFixed(1)}%`,
        formatCurrencyForExport(agent.stockValue, currency),
        formatCurrencyForExport(agent.profitContribution, currency),
        agent.totalStockIssues.toString(),
        formatCurrencyForExport(agent.totalStockIssuesValue, currency),
        agent.defectiveCount.toString(),
        agent.missingCount.toString(),
      ]);

      const filename = generateFilename("agent_cost_analysis");
      exportToCSV(headers, rows, filename);

      toast.success(`Exported ${agentPerformance.length} agents successfully!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export agent cost analysis");
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={handleExportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Agent Delivery Costs
              </p>
              <div className="bg-primary/10 p-1.5 rounded-lg">
                <Truck className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight mb-2">
              {formatCurrency(kpis.totalDeliveryCosts.value, currency)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {kpis.totalDeliveryCosts.change >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-600" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600" />
              )}
              <span
                className={`text-xs font-bold ${
                  kpis.totalDeliveryCosts.change >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {kpis.totalDeliveryCosts.change >= 0 ? "+" : ""}
                {kpis.totalDeliveryCosts.change.toFixed(1)}%
              </span>
              <span className="text-[10px] text-muted-foreground">
                vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Orders Delivered
              </p>
              <div className="bg-green-600/10 p-1.5 rounded-lg">
                <Package className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight mb-2">
              {kpis.totalOrdersDelivered.value.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] text-muted-foreground">
                by agents in this period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Agent Stock Value
              </p>
              <div className="bg-warning/10 p-1.5 rounded-lg">
                <Package className="w-5 h-5 text-warning" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight mb-2">
              {formatCurrency(kpis.totalStockValue.value, currency)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-bold text-muted-foreground">
                {kpis.totalStockValue.units.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground">
                units in hand
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Defective/Lost Stock Loss
              </p>
              <div className="bg-red-600/10 p-1.5 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight mb-2">
              {formatCurrency(kpis.stockLoss.value, currency)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-bold text-red-600">
                {kpis.stockLoss.percentage.toFixed(1)}%
              </span>
              <span className="text-[10px] text-muted-foreground">
                of total stock value
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Agents by Deliveries Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Agents by Deliveries</CardTitle>
            <p className="text-sm text-muted-foreground">
              Agents with most completed deliveries
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topAgentsByDeliveries}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e7edf3",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => `${value} deliveries`}
                />
                <Bar
                  dataKey="deliveries"
                  fill="#137fec"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Agents with Most Stock Issues Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Agents with Most Stock Issues</CardTitle>
            <p className="text-sm text-muted-foreground">
              Defective and missing stock by agent
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={agentsWithStockIssues}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e7edf3",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="defective"
                  name="Defective"
                  fill="#e73908"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="missing"
                  name="Missing"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Stock Loss Categories */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-bold">Stock Loss Categories</h3>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-40 h-40 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockLossData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stockLossData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">
                  {formatCurrency(kpis.stockLoss.value / 1000, currency)}
                  {kpis.stockLoss.value >= 1000 ? "k" : ""}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Total Loss
                </span>
              </div>
            </div>

            <div className="w-full space-y-3">
              {stockLossData.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-bold">
                    {formatCurrency(item.value, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Performance & Profitability Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance & Profitability</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                    Agent Name/Location
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                    Total Deliveries
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                    Success Rate %
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                    Stock Value in Hand
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                    Profit Contribution
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedPerformance.length > 0 ? (
                  paginatedPerformance.map((agent) => (
                    <tr
                      key={agent.agentId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {getInitials(agent.agentName)}
                          </div>
                          <div>
                            <p className="text-sm font-bold">
                              {agent.agentName}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {agent.location}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {agent.totalDeliveries}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 w-16 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`${getSuccessRateColor(
                                agent.successRate,
                              )} h-full`}
                              style={{ width: `${agent.successRate}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-bold ${getSuccessRateTextColor(
                              agent.successRate,
                            )}`}
                          >
                            {agent.successRate.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {formatCurrency(agent.stockValue, currency)}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm font-bold ${
                          agent.profitContribution >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {agent.profitContribution >= 0 ? "+" : ""}
                        {formatCurrency(agent.profitContribution, currency)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link href={`/dashboard/admin/agents/${agent.agentId}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-muted-foreground"
                    >
                      No agent data available for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer with Pagination */}
          {agentPerformance.length > 0 && (
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {paginatedPerformance.length} of{" "}
                {agentPerformance.length} agents
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

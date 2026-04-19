"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Warehouse, Users, Package, AlertTriangle } from "lucide-react";

interface AgentDistribution {
  agentId: string;
  agentName: string;
  location: string;
  totalStock: number;
  stockValue: number;
  defectiveCount: number;
  missingCount: number;
}

interface DistributionData {
  warehouse: {
    stock: number;
    value: number;
  };
  agents: {
    stock: number;
    value: number;
    distribution: AgentDistribution[];
  };
  totalStock: number;
  totalValue: number;
}

interface AgentDistributionOverviewProps {
  data: DistributionData;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function AgentDistributionOverview({
  data,
}: AgentDistributionOverviewProps) {
  // Prepare data for pie chart
  const pieData = [
    { name: "Warehouse", value: data.warehouse.stock },
    { name: "With Agents", value: data.agents.stock },
  ];

  // Prepare data for bar chart
  const barData = data.agents.distribution
    .sort((a, b) => b.totalStock - a.totalStock)
    .slice(0, 10)
    .map((agent) => ({
      name: agent.agentName.length > 15 ? agent.agentName.substring(0, 12) + "..." : agent.agentName,
      stock: agent.totalStock,
      defective: agent.defectiveCount,
      missing: agent.missingCount,
    }));

  const warehousePercentage = data.totalStock > 0
    ? Math.round((data.warehouse.stock / data.totalStock) * 100)
    : 0;
  const agentPercentage = 100 - warehousePercentage;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Total Inventory
              </p>
              <Package className="size-5 text-primary" />
            </div>
            <p className="text-3xl font-bold">
              {data.totalStock.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ₦{data.totalValue.toLocaleString()} value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Warehouse Stock
              </p>
              <Warehouse className="size-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold">
              {data.warehouse.stock.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {warehousePercentage}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Agent Stock
              </p>
              <Users className="size-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold">
              {data.agents.stock.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {agentPercentage}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Stock Issues
              </p>
              <AlertTriangle className="size-5 text-amber-600" />
            </div>
            <p className="text-3xl font-bold">
              {data.agents.distribution
                .reduce(
                  (sum, agent) => sum + agent.defectiveCount + agent.missingCount,
                  0,
                )
                .toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Defective + Missing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Warehouse vs Agent Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? "#3b82f6" : "#10b981"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Agents by Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="stock" fill="#10b981" name="Good Stock" />
                <Bar dataKey="defective" fill="#f59e0b" name="Defective" />
                <Bar dataKey="missing" fill="#ef4444" name="Missing" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type TimePeriod = "week" | "month" | "year";

interface ChartDataPoint {
  date: string;
  delivered: number;
  failed: number;
}

interface AgentPerformanceChartProps {
  data: ChartDataPoint[];
  period: TimePeriod;
}

export function AgentPerformanceChart({
  data,
  period,
}: AgentPerformanceChartProps) {
  // Format date based on period
  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    if (period === "week") {
      return date.toLocaleDateString("en-NG", { weekday: "short" });
    } else if (period === "month") {
      return date.toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
      });
    } else {
      return date.toLocaleDateString("en-NG", { month: "short" });
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Delivery Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelFormatter={(label) => {
                const date = new Date(label);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="delivered"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorDelivered)"
              name="Delivered"
            />
            <Area
              type="monotone"
              dataKey="failed"
              stroke="#ef4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorFailed)"
              name="Cancelled"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

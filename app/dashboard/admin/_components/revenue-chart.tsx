"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { RevenueTrendData } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

interface RevenueChartProps {
  data: RevenueTrendData[] | null;
  className?: string;
}

const chartConfig = {
  current: {
    label: "Current Period",
    color: "var(--chart-5)",
  },
  previous: {
    label: "Previous Period",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function RevenueChart({ data, className }: RevenueChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Revenue Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Loading chart data...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for recharts
  const chartData = data.map((item) => ({
    label: item.label,
    current: item.current,
    previous: item.previous,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle>Revenue Performance</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-[var(--chart-5)]"></div>
              <span className="text-xs text-muted-foreground">Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-[var(--chart-4)]"></div>
              <span className="text-xs text-muted-foreground">Previous</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-48 sm:h-64 w-full">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 0,
              right: 12,
              top: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
              className="text-xs"
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value) => formatCurrency(Number(value))}
                />
              }
            />
            <Area
              dataKey="previous"
              type="natural"
              fill="var(--color-previous)"
              fillOpacity={0.2}
              stroke="var(--color-previous)"
              strokeWidth={2}
            />
            <Area
              dataKey="current"
              type="natural"
              fill="var(--color-current)"
              fillOpacity={0.3}
              stroke="var(--color-current)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

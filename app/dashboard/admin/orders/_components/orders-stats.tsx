import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, getCurrencyName } from "@/lib/currency";
import type { TimePeriod } from "@/lib/types";
import type { Currency } from "@prisma/client";

type Stats = {
  totalHandled: number;
  deliveryRate: number;
  revenue: number;
  ordersChange: number | null;
  deliveryRateChange: number | null;
  revenueChange: number | null;
};

interface OrdersStatsProps {
  stats: Stats;
  period?: TimePeriod;
  currency?: Currency;
}

const periodLabels = {
  today: "today",
  week: "this week",
  month: "this month",
  year: "this year",
};

export function OrdersStats({ stats, period = "month", currency }: OrdersStatsProps) {
  const formatChange = (change: number | null) => {
    if (change === null) return null;
    return `${change > 0 ? "+" : ""}${change}%`;
  };

  const statsData = [
    {
      label: `Total Handled (${periodLabels[period]})`,
      value: stats.totalHandled.toLocaleString(),
      change: formatChange(stats.ordersChange),
      trend: stats.ordersChange !== null
        ? stats.ordersChange >= 0 ? ("up" as const) : ("down" as const)
        : null,
    },
    {
      label: "Delivery Rate",
      value: `${stats.deliveryRate}%`,
      change: formatChange(stats.deliveryRateChange),
      trend: stats.deliveryRateChange !== null
        ? stats.deliveryRateChange >= 0 ? ("up" as const) : ("down" as const)
        : null,
    },
    {
      label: "Revenue Generated",
      value: formatCurrency(stats.revenue, currency || "NGN"),
      change: formatChange(stats.revenueChange),
      trend: stats.revenueChange !== null
        ? stats.revenueChange >= 0 ? ("up" as const) : ("down" as const)
        : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs font-medium">
          Currency: {getCurrencyName(currency || "NGN")}
        </Badge>
        <span className="text-xs text-muted-foreground">
          All amounts shown in this currency only
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statsData.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {stat.label}
            </p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
              {stat.change !== null && stat.trend !== null && (
                <div
                  className={`flex items-center gap-1 text-sm font-bold ${
                    stat.trend === "up" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <TrendingUp className="size-4" />
                  ) : (
                    <TrendingDown className="size-4" />
                  )}
                  {stat.change}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      </div>
    </div>
  );
}

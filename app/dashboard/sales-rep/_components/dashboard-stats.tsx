import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimePeriod } from "@/lib/types";
import { getCurrencySymbol } from "@/lib/currency";
import type { Currency } from "@prisma/client";

interface DashboardStatsProps {
  stats: {
    totalOrders: number;
    percentageChange: number | null;
    pendingOrders: number;
    confirmedOrders: number;
    deliveredThisPeriod: number;
    conversionRate: number;
    revenue: number;
    revenueCurrency: Currency;
    isCustomRange: boolean;
    avgResponseTimeHours: number | null;
  };
  period: TimePeriod;
}

function formatResponseTime(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  return `${(hours / 24).toFixed(1)}d`;
}

function responseTimeBadgeColor(hours: number): string {
  if (hours < 1) return "text-green-600";
  if (hours < 4) return "text-amber-600";
  return "text-red-600";
}

export function DashboardStats({ stats, period }: DashboardStatsProps) {
  const periodLabels: Record<TimePeriod, string> = {
    today: "Today",
    week: "This Week",
    month: "This Month",
    year: "This Year",
  };
  const deliveredLabel = stats.isCustomRange
    ? "Delivered in Range"
    : `Delivered ${periodLabels[period]}`;

  const isPositiveChange = (stats.percentageChange ?? 0) >= 0;
  const confirmedPercentage =
    stats.totalOrders > 0
      ? Math.round((stats.confirmedOrders / stats.totalOrders) * 100)
      : 0;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
      {/* Revenue */}
      <Card className="shadow-sm bg-primary/5 sm:col-span-2 lg:col-span-3 xl:col-span-2 xl:row-span-1">
        <CardContent className="p-6 flex flex-col gap-1">
          <p className="text-primary text-sm font-bold uppercase tracking-wider">
            Revenue
          </p>
          <p className="text-primary text-3xl font-bold tracking-tight">
            {getCurrencySymbol(stats.revenueCurrency)}{stats.revenue.toLocaleString()}
          </p>
          <span className="text-xs text-primary/70 font-medium mt-1">
            From delivered orders
          </span>
        </CardContent>
      </Card>

      {/* Total Orders */}
      <Card className="shadow-sm">
        <CardContent className="p-6 flex flex-col gap-1">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
            Total Orders
          </p>
          <p className="text-3xl font-bold tracking-tight">
            {stats.totalOrders.toLocaleString()}
          </p>
          {stats.percentageChange !== null ? (
            <span
              className={cn(
                "text-xs font-medium flex items-center gap-1 mt-1",
                isPositiveChange ? "text-green-600" : "text-red-600"
              )}
            >
              {isPositiveChange ? (
                <TrendingUp className="size-4" />
              ) : (
                <TrendingDown className="size-4" />
              )}
              {isPositiveChange ? "+" : ""}
              {stats.percentageChange.toFixed(1)}% vs last period
            </span>
          ) : (
            <span className="text-xs text-muted-foreground mt-1">
              Custom range
            </span>
          )}
        </CardContent>
      </Card>

      {/* Pending (New) */}
      <Card className="shadow-sm ring-2 ring-amber-500/20">
        <CardContent className="p-6 flex flex-col gap-1">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
            Pending (New)
          </p>
          <p className="text-3xl font-bold tracking-tight">
            {stats.pendingOrders}
          </p>
          <span className="text-xs text-amber-600 font-medium mt-1">
            Needs attention
          </span>
        </CardContent>
      </Card>

      {/* Confirmed */}
      <Card className="shadow-sm">
        <CardContent className="p-6 flex flex-col gap-1">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
            Confirmed
          </p>
          <p className="text-3xl font-bold tracking-tight">
            {stats.confirmedOrders}
          </p>
          <span className="text-xs text-muted-foreground mt-1">
            {confirmedPercentage}% of total
          </span>
        </CardContent>
      </Card>

      {/* Delivered This Period */}
      <Card className="shadow-sm">
        <CardContent className="p-6 flex flex-col gap-1">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
            {deliveredLabel}
          </p>
          <p className="text-3xl font-bold tracking-tight">
            {stats.deliveredThisPeriod}
          </p>
          <span className="text-xs text-blue-600 font-medium mt-1">
            On target
          </span>
        </CardContent>
      </Card>

      {/* Conversion Rate */}
      <Card className="shadow-sm">
        <CardContent className="p-6 flex flex-col gap-1">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
            Conversion
          </p>
          <p className="text-3xl font-bold tracking-tight">
            {stats.conversionRate.toFixed(1)}%
          </p>
          <span className="text-xs text-primary font-medium mt-1">
            {stats.conversionRate >= 60 ? "Top performer" : "Keep going"}
          </span>
        </CardContent>
      </Card>

      {/* Avg Response Time */}
      <Card className="shadow-sm">
        <CardContent className="p-6 flex flex-col gap-1">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
            Avg Response
          </p>
          {stats.avgResponseTimeHours !== null ? (
            <>
              <p className={cn("text-3xl font-bold tracking-tight", responseTimeBadgeColor(stats.avgResponseTimeHours))}>
                {formatResponseTime(stats.avgResponseTimeHours)}
              </p>
              <span className={cn("text-xs font-medium mt-1", responseTimeBadgeColor(stats.avgResponseTimeHours))}>
                {stats.avgResponseTimeHours < 1
                  ? "Excellent"
                  : stats.avgResponseTimeHours < 4
                  ? "Good"
                  : "Needs improvement"}
              </span>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold tracking-tight text-muted-foreground">—</p>
              <span className="text-xs text-muted-foreground mt-1">No confirmations yet</span>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

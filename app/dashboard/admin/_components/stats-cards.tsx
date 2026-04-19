import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, DollarSign, ShoppingBag, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, getCurrencyName } from "@/lib/currency";
import { formatPercentage } from "@/lib/date-utils";
import type { DashboardStats } from "@/lib/types";
import type { Currency } from "@prisma/client";

interface StatsCardsProps {
  stats: DashboardStats | null;
  currency?: Currency;
}

export function StatsCards({ stats, currency }: StatsCardsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-32 animate-pulse">
                <div className="h-10 w-10 bg-muted rounded-lg mb-4" />
                <div className="h-4 bg-muted rounded w-24 mb-2" />
                <div className="h-8 bg-muted rounded w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      name: "Total Revenue",
      value: formatCurrency(stats.revenue, currency || "NGN"),
      change: stats.revenueChange,
      icon: Wallet,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      previousValue: "vs. previous period",
    },
    {
      name: "Net Profit",
      value: formatCurrency(stats.profit, currency || "NGN"),
      change: stats.profitChange,
      icon: DollarSign,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      previousValue: "After costs & expenses",
    },
    {
      name: "Total Orders",
      value: stats.ordersCount.toString(),
      change: stats.ordersChange,
      icon: ShoppingBag,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
      previousValue: "vs. previous period",
    },
    {
      name: "Fulfillment Rate",
      value: `${stats.fulfillmentRate}%`,
      change: stats.cancelledRate,
      icon: TrendingUp,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      previousValue: `${stats.cancelledRate}% cancelled`,
      isNeutral: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <Badge variant="secondary" className="text-[10px] sm:text-xs font-medium whitespace-nowrap">
          Currency: {getCurrencyName(currency || "NGN")}
        </Badge>
        <span className="text-[10px] sm:text-xs text-muted-foreground">
          All amounts shown in this currency only
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat) => {
          const isPositive = stat.change !== null && stat.change >= 0;
          const showChange = !stat.isNeutral && stat.change !== null;

          return (
            <Card key={stat.name}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`p-2 ${stat.iconBg} ${stat.iconColor} rounded-lg`}
                  >
                    <stat.icon className="size-4 sm:size-5" />
                  </span>
                  {showChange && (
                    <span
                      className={`text-[10px] sm:text-xs font-bold flex items-center px-2 py-1 rounded-full ${
                        isPositive
                          ? "text-green-600 bg-green-50 dark:bg-green-900/20"
                          : "text-red-600 bg-red-50 dark:bg-red-900/20"
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="size-2.5 sm:size-3 mr-1" />
                      ) : (
                        <TrendingDown className="size-2.5 sm:size-3 mr-1" />
                      )}
                      {formatPercentage(stat.change!)}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-medium">{stat.name}</p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground/80 break-words">
                  {stat.value}
                </h3>
                <p className="text-[10px] sm:text-xs text-foreground/80 mt-2">
                  {stat.previousValue}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

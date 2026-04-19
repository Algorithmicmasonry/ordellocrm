import { Card, CardContent } from "@/components/ui/card";
import { CircleDollarSign, Clock, PackageCheck, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import type { Currency } from "@prisma/client";
import type { DeliveryStatsData } from "../actions";

interface DeliveryStatsProps {
  stats: DeliveryStatsData | null;
  currency?: Currency;
}

export function DeliveryStats({ stats, currency }: DeliveryStatsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 sm:p-6">
              <div className="animate-pulse">
                <div className="h-9 w-9 bg-muted rounded-lg mb-4" />
                <div className="h-3 bg-muted rounded w-20 mb-2" />
                <div className="h-7 bg-muted rounded w-28" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cur = currency ?? "NGN";

  const cards = [
    {
      label: "Total Delivered",
      value: stats.totalDeliveries.toLocaleString(),
      sub: "orders fulfilled",
      icon: PackageCheck,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(stats.totalRevenue, cur),
      sub: "from delivered orders",
      icon: CircleDollarSign,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Avg Fulfillment",
      value: `${stats.avgFulfillmentDays.toFixed(1)} days`,
      sub: "order to delivery",
      icon: Clock,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      label: "Avg Per Day",
      value: `${stats.avgPerDay.toFixed(1)} orders`,
      sub: "daily delivery rate",
      icon: TrendingUp,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <span className={`p-2 ${card.iconBg} ${card.iconColor} rounded-lg`}>
                <card.icon className="size-4 sm:size-5" />
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium">{card.label}</p>
            <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground/80 break-words">
              {card.value}
            </h3>
            <p className="text-[10px] sm:text-xs text-foreground/80 mt-2">{card.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

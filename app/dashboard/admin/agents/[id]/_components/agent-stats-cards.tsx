import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import type { Currency } from "@prisma/client";

interface OrderStats {
  total: number;
  delivered: number;
  cancelled: number;
  inTransit: number;
  successRate: number;
  revenue: number;
}

interface AgentStatsCardsProps {
  currentStats: OrderStats;
  previousStats: OrderStats;
  stockValue: number;
  currency?: Currency;
}

function TrendBadge({
  current,
  previous,
  format = "number",
}: {
  current: number;
  previous: number;
  format?: "number" | "percentage" | "currency";
}) {
  const diff = current - previous;
  const percentChange =
    previous > 0 ? ((diff / previous) * 100).toFixed(1) : "0";

  const isPositive = diff > 0;
  const isNeutral = diff === 0;

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const color = isNeutral
    ? "text-muted-foreground"
    : isPositive
      ? "text-green-600"
      : "text-red-600";

  return (
    <div className={`flex items-center gap-1 text-sm font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      <span>
        {isNeutral
          ? "No change"
          : `${isPositive ? "+" : ""}${percentChange}%`}
      </span>
    </div>
  );
}

export function AgentStatsCards({
  currentStats,
  previousStats,
  stockValue,
  currency,
}: AgentStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Deliveries */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Total Deliveries
            </p>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold">{currentStats.delivered}</h3>
            <TrendBadge
              current={currentStats.delivered}
              previous={previousStats.delivered}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {currentStats.total} total orders
          </p>
        </CardContent>
      </Card>

      {/* Success Rate */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Success Rate
            </p>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold">{currentStats.successRate}%</h3>
            <TrendBadge
              current={currentStats.successRate}
              previous={previousStats.successRate}
              format="percentage"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {currentStats.cancelled} cancelled orders
          </p>
        </CardContent>
      </Card>

      {/* Stock Value */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Stock Value
            </p>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold">
              {formatCurrency(stockValue, currency || "NGN")}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Inventory in hand
          </p>
        </CardContent>
      </Card>

      {/* Active Orders */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Active Orders
            </p>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold">{currentStats.inTransit}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            In transit / confirmed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

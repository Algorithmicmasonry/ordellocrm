import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, Truck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getCurrencySymbol } from "@/lib/currency";
import type { Currency } from "@prisma/client";

interface Stats {
  totalSpend: number;
  currency: Currency;
  deliverySuccessRate: number;
}

interface CustomerStatsProps {
  stats: Stats;
}

export function CustomerStats({ stats }: CustomerStatsProps) {
  return (
    <>
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Total Lifetime Spend
            </p>
            <DollarSign className="size-5 text-primary" />
          </div>
          <p className="text-3xl font-bold leading-tight">
            {getCurrencySymbol(stats.currency)}{stats.totalSpend.toLocaleString()}
          </p>
          <p className="text-green-600 dark:text-green-400 text-xs font-bold mt-2 flex items-center gap-1">
            <TrendingUp className="size-3" />
            Reliable payment history
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Delivery Success Rate
            </p>
            <Truck className="size-5 text-primary" />
          </div>
          <p className="text-3xl font-bold leading-tight">
            {stats.deliverySuccessRate}%
          </p>
          <Progress
            value={stats.deliverySuccessRate}
            className="mt-4 h-1.5"
          />
        </CardContent>
      </Card>
    </>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banknote, Crown } from "lucide-react";

interface EarningsData {
  ordersDelivered: number;
  ratePerOrder: number | null;
  baseEarnings: number;
  hohBonus: number;
  hohWeeks: number;
  totalEarnings: number;
  isPaid: boolean;
  payrollLabel: string | null;
}

interface Props {
  data: EarningsData | null;
}

const fmt = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
});

export function EarningsCard({ data }: Props) {
  if (!data) return null;

  const hasRate = data.ratePerOrder !== null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="size-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Estimated Earnings</CardTitle>
          </div>
          <Badge
            variant={data.isPaid ? "default" : "secondary"}
            className="text-xs"
          >
            {data.isPaid ? `Paid · ${data.payrollLabel ?? ""}` : "Pending Payroll"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasRate ? (
          <p className="text-sm text-muted-foreground">
            Your pay rate has not been set by the admin yet.
          </p>
        ) : (
          <>
            <div className="text-2xl font-bold text-primary">
              {fmt.format(data.totalEarnings)}
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>
                  {data.ordersDelivered} orders × {fmt.format(data.ratePerOrder!)}
                </span>
                <span className="tabular-nums">{fmt.format(data.baseEarnings)}</span>
              </div>

              {data.hohBonus > 0 && (
                <div className="flex items-center justify-between text-amber-600">
                  <span className="flex items-center gap-1">
                    <Crown className="size-3.5" />
                    Head of House ({data.hohWeeks}w × ₦10,500)
                  </span>
                  <span className="tabular-nums">+{fmt.format(data.hohBonus)}</span>
                </div>
              )}

              <div className="flex items-center justify-between font-semibold border-t pt-1.5">
                <span>Total</span>
                <span className="tabular-nums">{fmt.format(data.totalEarnings)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Estimates are based on delivered orders. Final amount confirmed when admin processes payroll.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

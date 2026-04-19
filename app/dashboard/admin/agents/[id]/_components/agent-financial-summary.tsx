import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, Calendar } from "lucide-react";

interface Settlement {
  id: string;
  stockValue: number;
  cashCollected: number;
  cashReturned: number;
  adjustments: number;
  balanceDue: number;
  notes: string | null;
  settledAt: Date;
}

interface AgentFinancialSummaryProps {
  stockValue: number;
  outstandingBalance: number;
  recentSettlements: Settlement[];
  onRecordSettlement: () => void;
}

export function AgentFinancialSummary({
  stockValue,
  outstandingBalance,
  recentSettlements,
  onRecordSettlement,
}: AgentFinancialSummaryProps) {
  const lastSettlement = recentSettlements[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Financial Summary</CardTitle>
          <Button onClick={onRecordSettlement} size="sm">
            <DollarSign className="w-4 h-4 mr-2" />
            Record Settlement
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Financial Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Stock in Hand</p>
            </div>
            <p className="text-2xl font-bold">₦{stockValue.toLocaleString()}</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              {outstandingBalance > 0 ? (
                <TrendingUp className="w-4 h-4 text-orange-600" />
              ) : outstandingBalance < 0 ? (
                <TrendingDown className="w-4 h-4 text-green-600" />
              ) : (
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                Outstanding Balance
              </p>
            </div>
            <p
              className={`text-2xl font-bold ${
                outstandingBalance > 0
                  ? "text-orange-600"
                  : outstandingBalance < 0
                    ? "text-green-600"
                    : "text-muted-foreground"
              }`}
            >
              ₦{Math.abs(outstandingBalance).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {outstandingBalance > 0
                ? "Agent owes company"
                : outstandingBalance < 0
                  ? "Company owes agent"
                  : "Fully settled"}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Last Settlement</p>
            </div>
            <p className="text-lg font-semibold">
              {lastSettlement
                ? new Date(lastSettlement.settledAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "Never"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {lastSettlement
                ? `₦${lastSettlement.balanceDue.toLocaleString()} balance`
                : "No settlements yet"}
            </p>
          </div>
        </div>

        {/* Settlement History */}
        {recentSettlements.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">
              Recent Settlements ({recentSettlements.length})
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Stock Value</TableHead>
                  <TableHead className="text-right">Cash Collected</TableHead>
                  <TableHead className="text-right">Cash Returned</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSettlements.map((settlement) => (
                  <TableRow key={settlement.id}>
                    <TableCell className="text-sm">
                      {new Date(settlement.settledAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      ₦{settlement.stockValue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      ₦{settlement.cashCollected.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      ₦{settlement.cashReturned.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          settlement.balanceDue > 0
                            ? "destructive"
                            : settlement.balanceDue < 0
                              ? "default"
                              : "secondary"
                        }
                        className={
                          settlement.balanceDue < 0
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : ""
                        }
                      >
                        ₦{Math.abs(settlement.balanceDue).toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {settlement.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {recentSettlements.length === 0 && (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No settlement history yet
            </p>
            <Button
              onClick={onRecordSettlement}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              Record First Settlement
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

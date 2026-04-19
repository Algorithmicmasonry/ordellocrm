import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History } from "lucide-react";
import { format } from "date-fns";
import type { Order, OrderItem, Product } from "@prisma/client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getCurrencySymbol } from "@/lib/currency";

type OrderWithItems = Order & {
  items: (OrderItem & { product: Product })[];
};

interface OrderHistoryTabProps {
  orders: OrderWithItems[];
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  DISPATCHED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  POSTPONED: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  NOT_REACHABLE: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  NOT_PICKING_CALLS: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

export function OrderHistoryTab({ orders }: OrderHistoryTabProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          <History className="size-5" />
          Order History
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold text-xs uppercase">
                  Order ID
                </TableHead>
                <TableHead className="font-bold text-xs uppercase">
                  Date
                </TableHead>
                <TableHead className="font-bold text-xs uppercase">
                  Status
                </TableHead>
                <TableHead className="font-bold text-xs uppercase text-right">
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const total = order.items.reduce(
                    (sum, item) => sum + item.quantity * item.price,
                    0
                  );

                  return (
                    <TableRow
                      key={order.id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <TableCell>
                        <Link
                          href={`/dashboard/sales-rep/orders/${order.id}`}
                          className="text-sm font-bold text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(order.createdAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-xs font-medium",
                            STATUS_COLORS[order.status]
                          )}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-right">
                        {getCurrencySymbol(order.currency)}{total.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

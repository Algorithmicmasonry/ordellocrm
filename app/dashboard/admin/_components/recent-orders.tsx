"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/date-utils";
import type { OrderWithRelations } from "@/lib/types";
import { Eye, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import OrderDetailsModal from "./order-details-modal";

interface RecentOrdersProps {
  orders: OrderWithRelations[] | null;
}

const statusConfig: Record<string, { label: string; className: string }> =
  {
    NEW: {
      label: "New",
      className:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    },
    CONFIRMED: {
      label: "Confirmed",
      className:
        "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400",
    },
    DISPATCHED: {
      label: "Dispatched",
      className:
        "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    },
    DELIVERED: {
      label: "Delivered",
      className:
        "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    },
    CANCELLED: {
      label: "Cancelled",
      className: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    },
    POSTPONED: {
      label: "Postponed",
      className:
        "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    },
    NOT_REACHABLE: {
      label: "Not Reachable",
      className:
        "bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400",
    },
    NOT_PICKING_CALLS: {
      label: "Not Picking Calls",
      className:
        "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
    },
  };

export function RecentOrders({ orders }: RecentOrdersProps) {
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(
    null,
  );

  const handleViewDetails = (order: OrderWithRelations) => {
    setSelectedOrder(order);
  };

  if (!orders) {
    return (
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Recent Transactions</h3>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground font-medium">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="border-b">
                    <td className="px-6 py-4">
                      <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-muted rounded w-28 animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 bg-muted rounded w-16 animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Recent Transactions</h3>
          </div>
        </CardHeader>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <ShoppingCart className="size-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No orders yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold">Recent Transactions</h3>
            <Link
              href="/dashboard/admin/orders"
              className="text-primary text-xs font-bold hover:underline whitespace-nowrap"
            >
              View All Orders
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-muted/50 text-muted-foreground font-medium">
                <tr>
                  <th className="px-3 sm:px-6 py-3 sm:py-4">Order ID</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4">Customer</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4">Date</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4">Amount</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4">Status</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => {
                  const statusInfo = statusConfig[order.status];
                  return (
                    <tr key={order.id}>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-semibold whitespace-nowrap">
                        {order.orderNumber}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div>
                          <p className="font-medium text-xs sm:text-sm">{order.customerName}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {order.customerPhone}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-muted-foreground whitespace-nowrap text-[10px] sm:text-xs">
                        {formatDateTime(new Date(order.createdAt))}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-bold whitespace-nowrap">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <Badge
                          variant="secondary"
                          className={statusInfo.className}
                        >
                          {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            handleViewDetails(order);
                          }}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/*Order Details Modal*/}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </>
  );
}

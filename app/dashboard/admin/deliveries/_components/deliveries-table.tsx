"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrencySymbol } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import type { DeliveryWithRelations } from "../actions";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function FulfillmentBadge({
  createdAt,
  deliveredAt,
}: {
  createdAt: Date;
  deliveredAt: Date;
}) {
  const days = Math.round(
    (new Date(deliveredAt).getTime() - new Date(createdAt).getTime()) /
      MS_PER_DAY,
  );
  const color =
    days <= 3 ? "emerald" : days <= 7 ? "amber" : "red";

  return (
    <Badge
      variant="outline"
      className={cn(
        `text-${color}-500 border-${color}-500/30 bg-${color}-500/10`,
      )}
    >
      {days}d
    </Badge>
  );
}

interface DeliveriesTableProps {
  deliveries: DeliveryWithRelations[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
  agents: { id: string; name: string }[];
  currentAgent?: string;
}

export function DeliveriesTable({
  deliveries,
  pagination,
  agents,
  currentAgent,
}: DeliveriesTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("search") ?? "";
    }
    return "";
  });

  const updateParam = (key: string, value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.set("page", "1");
      router.push(`?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("search", searchValue);
  };

  const handlePageChange = (newPage: number) => {
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      params.set("page", newPage.toString());
      router.push(`?${params.toString()}`);
    });
  };

  const formatProducts = (delivery: DeliveryWithRelations) =>
    delivery.items
      .map((item) => `${item.product.name} ×${item.quantity}`)
      .join(", ");

  return (
    <Card className="relative">
      <CardContent className="p-0">
        {isPending && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg shadow-lg border">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span className="text-sm font-medium">Loading deliveries...</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="p-4 border-b">
          <div className="flex flex-col sm:flex-row gap-2">
            <form
              onSubmit={handleSearchSubmit}
              className="flex gap-2 flex-1"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search customer or order #"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">
                Search
              </Button>
            </form>

            <Select
              value={currentAgent ?? "all"}
              onValueChange={(v) => updateParam("agent", v)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No deliveries found for this period
                  </TableCell>
                </TableRow>
              ) : (
                deliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-bold text-primary">
                      #{delivery.orderNumber}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{delivery.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {delivery.customerPhone}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                      {formatProducts(delivery)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {delivery.city}, {delivery.state}
                    </TableCell>
                    <TableCell className="text-sm">
                      {delivery.agent?.name ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {delivery.deliveredAt
                        ? format(
                            new Date(delivery.deliveredAt),
                            "MMM d, yyyy h:mm a",
                          )
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {delivery.deliveredAt && (
                        <FulfillmentBadge
                          createdAt={delivery.createdAt}
                          deliveredAt={delivery.deliveredAt}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {getCurrencySymbol(delivery.currency)}
                      {delivery.totalAmount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden divide-y">
          {deliveries.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              No deliveries found for this period
            </p>
          ) : (
            deliveries.map((delivery) => (
              <div key={delivery.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary text-sm">
                    #{delivery.orderNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {delivery.deliveredAt
                      ? format(
                          new Date(delivery.deliveredAt),
                          "MMM d, yyyy h:mm a",
                        )
                      : "—"}
                  </span>
                </div>
                <p className="font-medium text-sm">
                  {delivery.customerName}{" "}
                  <span className="text-muted-foreground font-normal">
                    · {delivery.customerPhone}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatProducts(delivery)}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {delivery.city}, {delivery.state}
                    {delivery.agent?.name && ` · ${delivery.agent.name}`}
                  </span>
                  <span className="font-semibold text-sm">
                    {getCurrencySymbol(delivery.currency)}
                    {delivery.totalAmount.toLocaleString()}
                  </span>
                </div>
                {delivery.deliveredAt && (
                  <div className="flex items-center gap-1">
                    <FulfillmentBadge
                      createdAt={delivery.createdAt}
                      deliveredAt={delivery.deliveredAt}
                    />
                    <span className="text-xs text-muted-foreground">
                      fulfillment
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/50">
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {pagination.total === 0
                ? 0
                : (pagination.page - 1) * pagination.perPage + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">
              {Math.min(
                pagination.page * pagination.perPage,
                pagination.total,
              )}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              {pagination.total}
            </span>{" "}
            deliveries
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1 || isPending}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={
                pagination.page >= pagination.totalPages || isPending
              }
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

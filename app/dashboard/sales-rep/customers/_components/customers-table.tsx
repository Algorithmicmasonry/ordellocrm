"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, History, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn, getInitials } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";

interface Customer {
  customerPhone: string;
  customerName: string;
  customerWhatsapp: string | null;
  city: string;
  state: string;
  totalOrders: number;
  totalSpend: number;
  deliverySuccessRate: number;
  reliability: string;
  lastActivity: Date;
  lastActivityText: string;
}

interface CustomersTableProps {
  customers: Customer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const RELIABILITY_CONFIG = {
  "Frequent Buyer": {
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/50",
    dotColor: "bg-green-500",
  },
  Reliable: {
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50",
    dotColor: "bg-blue-500",
  },
  Cancellations: {
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50",
    dotColor: "bg-red-500",
  },
  "New Customer": {
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    dotColor: "bg-slate-500",
  },
};

export function CustomersTable({ customers, pagination }: CustomersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", page.toString());
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleWhatsAppClick = (phone: string, name: string) => {
    const message = encodeURIComponent(
      `Hi ${name}, this is regarding your orders with us. How can I assist you today?`
    );
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, "")}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  if (customers.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center">
            <span className="text-3xl">👥</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">No customers found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Loading Overlay */}
      {isPending && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-[2px] z-50 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg shadow-lg border">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span className="text-sm font-medium">Loading customers...</span>
          </div>
        </div>
      )}

      <Card className="overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold">Customer Name</TableHead>
                <TableHead className="font-bold">Contact Details</TableHead>
                <TableHead className="font-bold text-center">
                  Assigned Orders
                </TableHead>
                <TableHead className="font-bold">Last Activity</TableHead>
                <TableHead className="font-bold">Reliability Score</TableHead>
                <TableHead className="font-bold text-right">
                  Quick Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const reliabilityConfig =
                  RELIABILITY_CONFIG[
                    customer.reliability as keyof typeof RELIABILITY_CONFIG
                  ] || RELIABILITY_CONFIG["New Customer"];

                return (
                  <TableRow
                    key={customer.customerPhone}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                            {getInitials(customer.customerName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{customer.customerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {customer.customerPhone}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {customer.customerPhone}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {customer.city}, {customer.state}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className="font-bold"
                      >
                        {customer.totalOrders}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {format(new Date(customer.lastActivity), "MMM dd, yyyy")}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                        {customer.lastActivityText}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-bold uppercase border",
                          reliabilityConfig.className
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full mr-1.5",
                            reliabilityConfig.dotColor
                          )}
                        ></span>
                        {customer.reliability}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleWhatsAppClick(
                              customer.customerWhatsapp || customer.customerPhone,
                              customer.customerName
                            )
                          }
                          className="hover:text-green-500 hover:border-green-200 hover:bg-green-50 dark:hover:bg-green-950"
                        >
                          <MessageCircle className="size-4" />
                        </Button>
                        <Button size="sm" asChild>
                          <Link
                            href={`/dashboard/sales-rep/customers/${encodeURIComponent(
                              customer.customerPhone
                            )}`}
                          >
                            <History className="size-4 mr-2" />
                            History
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 bg-muted/50 border-t">
            <div className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
              Showing{" "}
              <span className="font-bold text-foreground">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-foreground">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-foreground">
                {pagination.total}
              </span>{" "}
              customers
            </div>
            <div className="flex gap-1 sm:gap-2 order-1 sm:order-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1 || isPending}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="text-xs sm:text-sm"
              >
                Previous
              </Button>

              {/* Page Numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(3, pagination.totalPages) }).map(
                  (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={i}
                        variant={
                          pageNum === pagination.page ? "default" : "outline"
                        }
                        size="sm"
                        className="w-8 h-8 sm:w-9 sm:h-9 p-0 text-xs"
                        disabled={isPending}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || isPending}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="text-xs sm:text-sm"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

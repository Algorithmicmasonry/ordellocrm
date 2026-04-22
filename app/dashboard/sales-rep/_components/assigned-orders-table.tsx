"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getCurrencySymbol } from "@/lib/currency";
import type {
  Order,
  OrderItem,
  OrderNote,
  OrderStatus,
  Product,
} from "@prisma/client";
import { format } from "date-fns";
import {
  Check,
  Download,
  Eye,
  Facebook,
  Filter,
  Globe,
  Instagram,
  Loader2,
  MessageCircle,
  Package,
  Phone,
  Search,
  Star,
  Timer,
  Truck,
  XCircle,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";

type OrderWithDetails = Order & {
  items: (OrderItem & { product: Product })[];
  notes: OrderNote[];
  hasPendingFollowUp: boolean;
  nextFollowUpDate: Date | null;
};

interface AssignedOrdersTableProps {
  orders: OrderWithDetails[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  currentStatus: OrderStatus | "ALL" | "FOLLOW_UP";
  currentSearch: string;
}

function ResponseTimeBadge({
  createdAt,
  confirmedAt,
}: {
  createdAt: Date;
  confirmedAt: Date | null;
}) {
  if (!confirmedAt)
    return <span className="text-xs text-muted-foreground">—</span>;
  const ms = new Date(confirmedAt).getTime() - new Date(createdAt).getTime();
  const minutes = Math.round(ms / 60000);
  const hours = ms / 3600000;
  let label: string;
  let color: string;
  if (minutes < 60) {
    label = `${minutes}m`;
    color = "emerald";
  } else if (hours < 4) {
    label = `${hours.toFixed(1)}h`;
    color = "amber";
  } else if (hours < 24) {
    label = `${Math.round(hours)}h`;
    color = "red";
  } else {
    label = `${Math.floor(hours / 24)}d`;
    color = "red";
  }
  return (
    <Badge
      variant="outline"
      className={`text-xs text-${color}-500 border-${color}-500/30 bg-${color}-500/10`}
    >
      {label}
    </Badge>
  );
}

const STATUS_COLORS = {
  NEW: "bg-amber-500/20 text-amber-500 border-amber-500/30",
  CONFIRMED: "bg-green-500/20 text-green-500 border-green-500/30",
  DISPATCHED: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  DELIVERED: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
  CANCELLED: "bg-red-500/20 text-red-500 border-red-500/30",
  POSTPONED: "bg-orange-500/20 text-orange-500 border-orange-500/30",
  NOT_REACHABLE: "bg-slate-500/20 text-slate-500 border-slate-500/30",
  NOT_PICKING_CALLS: "bg-rose-500/20 text-rose-500 border-rose-500/30",
};

const SOURCE_ICONS = {
  WHATSAPP: MessageCircle,
  FACEBOOK: Facebook,
  INSTAGRAM: Instagram,
  CALL: Phone,
  WEBSITE: Globe,
};

const SOURCE_NAMES = {
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  WHATSAPP: "WhatsApp",
  CALL: "Call",
  WEBSITE: "Website",
  UNKNOWN: "Unknown",
};

const SOURCE_COLORS: Record<string, string> = {
  WHATSAPP: "text-green-500",
  FACEBOOK: "text-blue-600",
  INSTAGRAM: "text-pink-500",
  CALL: "text-purple-500",
  WEBSITE: "text-indigo-500",
};

const statusTimelineConfig: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }
> = {
  NEW: { label: "Order Placed", icon: Package, color: "text-amber-500" },
  CONFIRMED: { label: "Confirmed", icon: Check, color: "text-green-500" },
  DISPATCHED: { label: "Dispatched", icon: Truck, color: "text-blue-500" },
  DELIVERED: { label: "Delivered", icon: Check, color: "text-emerald-500" },
  CANCELLED: { label: "Cancelled", icon: XCircle, color: "text-red-500" },
  POSTPONED: { label: "Postponed", icon: Timer, color: "text-orange-500" },
  NOT_REACHABLE: {
    label: "Not Reachable",
    icon: Phone,
    color: "text-slate-500",
  },
  NOT_PICKING_CALLS: {
    label: "Not Picking Calls",
    icon: Phone,
    color: "text-rose-500",
  },
};

function getSourceIcon(source: string) {
  return SOURCE_ICONS[source as keyof typeof SOURCE_ICONS] || Globe;
}

export function AssignedOrdersTable({
  orders,
  pagination,
  currentStatus,
  currentSearch,
}: AssignedOrdersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);
  const [searchValue, setSearchValue] = useState(currentSearch);

  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Ordello CRM";

  const filteredOrders = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter((order) => {
      const itemNames = order.items.map((item) => item.product.name).join(" ");
      const notesText = order.notes.map((note) => note.note).join(" ");
      const searchable = [
        order.id,
        String(order.orderNumber),
        order.customerName,
        order.customerPhone,
        order.customerWhatsapp || "",
        order.deliveryAddress,
        order.city,
        order.state,
        order.status,
        order.source,
        itemNames,
        notesText,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [orders, searchValue]);

  const handleStatusFilter = (status: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (status === "ALL") {
        params.delete("status");
      } else {
        params.set("status", status);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", page.toString());
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleWhatsAppClick = (
    phone: string,
    customerName: string,
    items: OrderWithDetails["items"],
    currency: string,
  ) => {
    const itemsList = items
      .map((item, index) => {
        const total = item.price * item.quantity;

        const symbol = getCurrencySymbol(currency as any);

        return `${index + 1}. ${item.product.name} (${item.quantity}) - ${symbol}${total.toFixed(2)}`;
      })
      .join("\n");

    const message = encodeURIComponent(
      `Hi ${customerName}, this is regarding your order with us at ${storeName}.

  Your order has been successfully created.

  Products:
  ${itemsList}

  Our team will contact you shortly to complete your order.`,
    );

    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, "")}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleExport = () => {
    // Create CSV content
    const headers = [
      "Order Number",
      "Customer Name",
      "Phone",
      "Status",
      "Source",
      "Location",
      "Date",
      "Total Amount",
      "Currency",
    ];
    const rows = filteredOrders.map((order) => {
      const totalAmount = order.items.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      );
      return [
        order.orderNumber,
        order.customerName,
        order.customerPhone,
        order.status,
        order.source,
        `${order.city}, ${order.state}`,
        format(new Date(order.createdAt), "MMM dd, yyyy"),
        totalAmount.toString(),
        order.currency,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `orders-${format(new Date(), "yyyy-MM-dd")}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs = [
    { label: "All Orders", value: "ALL" },
    { label: "Pending", value: "NEW" },
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Follow-up", value: "FOLLOW_UP" },
  ];

  return (
    <Card className="shadow-sm overflow-hidden relative">
      {/* Global Loading Overlay */}
      {isPending && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg shadow-lg border">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span className="text-sm font-medium">Loading orders...</span>
          </div>
        </div>
      )}

      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold">Assigned Orders</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              disabled={isPending}
            >
              <Filter className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Filter</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isPending || orders.length === 0}
            >
              <Download className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
        <div className="relative mb-4 sm:mb-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by order ID, customer name, phone, location, status..."
            className="pl-9"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select
                  value={currentStatus}
                  onValueChange={handleStatusFilter}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Orders</SelectItem>
                    <SelectItem value="NEW">Pending</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="POSTPONED">Postponed</SelectItem>
                    <SelectItem value="NOT_REACHABLE">Not reachable</SelectItem>
                    <SelectItem value="NOT_PICKING_CALLS">
                      Not Picking Calls
                    </SelectItem>
                    <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="flex border-b border-border gap-4 sm:gap-8 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleStatusFilter(tab.value)}
                disabled={isPending}
                className={cn(
                  "border-b-2 pb-3 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap",
                  currentStatus === tab.value
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                  isPending && "opacity-50 cursor-not-allowed",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead className="text-center">Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Response</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No orders found matching your search/filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className={cn(
                      "hover:bg-muted/50 transition-colors",
                      order.hasPendingFollowUp &&
                        "bg-blue-50/30 dark:bg-blue-900/5",
                    )}
                  >
                    <TableCell className="font-bold text-primary">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">
                          {order.customerName}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {order.customerPhone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex justify-center cursor-pointer">
                              {(() => {
                                const SourceIcon = getSourceIcon(order.source);
                                return (
                                  <SourceIcon
                                    className={cn(
                                      "size-5",
                                      SOURCE_COLORS[order.source],
                                    )}
                                  />
                                );
                              })()}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {
                                SOURCE_NAMES[
                                  order.source as keyof typeof SOURCE_NAMES
                                ]
                              }
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-bold",
                              STATUS_COLORS[
                                order.status as keyof typeof STATUS_COLORS
                              ],
                            )}
                          >
                            {order.status === "NEW" ? "Pending" : order.status}
                          </Badge>
                          {order.hasPendingFollowUp && (
                            <Star className="size-4 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </div>
                        {order.hasPendingFollowUp && order.nextFollowUpDate && (
                          <span
                            className={cn(
                              "text-xs font-medium",
                              new Date(
                                order.nextFollowUpDate,
                              ).toDateString() === new Date().toDateString()
                                ? "text-amber-600"
                                : "text-red-500",
                            )}
                          >
                            {new Date(order.nextFollowUpDate).toDateString() ===
                            new Date().toDateString()
                              ? "Follow-up due today"
                              : `Overdue · ${format(new Date(order.nextFollowUpDate), "MMM dd")}`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ResponseTimeBadge
                        createdAt={order.createdAt}
                        confirmedAt={order.confirmedAt}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {order.city}, {order.state}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(order.createdAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                className="bg-green-500 hover:bg-green-600 text-white size-9 sm:size-8"
                                onClick={() =>
                                  handleWhatsAppClick(
                                    order.customerWhatsapp ||
                                      order.customerPhone,
                                    order.customerName,
                                    order.items,
                                    order.currency,
                                  )
                                }
                              >
                                <MessageCircle className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Chat on WhatsApp</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button size="sm" asChild className="h-9 sm:h-8">
                          <Link
                            href={`/dashboard/sales-rep/orders/${order.id}`}
                          >
                            <Eye className="size-4 sm:mr-2" />
                            <span className="hidden sm:inline">Details</span>
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {orders.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t bg-muted/50">
            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              {searchValue.trim() ? (
                `Showing ${filteredOrders.length} of ${orders.length} loaded orders on this page`
              ) : (
                <>
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-foreground">
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total,
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">
                    {pagination.total}
                  </span>{" "}
                  orders
                </>
              )}
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
                disabled={pagination.page >= pagination.totalPages || isPending}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Agent,
  Order,
  OrderItem,
  OrderNote,
  OrderStatus,
  Product,
  User,
} from "@prisma/client";
import { format } from "date-fns";
import {
  Check,
  Eye,
  Loader2,
  Package,
  Pencil,
  Timer,
  Trash2,
  Truck,
  XCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import toast from "react-hot-toast";
import { deleteOrder } from "../[id]/actions";
import { EditOrderItemsModal } from "./edit-order-items-modal";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { OrdersTableFilters } from "./orders-table-filters";

export type OrderWithRelations = Order & {
  assignedTo: Pick<User, "id" | "name" | "email"> | null;
  agent: Pick<Agent, "id" | "name" | "location"> | null;
  items: (OrderItem & {
    product: Pick<Product, "id" | "name">;
  })[];
  notes: OrderNote[];
};

interface OrdersTableProps {
  orders: OrderWithRelations[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
  locations: { value: string; label: string }[];
}

const storeName = process.env.NEXT_PUBLIC_STORE_NAME;
function ResponseTimeBadge({
  createdAt,
  confirmedAt,
}: {
  createdAt: Date;
  confirmedAt: Date | null;
}) {
  if (!confirmedAt) return <span className="text-xs text-muted-foreground">—</span>;
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

export const statusStyles = {
  NEW: "bg-amber-500/20 text-amber-500 border-amber-500/30",
  CONFIRMED: "bg-green-500/20 text-green-500 border-green-500/30",
  DISPATCHED: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  DELIVERED: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
  CANCELLED: "bg-red-500/20 text-red-500 border-red-500/30",
  POSTPONED: "bg-orange-500/20 text-orange-500 border-orange-500/30",
  NOT_REACHABLE: "bg-slate-500/20 text-slate-500 border-slate-500/30",
  NOT_PICKING_CALLS: "bg-rose-500/20 text-rose-500 border-rose-500/30",
};

export const sourceNames = {
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  WHATSAPP: "WhatsApp",
  WEBSITE: "Website",
  UNKNOWN: "Unknown",
};

const statusTimelineConfig: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }
> = {
  NEW: {
    label: "Order Placed",
    icon: Package,
    color: "text-amber-500",
  },
  CONFIRMED: {
    label: "Confirmed",
    icon: Check,
    color: "text-green-500",
  },
  DISPATCHED: {
    label: "Dispatched",
    icon: Truck,
    color: "text-blue-500",
  },
  DELIVERED: {
    label: "Delivered",
    icon: Check,
    color: "text-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-red-500",
  },
  POSTPONED: {
    label: "Postponed",
    icon: Timer,
    color: "text-orange-500",
  },
  NOT_REACHABLE: {
    label: "Not Reachable",
    icon: Timer,
    color: "text-slate-500",
  },
  NOT_PICKING_CALLS: {
    label: "Not Picking Calls",
    icon: Timer,
    color: "text-rose-500",
  },
};

export const OrderStatusTimeline = ({
  order,
}: {
  order: OrderWithRelations;
}) => {
  // Define the normal flow of statuses
  const normalFlow: OrderStatus[] = [
    "NEW",
    "CONFIRMED",
    "DISPATCHED",
    "DELIVERED",
  ];

  // Determine which timeline to show
  const isCancelled = order.status === "CANCELLED";
  const isPostponed = order.status === "POSTPONED";

  let timelineStatuses: OrderStatus[];
  if (isCancelled) {
    timelineStatuses = ["NEW", "CANCELLED"];
  } else if (isPostponed) {
    timelineStatuses = ["NEW", "POSTPONED"];
  } else {
    timelineStatuses = normalFlow;
  }

  // Get timestamp for each status
  const getStatusDate = (status: OrderStatus): Date | null => {
    switch (status) {
      case "NEW":
        return order.createdAt;
      case "CONFIRMED":
        return order.confirmedAt;
      case "DISPATCHED":
        return order.dispatchedAt;
      case "DELIVERED":
        return order.deliveredAt;
      case "CANCELLED":
        return order.cancelledAt;
      default:
        return null;
    }
  };

  // Determine if a status is completed
  const isStatusCompleted = (status: OrderStatus): boolean => {
    const currentIndex = timelineStatuses.indexOf(order.status);
    const statusIndex = timelineStatuses.indexOf(status);
    return statusIndex <= currentIndex;
  };

  // Determine if a status is current
  const isStatusCurrent = (status: OrderStatus): boolean => {
    return order.status === status;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Order Timeline</h3>
      <div className="relative">
        {timelineStatuses.map((status, index) => {
          const config = statusTimelineConfig[status];
          const Icon = config.icon;
          const isCompleted = isStatusCompleted(status);
          const isCurrent = isStatusCurrent(status);
          const statusDate = getStatusDate(status);
          const isLast = index === timelineStatuses.length - 1;

          return (
            <div key={status} className="relative flex gap-4 pb-8 last:pb-0">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-4 top-10 w-0.5 h-[calc(100%-2.5rem)]",
                    isCompleted ? "bg-primary" : "bg-muted",
                  )}
                />
              )}

              {/* Status icon */}
              <div
                className={cn(
                  "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background border-muted text-muted-foreground",
                  isCurrent && "ring-4 ring-primary/20 shadow-lg",
                )}
              >
                <Icon className="size-4" />
              </div>

              {/* Status content */}
              <div className="flex-1 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "font-semibold text-sm",
                      isCompleted ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {config.label}
                  </p>
                  {statusDate && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(statusDate), "MMM dd, yyyy HH:mm")}
                    </p>
                  )}
                </div>
                {isCurrent && !isCompleted && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Waiting for update...
                  </p>
                )}
                {isCurrent && isCompleted && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    Current Status
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const SourceIcon = ({ source }: { source: string }) => {
  switch (source) {
    case "FACEBOOK":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          className="w-5 h-5 inline-block"
          fill="currentColor"
        >
          <path d="M576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 440 146.7 540.8 258.2 568.5L258.2 398.2L205.4 398.2L205.4 320L258.2 320L258.2 286.3C258.2 199.2 297.6 158.8 383.2 158.8C399.4 158.8 427.4 162 438.9 165.2L438.9 236C432.9 235.4 422.4 235 409.3 235C367.3 235 351.1 250.9 351.1 292.2L351.1 320L434.7 320L420.3 398.2L351 398.2L351 574.1C477.8 558.8 576 450.9 576 320z" />
        </svg>
      );
    case "TIKTOK":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          className="w-5 h-5 inline-block"
          fill="currentColor"
        >
          <path d="M544.5 273.9C500.5 274 457.5 260.3 421.7 234.7L421.7 413.4C421.7 446.5 411.6 478.8 392.7 506C373.8 533.2 347.1 554 316.1 565.6C285.1 577.2 251.3 579.1 219.2 570.9C187.1 562.7 158.3 545 136.5 520.1C114.7 495.2 101.2 464.1 97.5 431.2C93.8 398.3 100.4 365.1 116.1 336C131.8 306.9 156.1 283.3 185.7 268.3C215.3 253.3 248.6 247.8 281.4 252.3L281.4 342.2C266.4 337.5 250.3 337.6 235.4 342.6C220.5 347.6 207.5 357.2 198.4 369.9C189.3 382.6 184.4 398 184.5 413.8C184.6 429.6 189.7 444.8 199 457.5C208.3 470.2 221.4 479.6 236.4 484.4C251.4 489.2 267.5 489.2 282.4 484.3C297.3 479.4 310.4 469.9 319.6 457.2C328.8 444.5 333.8 429.1 333.8 413.4L333.8 64H421.8C421.7 71.4 422.4 78.9 423.7 86.2C426.8 102.5 433.1 118.1 442.4 131.9C451.7 145.7 463.7 157.5 477.6 166.5C497.5 179.6 520.8 186.6 544.6 186.6L544.6 274z" />
        </svg>
      );
    case "WHATSAPP":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          className="w-5 h-5 inline-block"
          fill="currentColor"
        >
          <path d="M476.9 161.1C435 119.1 379.2 96 319.9 96C197.5 96 97.9 195.6 97.9 318C97.9 357.1 108.1 395.3 127.5 429L96 544L213.7 513.1C246.1 530.8 282.6 540.1 319.8 540.1L319.9 540.1C442.2 540.1 544 440.5 544 318.1C544 258.8 518.8 203.1 476.9 161.1zM319.9 502.7C286.7 502.7 254.2 493.8 225.9 477L219.2 473L149.4 491.3L168 423.2L163.6 416.2C145.1 386.8 135.4 352.9 135.4 318C135.4 216.3 218.2 133.5 320 133.5C369.3 133.5 415.6 152.7 450.4 187.6C485.2 222.5 506.6 268.8 506.5 318.1C506.5 419.9 421.6 502.7 319.9 502.7zM421.1 364.5C415.6 361.7 388.3 348.3 383.2 346.5C378.1 344.6 374.4 343.7 370.7 349.3C367 354.9 356.4 367.3 353.1 371.1C349.9 374.8 346.6 375.3 341.1 372.5C308.5 356.2 287.1 343.4 265.6 306.5C259.9 296.7 271.3 297.4 281.9 276.2C283.7 272.5 282.8 269.3 281.4 266.5C280 263.7 268.9 236.4 264.3 225.3C259.8 214.5 255.2 216 251.8 215.8C248.6 215.6 244.9 215.6 241.2 215.6C237.5 215.6 231.5 217 226.4 222.5C221.3 228.1 207 241.5 207 268.8C207 296.1 226.9 322.5 229.6 326.2C232.4 329.9 268.7 385.9 324.4 410C359.6 425.2 373.4 426.5 391 423.9C401.7 422.3 423.8 410.5 428.4 397.5C433 384.5 433 373.4 431.6 371.1C430.3 368.6 426.6 367.2 421.1 364.5z" />
        </svg>
      );
    case "WEBSITE":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          className="w-5 h-5 inline-block"
          fill="currentColor"
        >
          <path d="M415.9 344L225 344C227.9 408.5 242.2 467.9 262.5 511.4C273.9 535.9 286.2 553.2 297.6 563.8C308.8 574.3 316.5 576 320.5 576C324.5 576 332.2 574.3 343.4 563.8C354.8 553.2 367.1 535.8 378.5 511.4C398.8 467.9 413.1 408.5 416 344zM224.9 296L415.8 296C413 231.5 398.7 172.1 378.4 128.6C367 104.2 354.7 86.8 343.3 76.2C332.1 65.7 324.4 64 320.4 64C316.4 64 308.7 65.7 297.5 76.2C286.1 86.8 273.8 104.2 262.4 128.6C242.1 172.1 227.8 231.5 224.9 296zM176.9 296C180.4 210.4 202.5 130.9 234.8 78.7C142.7 111.3 74.9 195.2 65.5 296L176.9 296zM65.5 344C74.9 444.8 142.7 528.7 234.8 561.3C202.5 509.1 180.4 429.6 176.9 344L65.5 344zM463.9 344C460.4 429.6 438.3 509.1 406 561.3C498.1 528.6 565.9 444.8 575.3 344L463.9 344zM575.3 296C565.9 195.2 498.1 111.3 406 78.7C438.3 130.9 460.4 210.4 463.9 296L575.3 296z" />
        </svg>
      );
    default:
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          className="w-5 h-5 inline-block"
          fill="currentColor"
        >
          <path d="M415.9 344L225 344C227.9 408.5 242.2 467.9 262.5 511.4C273.9 535.9 286.2 553.2 297.6 563.8C308.8 574.3 316.5 576 320.5 576C324.5 576 332.2 574.3 343.4 563.8C354.8 553.2 367.1 535.8 378.5 511.4C398.8 467.9 413.1 408.5 416 344zM224.9 296L415.8 296C413 231.5 398.7 172.1 378.4 128.6C367 104.2 354.7 86.8 343.3 76.2C332.1 65.7 324.4 64 320.4 64C316.4 64 308.7 65.7 297.5 76.2C286.1 86.8 273.8 104.2 262.4 128.6C242.1 172.1 227.8 231.5 224.9 296zM176.9 296C180.4 210.4 202.5 130.9 234.8 78.7C142.7 111.3 74.9 195.2 65.5 296L176.9 296zM65.5 344C74.9 444.8 142.7 528.7 234.8 561.3C202.5 509.1 180.4 429.6 176.9 344L65.5 344zM463.9 344C460.4 429.6 438.3 509.1 406 561.3C498.1 528.6 565.9 444.8 575.3 344L463.9 344zM575.3 296C565.9 195.2 498.1 111.3 406 78.7C438.3 130.9 460.4 210.4 463.9 296L575.3 296z" />
        </svg>
      );
  }
};

export const OrderDetailsModal = ({
  order,
  isOpen,
  onClose,
}: {
  order: OrderWithRelations;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const totalAmount = order.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details - {order.orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{order.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{order.customerPhone}</p>
              </div>
              {order.customerWhatsapp && (
                <div>
                  <p className="text-sm text-muted-foreground">WhatsApp</p>
                  <p className="font-medium">{order.customerWhatsapp}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Information */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Order Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="outline" className={statusStyles[order.status]}>
                  {order.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="font-medium">{sourceNames[order.source]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">
                  {order.city}, {order.state}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {format(new Date(order.createdAt), "MMM dd, yyyy HH:mm")}
                </p>
              </div>
              {order.assignedTo && (
                <div>
                  <p className="text-sm text-muted-foreground">Assigned To</p>
                  <p className="font-medium">{order.assignedTo.name}</p>
                </div>
              )}
              {order.agent && (
                <div>
                  <p className="text-sm text-muted-foreground">Agent</p>
                  <p className="font-medium">{order.agent.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Delivery Address</h3>
            <p className="text-sm">{order.deliveryAddress}</p>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Order Items</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{item.product.name}</span>
                          {item.price === 0 && (
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                              Free gift
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {getCurrencySymbol(order.currency)}
                        {item.price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {getCurrencySymbol(order.currency)}
                        {(item.quantity * item.price).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-semibold">
                      Total Amount
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {getCurrencySymbol(order.currency)}
                      {totalAmount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Status Timeline */}
          <OrderStatusTimeline order={order} />

          {/* Notes */}
          {order.notes && order.notes.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Notes</h3>
              <div className="space-y-2">
                {order.notes.map((note) => (
                  <div
                    key={note.id}
                    className="text-sm bg-muted p-3 rounded-lg"
                  >
                    <p className="font-medium text-xs text-muted-foreground mb-1">
                      {format(new Date(note.createdAt), "MMM dd, yyyy HH:mm")}
                    </p>
                    <p>{note.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function OrdersTable({
  orders,
  pagination,
  locations,
}: OrdersTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<OrderWithRelations | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<OrderWithRelations | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleDelete = () => {
    if (!orderToDelete) return;
    startDeleteTransition(async () => {
      const result = await deleteOrder(orderToDelete.id);
      if (result.success) {
        toast.success(`Order #${orderToDelete.orderNumber} deleted`);
        setOrderToDelete(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete order");
      }
    });
  };

  const handleWhatsAppClick = (
    phone: string,
    customerName: string,
    orderNumber: number,
    items: OrderWithRelations["items"],
  ) => {
    const itemsList = items
      .map((item) => `${item.quantity}x ${item.product.name}`)
      .join(", ");

    const message = encodeURIComponent(
      `Hi ${customerName}, this is regarding your order with us at ${storeName}.\n\nItems: ${itemsList}\n\nHow can I assist you?`,
    );
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, "")}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleViewDetails = (order: OrderWithRelations) => {
    setSelectedOrder(order);
  };

  const handleFilterChange = (key: string, value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      if (value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page"); // Reset to page 1 when filtering
      router.push(`?${params.toString()}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      params.set("page", newPage.toString());
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <>
      <Card className="relative">
        <CardContent className="p-0">
          {/* Global Loading Overlay */}
          {isPending && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-lg">
              <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg shadow-lg border">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span className="text-sm font-medium">Loading orders...</span>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="p-4 border-b">
            <OrdersTableFilters
              locations={locations}
              isPending={isPending}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead className="text-center">Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-bold text-primary">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.customerName}
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-pointer">
                                <SourceIcon source={order.source} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{sourceNames[order.source]}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusStyles[order.status]}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ResponseTimeBadge
                          createdAt={order.createdAt}
                          confirmedAt={order.confirmedAt}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {order.city}, {order.state}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(order.createdAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  className="bg-green-500 hover:bg-green-600 text-white"
                                  onClick={() =>
                                    handleWhatsAppClick(
                                      order.customerWhatsapp ||
                                        order.customerPhone,
                                      order.customerName,
                                      order.orderNumber,
                                      order.items,
                                    )
                                  }
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 640 640"
                                    className="w-4 h-4"
                                    fill="currentColor"
                                  >
                                    <path d="M476.9 161.1C435 119.1 379.2 96 319.9 96C197.5 96 97.9 195.6 97.9 318C97.9 357.1 108.1 395.3 127.5 429L96 544L213.7 513.1C246.1 530.8 282.6 540.1 319.8 540.1L319.9 540.1C442.2 540.1 544 440.5 544 318.1C544 258.8 518.8 203.1 476.9 161.1zM319.9 502.7C286.7 502.7 254.2 493.8 225.9 477L219.2 473L149.4 491.3L168 423.2L163.6 416.2C145.1 386.8 135.4 352.9 135.4 318C135.4 216.3 218.2 133.5 320 133.5C369.3 133.5 415.6 152.7 450.4 187.6C485.2 222.5 506.6 268.8 506.5 318.1C506.5 419.9 421.6 502.7 319.9 502.7zM421.1 364.5C415.6 361.7 388.3 348.3 383.2 346.5C378.1 344.6 374.4 343.7 370.7 349.3C367 354.9 356.4 367.3 353.1 371.1C349.9 374.8 346.6 375.3 341.1 372.5C308.5 356.2 287.1 343.4 265.6 306.5C259.9 296.7 271.3 297.4 281.9 276.2C283.7 272.5 282.8 269.3 281.4 266.5C280 263.7 268.9 236.4 264.3 225.3C259.8 214.5 255.2 216 251.8 215.8C248.6 215.6 244.9 215.6 241.2 215.6C237.5 215.6 231.5 217 226.4 222.5C221.3 228.1 207 241.5 207 268.8C207 296.1 226.9 322.5 229.6 326.2C232.4 329.9 268.7 385.9 324.4 410C359.6 425.2 373.4 426.5 391 423.9C401.7 422.3 423.8 410.5 428.4 397.5C433 384.5 433 373.4 431.6 371.1C430.3 368.6 426.6 367.2 421.1 364.5z" />
                                  </svg>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Chat on WhatsApp</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            size="sm"
                            onClick={() => handleViewDetails(order)}
                          >
                            <Eye className="size-4 mr-2" />
                            Details
                          </Button>
                          {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setOrderToEdit(order)}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit items</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setOrderToDelete(order)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete order</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/50">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {(pagination.page - 1) * pagination.perPage + 1}
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
              orders
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
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Edit Order Items Modal */}
      <EditOrderItemsModal
        order={orderToEdit}
        open={!!orderToEdit}
        onClose={() => setOrderToEdit(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => { if (!open) setOrderToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order #{orderToDelete?.orderNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the order. It will no longer appear in any sales rep&apos;s stats or conversion rate. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Yes, Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

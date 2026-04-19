import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getOrderDetails } from "./actions";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  CustomerInfoCard,
  OrderItemsTable,
  StatusWorkflow,
  CommunicationTimeline,
  FulfillmentSection,
  EditOrderModal,
  CancelOrderDialog,
  DispatchOrderButton,
  PrintInvoiceButton,
  ConfirmOrderButton,
  MarkDeliveredButton,
  PostponeOrderDialog,
  SendToAgentButton,
  ChangeStatusDialog,
} from "./_components";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailsPage({ params }: PageProps) {
  // Authentication check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "SALES_REP") {
    redirect("/dashboard");
  }

  // Get order ID
  const { id } = await params;

  // Fetch order details
  const orderResult = await getOrderDetails(id);

  if (!orderResult.success || !orderResult.data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground">Order Not Found</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {orderResult.error || "Unable to fetch order details"}
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/sales-rep">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const order = orderResult.data;
  const totalAmount = order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-0">
      <div className="flex-1">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm overflow-x-auto">
            <Link href="/dashboard/sales-rep" className="text-muted-foreground hover:text-primary font-medium whitespace-nowrap">
              Dashboard
            </Link>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            <Link href="/dashboard/sales-rep" className="text-muted-foreground hover:text-primary font-medium whitespace-nowrap">
              Orders
            </Link>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            <span className="font-medium whitespace-nowrap">Order {order.orderNumber}</span>
          </div>

          {/* Page Heading */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight tracking-tight">
                Order {order.orderNumber}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Created on {format(new Date(order.createdAt), "MMM dd, yyyy h:mm a")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ChangeStatusDialog
                orderId={order.id}
                currentStatus={order.status}
                orderNumber={order.orderNumber}
                agentId={order.agentId}
              />
              <PrintInvoiceButton order={order} />
              <SendToAgentButton order={order} />
              <EditOrderModal order={order} />
            </div>
          </div>

          {/* 3 Column Layout - Stack on mobile, grid on larger screens */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Left Column: Customer Info */}
            <div className="lg:col-span-3">
              <CustomerInfoCard order={order} />
            </div>

            {/* Center Column: Order Items & Workflow */}
            <div className="lg:col-span-6 flex flex-col gap-4 sm:gap-6">
              <OrderItemsTable
                items={order.items}
                totalAmount={totalAmount}
                currency={order.currency}
              />
              <StatusWorkflow order={order} />
              <FulfillmentSection order={order} />
            </div>

            {/* Right Column: Communication Timeline */}
            <div className="lg:col-span-3">
              <CommunicationTimeline order={order} />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer Actions */}
      <footer className="bg-card border-t p-3 sm:p-4 sticky bottom-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4">
            {order.status === "NEW" && (
              <>
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>
                  Action Required
                </Badge>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Order is ready for confirmation.
                </p>
              </>
            )}
            {order.status === "CONFIRMED" && !order.agentId && (
              <>
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>
                  Action Required
                </Badge>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Order is ready for dispatch assignment.
                </p>
              </>
            )}
            {order.status === "DISPATCHED" && (
              <>
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>
                  In Transit
                </Badge>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Order is out for delivery.
                </p>
              </>
            )}
            {order.status === "DELIVERED" && (
              <>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
                  Completed
                </Badge>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Order has been delivered successfully.
                </p>
              </>
            )}
            {order.status === "CANCELLED" && (
              <>
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></span>
                  Cancelled
                </Badge>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  This order has been cancelled.
                </p>
              </>
            )}
            {order.status === "POSTPONED" && (
              <>
                <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-gray-500 mr-1.5"></span>
                  Postponed
                </Badge>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  This order has been postponed.
                </p>
              </>
            )}
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            {/* Show Postpone option for non-terminal statuses */}
            {order.status !== "CANCELLED" &&
             order.status !== "DELIVERED" &&
             order.status !== "POSTPONED" && (
              <PostponeOrderDialog orderId={order.id} orderNumber={order.orderNumber} />
            )}

            {/* Show Cancel option for non-terminal statuses */}
            {order.status !== "CANCELLED" &&
             order.status !== "DELIVERED" &&
             order.status !== "POSTPONED" && (
              <CancelOrderDialog orderId={order.id} orderNumber={order.orderNumber} />
            )}

            {/* Status-specific action buttons */}
            {order.status === "NEW" && (
              <ConfirmOrderButton orderId={order.id} />
            )}

            {order.status === "CONFIRMED" && order.agentId && (
              <DispatchOrderButton orderId={order.id} />
            )}

            {order.status === "DISPATCHED" && (
              <MarkDeliveredButton orderId={order.id} />
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

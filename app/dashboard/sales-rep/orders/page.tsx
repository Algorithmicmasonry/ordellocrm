import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getAssignedOrders } from "../actions";
import { AssignedOrdersTable, CreateOrderDialog } from "../_components";
import type { OrderStatus } from "@prisma/client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
  }>;
}

export default async function SalesRepOrdersPage({ searchParams }: PageProps) {
  // Authentication check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "SALES_REP") {
    redirect("/dashboard");
  }

  // Parse search params
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const status = (params.status || "ALL") as OrderStatus | "ALL" | "FOLLOW_UP";
  const search = params.search || "";

  // Fetch orders
  const ordersResult = await getAssignedOrders({ page, status, search });

  if (!ordersResult.success || !ordersResult.data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground">
            Failed to Load Orders
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {ordersResult.error || "Unable to fetch orders"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm overflow-x-auto">
        <Link
          href="/dashboard/sales-rep"
          className="text-muted-foreground hover:text-primary font-medium whitespace-nowrap"
        >
          Dashboard
        </Link>
        <ChevronRight className="size-4 text-muted-foreground flex-shrink-0" />
        <span className="font-medium whitespace-nowrap">Orders</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 sm:gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl sm:text-4xl md:text-4xl font-black leading-tight tracking-tight">
            My Orders
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage and track all your assigned orders
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <CreateOrderDialog />
        </div>
      </div>

      {/* Orders Table */}
      <AssignedOrdersTable
        orders={ordersResult.data.orders}
        pagination={ordersResult.data.pagination}
        currentStatus={status}
        currentSearch={search}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getCustomerDetails } from "../actions";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  CustomerProfile,
  CustomerStats,
  OrderHistoryTab,
  CommunicationLog,
  CustomerContact,
} from "./_components";

interface PageProps {
  params: Promise<{ phone: string }>;
}

export default async function CustomerDetailsPage({ params }: PageProps) {
  // Authentication check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "SALES_REP") {
    redirect("/dashboard");
  }

  // Get customer phone
  const { phone } = await params;
  const decodedPhone = decodeURIComponent(phone);

  // Fetch customer details
  const customerResult = await getCustomerDetails(decodedPhone);

  if (!customerResult.success || !customerResult.data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground">
            Customer Not Found
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {customerResult.error || "Unable to fetch customer details"}
          </p>
          <Link
            href="/dashboard/sales-rep/customers"
            className="text-primary hover:underline mt-4 inline-block"
          >
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  const { customer, orders, stats, communicationLog } = customerResult.data;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/sales-rep"
          className="text-muted-foreground hover:text-primary font-medium"
        >
          Dashboard
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" />
        <Link
          href="/dashboard/sales-rep/customers"
          className="text-muted-foreground hover:text-primary font-medium"
        >
          Customers
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" />
        <span className="font-medium">{customer.customerName}</span>
      </div>

      {/* Customer Profile Header */}
      <CustomerProfile customer={customer} stats={stats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Orders & Communication */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Stats Cards for Mobile */}
          <div className="lg:hidden grid grid-cols-2 gap-4">
            <CustomerStats stats={stats} />
          </div>

          {/* Order History */}
          <OrderHistoryTab orders={orders} />

          {/* Communication Log */}
          <CommunicationLog logs={communicationLog} />
        </div>

        {/* Right Column: Stats & Contact */}
        <div className="lg:col-span-1 space-y-6">
          {/* Stats Cards for Desktop */}
          <div className="hidden lg:flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
              Customer Performance
            </h3>
            <CustomerStats stats={stats} />
          </div>

          {/* Contact Details */}
          <CustomerContact customer={customer} />
        </div>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getCustomers } from "./actions";
import {
  CustomersHeader,
  CustomersSearch,
  CustomersTable,
} from "./_components";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    city?: string;
  }>;
}

export default async function SalesRepCustomersPage({
  searchParams,
}: PageProps) {
  // Authentication check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "SALES_REP") {
    redirect("/dashboard");
  }

  // Parse search params
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const city = params.city || "";

  // Fetch customers
  const customersResult = await getCustomers({ page, search, city });

  if (!customersResult.success || !customersResult.data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground">
            Failed to Load Customers
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {customersResult.error || "Unable to fetch customers"}
          </p>
        </div>
      </div>
    );
  }

  const { customers, pagination, stats } = customersResult.data;

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
        <span className="font-medium whitespace-nowrap">Customers</span>
      </div>

      {/* Page Header */}
      <CustomersHeader totalCustomers={stats.totalCustomers} />

      {/* Search and Filters */}
      <CustomersSearch
        currentSearch={search}
        currentCity={city}
        cities={stats.cities}
      />

      {/* Customers Table */}
      <CustomersTable customers={customers} pagination={pagination} />

      {/* Info Alert */}
      <Alert className="bg-primary/5 border-primary/20">
        <Info className="size-4 text-primary flex-shrink-0" />
        <AlertDescription className="text-xs sm:text-sm">
          <strong className="font-bold text-primary">
            Data Policy Enforcement:
          </strong>{" "}
          As a Sales Representative, your view is restricted to customers with
          at least one order assigned to your account. Customer details are
          read-only to maintain system data integrity. For corrections, please
          contact your Administrator.
        </AlertDescription>
      </Alert>
    </div>
  );
}

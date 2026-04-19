import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getProductsCatalog } from "./actions";
import { ProductsGrid, ProductsHeader, ProductsSearch } from "./_components";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
    stock?: string;
  }>;
}

export default async function SalesRepProductsPage({ searchParams }: PageProps) {
  // Authentication check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "SALES_REP") {
    redirect("/dashboard");
  }

  // Parse search params
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const sort = params.sort || "name";
  const stockFilter = params.stock || "all";

  // Fetch products
  const productsResult = await getProductsCatalog({
    page,
    search,
    sort,
    stockFilter,
  });

  if (!productsResult.success || !productsResult.data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground">
            Failed to Load Products
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {productsResult.error || "Unable to fetch products"}
          </p>
        </div>
      </div>
    );
  }

  const { products, pagination, stats } = productsResult.data;

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
        <span className="font-medium whitespace-nowrap">Products</span>
      </div>

      {/* Page Header */}
      <ProductsHeader totalProducts={stats.totalActive} />

      {/* Search and Filters */}
      <ProductsSearch
        currentSearch={search}
        currentSort={sort}
        currentStockFilter={stockFilter}
      />

      {/* Products Grid */}
      <ProductsGrid products={products} pagination={pagination} />
    </div>
  );
}

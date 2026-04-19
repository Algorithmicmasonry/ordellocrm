import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";
import Link from "next/link";
import type { TopProduct } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

interface TopProductsProps {
  products: TopProduct[] | null;
}

export function TopProducts({ products }: TopProductsProps) {
  if (!products) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="size-10 rounded-lg bg-muted" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
                <div className="h-4 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center py-8">
          <Package className="size-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground text-center">
            No product sales in this period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          {products.map((product, index) => (
            <div key={product.id} className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                #{index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {product.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {product.ordersCount} order{product.ordersCount !== 1 ? "s" : ""}
                </p>
              </div>
              <p className="text-sm font-bold">
                {formatCurrency(product.revenue)}
              </p>
            </div>
          ))}
        </div>
        <Link href="/dashboard/admin/inventory">
          <Button variant="secondary" className="w-full mt-6">
            View Inventory Details
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

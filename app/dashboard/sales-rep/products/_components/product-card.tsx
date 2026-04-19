import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrencySymbol } from "@/lib/currency";
import type { Currency } from "@prisma/client";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: Currency;
  sku: string | null;
  currentStock: number;
  reorderPoint: number;
}

interface ProductCardProps {
  product: Product;
}

function getStockStatus(stock: number, reorderPoint: number) {
  if (stock <= 0) {
    return {
      label: "Out of Stock",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-500/30",
      dotColor: "bg-red-500",
    };
  }
  if (stock <= reorderPoint || stock <= 10) {
    return {
      label: "Low Stock",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-500/30",
      dotColor: "bg-amber-500",
    };
  }
  return {
    label: "In Stock",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-500/30",
    dotColor: "bg-emerald-500",
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const stockStatus = getStockStatus(product.currentStock, product.reorderPoint);
  const isOutOfStock = product.currentStock <= 0;

  return (
    <Card
      className={cn(
        "group overflow-hidden shadow-sm hover:shadow-md transition-all",
        isOutOfStock && "opacity-80"
      )}
    >
      {/* Product Image Placeholder */}
      <div className="aspect-video relative overflow-hidden bg-muted flex items-center justify-center">
        <Package2 className="size-16 text-muted-foreground/30" />

        {/* Stock Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className={cn("text-xs font-bold", stockStatus.className)}>
            <span className={cn("size-1.5 rounded-full mr-1.5", stockStatus.dotColor)}></span>
            {stockStatus.label}
          </Badge>
        </div>
      </div>

      <CardContent className="p-5 space-y-3">
        {/* Product Name & SKU */}
        <div>
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
            {product.name}
          </h3>
          {product.sku && (
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              SKU: {product.sku}
            </p>
          )}
        </div>

        {/* Description (if available) */}
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Price & Stock */}
        <div className="flex items-end justify-between pt-2">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground font-medium">
              Selling Price
            </p>
            <p className="text-xl font-extrabold text-foreground">
              {getCurrencySymbol(product.currency)}{product.price.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">
              Available
            </p>
            <p
              className={cn(
                "text-sm font-bold",
                product.currentStock <= 0
                  ? "text-red-600 dark:text-red-400"
                  : product.currentStock <= product.reorderPoint ||
                    product.currentStock <= 10
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-foreground"
              )}
            >
              {product.currentStock} Units
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

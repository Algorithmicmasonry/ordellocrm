import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

interface ProductEntry {
  productId: string;
  productName: string;
  orderCount: number;
  totalQuantity: number;
}

interface Props {
  data: ProductEntry[];
}

export function OrdersByProduct({ data }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Package className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">New Orders by Product</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          All orders (any status) created in the selected period
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No orders in this period.
          </p>
        ) : (
          <div className="space-y-2">
            {data.map((entry, i) => (
              <div
                key={entry.productId}
                className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground text-xs w-5 shrink-0 text-right">
                    {i + 1}.
                  </span>
                  <span className="truncate font-medium">{entry.productName}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4 text-right">
                  <span className="font-semibold tabular-nums">
                    {entry.orderCount} order{entry.orderCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {entry.totalQuantity} unit{entry.totalQuantity !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

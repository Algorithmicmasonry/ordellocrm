import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgentStock, Product, ProductPrice } from "@prisma/client";
import { Package, RefreshCw } from "lucide-react";

interface AgentStockTableProps {
  stock: (AgentStock & { product: Product & { productPrices: ProductPrice[] } })[];
  onReconcile?: (stock: AgentStock & { product: Product & { productPrices: ProductPrice[] } }) => void;
}

export function AgentStockTable({ stock, onReconcile }: AgentStockTableProps) {
  // Helper function to get cost from ProductPrice table
  const getCost = (product: Product & { productPrices: ProductPrice[] }) => {
    const productPrice = product.productPrices.find(p => p.currency === product.currency);
    return productPrice?.cost || 0;
  };

  const totalStockValue = stock.reduce(
    (sum, s) => sum + s.quantity * getCost(s.product),
    0
  );

  const totalDefectiveValue = stock.reduce(
    (sum, s) => sum + s.defective * getCost(s.product),
    0
  );

  const totalMissingValue = stock.reduce(
    (sum, s) => sum + s.missing * getCost(s.product),
    0
  );

  const totalDefectiveCount = stock.reduce((sum, s) => sum + s.defective, 0);
  const totalMissingCount = stock.reduce((sum, s) => sum + s.missing, 0);

  if (stock.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No stock assigned to this agent
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Stock Inventory</CardTitle>
          <div className="text-sm">
            <span className="text-muted-foreground">Total Value: </span>
            <span className="font-bold">₦{totalStockValue.toLocaleString()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Defective</TableHead>
              <TableHead className="text-right">Missing</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              {onReconcile && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {stock.map((item) => {
              const hasIssues = item.defective > 0 || item.missing > 0;
              const cost = getCost(item.product);
              const totalValue = item.quantity * cost;

              return (
                <TableRow
                  key={item.id}
                  className={hasIssues ? "bg-amber-50 dark:bg-amber-900/10" : ""}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      {item.product.sku && (
                        <p className="text-xs text-muted-foreground">
                          SKU: {item.product.sku}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.defective > 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        {item.defective}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.missing > 0 ? (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      >
                        {item.missing}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    ₦{cost.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ₦{totalValue.toLocaleString()}
                  </TableCell>
                  {onReconcile && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReconcile(item)}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Reconcile
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Summary Footer */}
        <div className="space-y-3 pt-4 mt-4 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {stock.length} product{stock.length !== 1 ? "s" : ""} in inventory
            </p>
            <p className="text-sm font-semibold">
              Total Stock Value: ₦{totalStockValue.toLocaleString()}
            </p>
          </div>

          {/* Defective & Missing Summary */}
          {(totalDefectiveCount > 0 || totalMissingCount > 0) && (
            <div className="grid grid-cols-2 gap-4 pt-3 border-t">
              {totalDefectiveCount > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Defective Stock
                  </p>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    {totalDefectiveCount} items
                  </p>
                  <p className="text-lg font-bold text-red-700 dark:text-red-400">
                    ₦{totalDefectiveValue.toLocaleString()}
                  </p>
                </div>
              )}

              {totalMissingCount > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Missing Stock
                  </p>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    {totalMissingCount} items
                  </p>
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                    ₦{totalMissingValue.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

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
import { AlertCircle, Package } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { UpdateStockModal } from "@/app/dashboard/admin/inventory/_components";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  currentStock: number;
  reorderPoint: number;
  updatedAt: Date;
  currency: string;
  productPrices: {
    id: string;
    price: number;
    cost: number;
    currency: string;
  }[];
}

interface LowStockReportProps {
  products: Product[];
}

export function LowStockReport({ products }: LowStockReportProps) {
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<
    string | undefined
  >(undefined);

  const handleRestock = (productId: string) => {
    setSelectedProductId(productId);
    setIsRestockModalOpen(true);
  };

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="size-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            All products are sufficiently stocked!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-amber-600" />
              <CardTitle>Low Stock Alert</CardTitle>
            </div>
            <Badge variant="destructive">{products.length} Products</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Reorder Point</TableHead>
                  <TableHead className="text-right">Stock Deficit</TableHead>
                  <TableHead className="text-right">Last Updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const deficit = product.reorderPoint - product.currentStock;
                  const isCritical = product.currentStock === 0;

                  return (
                    <TableRow
                      key={product.id}
                      className={isCritical ? "bg-red-50 dark:bg-red-950/20" : ""}
                    >
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.sku || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={isCritical ? "destructive" : "secondary"}
                        >
                          {product.currentStock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {product.reorderPoint}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          -{deficit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {format(new Date(product.updatedAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestock(product.id)}
                        >
                          Restock
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <UpdateStockModal
        open={isRestockModalOpen}
        onOpenChange={(open) => {
          setIsRestockModalOpen(open);
          if (!open) {
            setSelectedProductId(undefined);
          }
        }}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          currentStock: p.currentStock,
        }))}
        preselectedProductId={selectedProductId}
      />
    </>
  );
}

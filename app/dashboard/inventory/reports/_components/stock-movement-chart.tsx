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
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { format } from "date-fns";

interface Product {
  id: string;
  name: string;
  currentStock: number;
  openingStock: number;
  updatedAt: Date;
}

interface StockMovementChartProps {
  products: Product[];
}

export function StockMovementChart({ products }: StockMovementChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Stock Movements (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No stock movements in the last 30 days
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Opening Stock</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Movement</TableHead>
                  <TableHead className="text-right">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const change = product.currentStock - product.openingStock;
                  const percentChange =
                    product.openingStock > 0
                      ? ((change / product.openingStock) * 100).toFixed(1)
                      : "0.0";

                  const movementType =
                    change > 0
                      ? "increase"
                      : change < 0
                        ? "decrease"
                        : "no-change";

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {product.openingStock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {product.currentStock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {movementType === "increase" && (
                            <TrendingUp className="size-4 text-green-600" />
                          )}
                          {movementType === "decrease" && (
                            <TrendingDown className="size-4 text-red-600" />
                          )}
                          {movementType === "no-change" && (
                            <Minus className="size-4 text-muted-foreground" />
                          )}
                          <span
                            className={
                              movementType === "increase"
                                ? "text-green-600"
                                : movementType === "decrease"
                                  ? "text-red-600"
                                  : "text-muted-foreground"
                            }
                          >
                            {change > 0 ? "+" : ""}
                            {change}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            movementType === "increase"
                              ? "default"
                              : movementType === "decrease"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {movementType === "increase" ? "+" : ""}
                          {percentChange}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {format(new Date(product.updatedAt), "MMM dd, h:mm a")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

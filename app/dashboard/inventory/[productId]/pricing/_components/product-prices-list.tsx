"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import { getCurrencySymbol, getCurrencyName } from "@/lib/currency";
import type { ProductPrice, Currency } from "@prisma/client";
import { AddPriceDialog } from "./add-price-dialog";
import { EditPriceDialog } from "./edit-price-dialog";
import { DeletePriceDialog } from "./delete-price-dialog";

interface ProductPricesListProps {
  productId: string;
  productName: string;
  primaryCurrency: Currency;
  prices: ProductPrice[];
}

export function ProductPricesList({
  productId,
  productName,
  primaryCurrency,
  prices,
}: ProductPricesListProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<ProductPrice | null>(null);
  const [deletingPrice, setDeletingPrice] = useState<ProductPrice | null>(null);

  // Get currencies that don't have prices yet
  const availableCurrencies: Currency[] = ["NGN", "GHS", "USD", "GBP", "EUR"];
  const usedCurrencies = prices.map((p) => p.currency);
  const unusedCurrencies = availableCurrencies.filter(
    (c) => !usedCurrencies.includes(c)
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Multi-Currency Pricing</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Set prices and costs for {productName} in different currencies
              </p>
            </div>
            <Button
              onClick={() => setAddDialogOpen(true)}
              disabled={unusedCurrencies.length === 0}
            >
              <Plus className="size-4 mr-2" />
              Add Currency
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {prices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Prices Configured</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                This product has no currency-specific pricing. Add prices to enable
                multi-currency order forms and packages.
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="size-4 mr-2" />
                Add First Price
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prices.map((price) => {
                    const margin = price.price > 0
                      ? (((price.price - price.cost) / price.price) * 100).toFixed(1)
                      : "0";
                    const isPrimary = price.currency === primaryCurrency;

                    return (
                      <TableRow key={price.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {getCurrencySymbol(price.currency)}{" "}
                              {getCurrencyName(price.currency)}
                            </span>
                            {isPrimary && (
                              <Badge variant="secondary" className="text-xs">
                                Primary
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {getCurrencySymbol(price.currency)}
                          {price.price.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {getCurrencySymbol(price.currency)}
                          {price.cost.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              Number(margin) > 0
                                ? "text-green-600 font-medium"
                                : "text-red-600 font-medium"
                            }
                          >
                            {margin}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingPrice(price)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingPrice(price)}
                              disabled={isPrimary}
                              title={
                                isPrimary
                                  ? "Cannot delete primary currency"
                                  : "Delete price"
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {unusedCurrencies.length === 0 && prices.length > 0 && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              All supported currencies have been configured for this product.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddPriceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        productId={productId}
        productName={productName}
        availableCurrencies={unusedCurrencies}
      />

      {editingPrice && (
        <EditPriceDialog
          open={!!editingPrice}
          onOpenChange={(open) => !open && setEditingPrice(null)}
          productId={productId}
          productName={productName}
          price={editingPrice}
        />
      )}

      {deletingPrice && (
        <DeletePriceDialog
          open={!!deletingPrice}
          onOpenChange={(open) => !open && setDeletingPrice(null)}
          productId={productId}
          productName={productName}
          price={deletingPrice}
        />
      )}
    </>
  );
}

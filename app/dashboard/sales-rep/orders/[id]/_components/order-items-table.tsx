"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrencySymbol } from "@/lib/currency";
import type { OrderItem, Product, Currency } from "@prisma/client";

interface OrderItemsTableProps {
  items: (OrderItem & { product: Product })[];
  totalAmount: number;
  currency: Currency;
}

export function OrderItemsTable({ items, totalAmount, currency }: OrderItemsTableProps) {
  const freeItems = items.filter((item) => item.price === 0);

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="px-5 py-4 border-b flex flex-row justify-between items-center">
        <h3 className="font-bold">Order Items ({items.length})</h3>
        <Badge variant="secondary" className="text-xs font-bold uppercase tracking-tight">
          Standard Shipping
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        {freeItems.length > 0 && (
          <div className="px-5 py-3 border-b bg-emerald-50">
            <p className="text-xs font-semibold text-emerald-800 mb-1">
              Companion Items (Free Gifts)
            </p>
            <div className="flex flex-wrap gap-2">
              {freeItems.map((item) => (
                <Badge key={`free-${item.id}`} variant="outline" className="text-emerald-700 border-emerald-300">
                  {item.quantity}x {item.product.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="px-5 py-3 text-xs font-bold uppercase">
                  Product
                </TableHead>
                <TableHead className="px-5 py-3 text-xs font-bold uppercase text-center">
                  Qty
                </TableHead>
                <TableHead className="px-5 py-3 text-xs font-bold uppercase text-right">
                  Price
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-muted-foreground">
                          {item.product.name.charAt(0)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold">{item.product.name}</p>
                      {item.price === 0 && (
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                          Free gift
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-center text-sm">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right text-sm font-bold">
                    {getCurrencySymbol(currency)}
                    {item.price.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-muted/50">
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="px-5 py-3 text-right text-xs font-bold uppercase"
                >
                  Total Amount
                </TableCell>
                <TableCell className="px-5 py-3 text-right text-lg font-black text-primary">
                  {getCurrencySymbol(currency)}
                  {totalAmount.toLocaleString()}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

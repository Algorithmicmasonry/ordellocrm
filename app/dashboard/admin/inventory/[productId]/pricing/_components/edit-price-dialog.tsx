"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { upsertProductPrice } from "@/app/actions/product-prices";
import { getCurrencySymbol, getCurrencyName } from "@/lib/currency";
import type { ProductPrice } from "@prisma/client";

interface EditPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  price: ProductPrice;
}

export function EditPriceDialog({
  open,
  onOpenChange,
  productId,
  productName,
  price: initialPrice,
}: EditPriceDialogProps) {
  const [price, setPrice] = useState(initialPrice.price.toString());
  const [cost, setCost] = useState(initialPrice.cost.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when price changes
  useEffect(() => {
    setPrice(initialPrice.price.toString());
    setCost(initialPrice.cost.toString());
  }, [initialPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const priceNum = parseFloat(price);
    const costNum = parseFloat(cost);

    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    if (isNaN(costNum) || costNum < 0) {
      toast.error("Please enter a valid cost");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await upsertProductPrice({
        productId,
        currency: initialPrice.currency,
        price: priceNum,
        cost: costNum,
      });

      if (result.success) {
        toast.success(`${initialPrice.currency} pricing updated successfully!`);
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to update pricing");
      }
    } catch (error) {
      console.error("Error updating price:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Edit {getCurrencyName(initialPrice.currency)} Pricing
          </DialogTitle>
          <DialogDescription>
            Update the pricing for {productName} in{" "}
            {getCurrencyName(initialPrice.currency)}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price">Selling Price *</Label>
              <div className="relative">
                {/*<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {getCurrencySymbol(initialPrice.currency)}
                </span>*/}
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-cost">Cost per Unit *</Label>
              <div className="relative">
                {/*<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {getCurrencySymbol(initialPrice.currency)}
                </span>*/}
                <Input
                  id="edit-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                  required
                />
              </div>
            </div>
          </div>

          {price && cost && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Profit Margin:</span>
                <span className="font-semibold">
                  {parseFloat(price) > 0
                    ? (
                        ((parseFloat(price) - parseFloat(cost)) /
                          parseFloat(price)) *
                        100
                      ).toFixed(1)
                    : "0"}
                  %
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Profit per Unit:</span>
                <span className="font-semibold">
                  {getCurrencySymbol(initialPrice.currency)}
                  {(parseFloat(price) - parseFloat(cost)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Update Pricing
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

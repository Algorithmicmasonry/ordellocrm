"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { upsertProductPrice } from "@/app/actions/product-prices";
import { getCurrencySymbol, getCurrencyName } from "@/lib/currency";
import type { Currency } from "@prisma/client";

interface AddPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  availableCurrencies: Currency[];
}

export function AddPriceDialog({
  open,
  onOpenChange,
  productId,
  productName,
  availableCurrencies,
}: AddPriceDialogProps) {
  const [currency, setCurrency] = useState<Currency | undefined>(undefined);
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currency) {
      toast.error("Please select a currency");
      return;
    }

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
        currency: currency as Currency,
        price: priceNum,
        cost: costNum,
      });

      if (result.success) {
        toast.success(`${currency} pricing added successfully!`);
        onOpenChange(false);
        // Reset form
        setCurrency(undefined);
        setPrice("");
        setCost("");
      } else {
        toast.error(result.error || "Failed to add pricing");
      }
    } catch (error) {
      console.error("Error adding price:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Currency Pricing</DialogTitle>
          <DialogDescription>
            Add pricing for {productName} in a new currency. This will enable
            packages and order forms in this currency.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency *</Label>
            <Select
              value={currency}
              onValueChange={(value) => setCurrency(value as Currency)}
            >
              <SelectTrigger id="currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.map((curr) => (
                  <SelectItem key={curr} value={curr}>
                    {getCurrencySymbol(curr)} - {getCurrencyName(curr)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Selling Price *</Label>
              <div className="relative">
                {/*{currency && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {getCurrencySymbol(currency as Currency)}
                  </span>
                )}*/}
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={currency ? "pl-8" : ""}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Cost per Unit *</Label>
              <div className="relative">
                {/*{currency && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {getCurrencySymbol(currency as Currency)}
                  </span>
                )}*/}
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className={currency ? "pl-8 font-semibold" : "font-semibold"}
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
                  {currency && getCurrencySymbol(currency as Currency)}
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
              Add Pricing
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

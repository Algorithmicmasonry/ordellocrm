"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPackage, updatePackage } from "@/app/actions/packages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getAvailableCurrencies, getCurrencySymbol } from "@/lib/currency";
import type { ProductPackage, Currency } from "@prisma/client";

interface PackageFormProps {
  productId: string;
  package?: ProductPackage;
  availableCurrencies?: Currency[]; // Currencies with configured pricing
  onSuccess?: () => void;
}

export function PackageForm({
  productId,
  package: existingPackage,
  availableCurrencies,
  onSuccess,
}: PackageFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Use availableCurrencies or all currencies (for edit mode)
  const currencyOptions = availableCurrencies || getAvailableCurrencies().map(c => c.code as Currency);
  const defaultCurrency = availableCurrencies?.[0] || "NGN";

  const [formData, setFormData] = useState({
    name: existingPackage?.name || "",
    description: existingPackage?.description || "",
    quantity: existingPackage?.quantity.toString() || "1",
    price: existingPackage?.price.toString() || "0",
    displayOrder: existingPackage?.displayOrder.toString() || "0",
    currency: (existingPackage?.currency || defaultCurrency) as Currency,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const data = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      quantity: parseInt(formData.quantity),
      price: parseFloat(formData.price),
      currency: formData.currency,
      displayOrder: parseInt(formData.displayOrder),
    };

    let result;
    if (existingPackage) {
      result = await updatePackage({
        id: existingPackage.id,
        ...data,
      });
    } else {
      result = await createPackage({
        productId,
        ...data,
      });
    }

    setLoading(false);

    if (result.success) {
      toast.success(
        existingPackage
          ? "Package updated successfully"
          : "Package created successfully",
      );
      router.refresh();
      onSuccess?.();
    } else {
      toast.error(result.error || "Failed to save package");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Package Name *</Label>
        <Input
          id="name"
          required
          placeholder="e.g., Regular, Silver, Exclusive"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Short name for this package option
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="e.g., 1 BOX OF PLANT HAIR DYE SHAMPOO + FREE DELIVERY"
          rows={2}
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
        <p className="text-xs text-muted-foreground">
          Optional description shown to customers
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            required
            min="1"
            value={formData.quantity}
            onChange={(e) =>
              setFormData({ ...formData, quantity: e.target.value })
            }
          />
          <p className="text-xs text-muted-foreground">
            Number of items in this package
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">
            Price ({getCurrencySymbol(formData.currency)}) *
          </Label>
          <Input
            id="price"
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) =>
              setFormData({ ...formData, price: e.target.value })
            }
          />
          <p className="text-xs text-muted-foreground">
            Total price for this package
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">Currency *</Label>
        <Select
          value={formData.currency}
          onValueChange={(value) =>
            setFormData({ ...formData, currency: value as Currency })
          }
          disabled={!!existingPackage} // Cannot change currency when editing
        >
          <SelectTrigger>
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            {currencyOptions.map((currCode) => {
              const curr = getAvailableCurrencies().find(c => c.code === currCode);
              return curr ? (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.symbol} - {curr.name}
                </SelectItem>
              ) : null;
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {existingPackage
            ? "Currency cannot be changed after creation"
            : "Only currencies with configured pricing are shown"}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayOrder">Display Order</Label>
        <Input
          id="displayOrder"
          type="number"
          min="0"
          value={formData.displayOrder}
          onChange={(e) =>
            setFormData({ ...formData, displayOrder: e.target.value })
          }
        />
        <p className="text-xs text-muted-foreground">
          Lower numbers appear first (0 = first)
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : existingPackage
              ? "Update Package"
              : "Create Package"}
        </Button>
      </div>
    </form>
  );
}

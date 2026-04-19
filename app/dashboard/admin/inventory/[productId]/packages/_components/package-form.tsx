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
import type {
  ProductPackage,
  Currency,
  ProductPackageComponent,
  Product,
} from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";

type PackageWithComponents = ProductPackage & {
  components?: Array<
    ProductPackageComponent & {
      product: Pick<Product, "id" | "name" | "isActive" | "isDeleted">;
    }
  >;
};

type PackageComponentDraft = {
  productId: string;
  quantity: string;
};

interface PackageFormProps {
  productId: string;
  package?: PackageWithComponents;
  availableCurrencies?: Currency[]; // Currencies with configured pricing
  companionProducts: Array<{ id: string; name: string; currency: Currency }>;
  onSuccess?: () => void;
}

export function PackageForm({
  productId,
  package: existingPackage,
  availableCurrencies,
  companionProducts,
  onSuccess,
}: PackageFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Use availableCurrencies or all currencies (for edit mode)
  const currencyOptions =
    availableCurrencies || getAvailableCurrencies().map((c) => c.code as Currency);
  const defaultCurrency = availableCurrencies?.[0] || "NGN";

  const [formData, setFormData] = useState({
    name: existingPackage?.name || "",
    description: existingPackage?.description || "",
    quantity: existingPackage?.quantity.toString() || "1",
    price: existingPackage?.price.toString() || "0",
    displayOrder: existingPackage?.displayOrder.toString() || "0",
    currency: (existingPackage?.currency || defaultCurrency) as Currency,
  });

  const [components, setComponents] = useState<PackageComponentDraft[]>(
    existingPackage?.components?.map((component) => ({
      productId: component.productId,
      quantity: String(component.quantity),
    })) || []
  );

  const availableCompanionProducts = companionProducts.filter(
    (product) => product.id !== productId
  );

  function addComponent() {
    setComponents((prev) => [
      ...prev,
      {
        productId: "",
        quantity: "1",
      },
    ]);
  }

  function removeComponent(index: number) {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  }

  function updateComponent(
    index: number,
    patch: Partial<PackageComponentDraft>
  ) {
    setComponents((prev) =>
      prev.map((component, i) =>
        i === index ? { ...component, ...patch } : component
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const parsedComponents = components
      .filter((component) => component.productId.trim() !== "")
      .map((component) => ({
        productId: component.productId,
        quantity: Math.max(1, parseInt(component.quantity, 10) || 1),
      }));

    const uniqueIds = new Set(parsedComponents.map((c) => c.productId));
    if (uniqueIds.size !== parsedComponents.length) {
      setLoading(false);
      toast.error("Companion products cannot be duplicated in one package.");
      return;
    }

    const data = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      quantity: parseInt(formData.quantity),
      price: parseFloat(formData.price),
      currency: formData.currency,
      displayOrder: parseInt(formData.displayOrder),
      components: parsedComponents,
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
          : "Package created successfully"
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
          placeholder="e.g., 1 Knee Massager + 1 Miracle Balm (Free)"
          rows={2}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Optional description shown to customers
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Main Product Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            required
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Number of base product units in this package
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
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Total price charged to customer for this package
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
          disabled={!!existingPackage}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            {currencyOptions.map((currCode) => {
              const curr = getAvailableCurrencies().find((c) => c.code === currCode);
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
          onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Lower numbers appear first (0 = first)
        </p>
      </div>

      <div className="border rounded-md p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Companion Products</h4>
            <p className="text-xs text-muted-foreground">
              Add extra products to deduct during delivery, for example free gifts.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addComponent}
            disabled={availableCompanionProducts.length === 0}
          >
            <Plus className="size-4 mr-2" />
            Add Companion
          </Button>
        </div>

        {components.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No companion products added.
          </p>
        ) : (
          <div className="space-y-2">
            {components.map((component, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6">
                  <Label className="text-xs">Product</Label>
                  <Select
                    value={component.productId}
                    onValueChange={(value) => updateComponent(index, { productId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCompanionProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={component.quantity}
                    onChange={(e) => updateComponent(index, { quantity: e.target.value })}
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Type</Label>
                  <div className="h-10 px-3 border rounded-md flex items-center text-sm bg-muted">
                    Free companion
                  </div>
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeComponent(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : existingPackage ? "Update Package" : "Create Package"}
        </Button>
      </div>
    </form>
  );
}

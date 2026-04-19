"use client";

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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as z from "zod";
import { addStock } from "@/app/actions/products";
import type { Product } from "@prisma/client";

const updateStockSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .refine((val) => val !== 0, "Quantity cannot be zero"),
});

type UpdateStockFormValues = z.infer<typeof updateStockSchema>;

interface UpdateStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Pick<Product, "id" | "name" | "sku" | "currentStock">[];
  preselectedProductId?: string;
}

export function UpdateStockModal({
  open,
  onOpenChange,
  products,
  preselectedProductId,
}: UpdateStockModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<
    Pick<Product, "id" | "name" | "sku" | "currentStock"> | undefined
  >();

  const form = useForm<UpdateStockFormValues>({
    resolver: zodResolver(updateStockSchema),
    defaultValues: {
      productId: preselectedProductId || "",
      quantity: 0,
    },
  });

  // Handle preselected product
  useEffect(() => {
    if (open && preselectedProductId) {
      const product = products.find((p) => p.id === preselectedProductId);
      if (product) {
        form.setValue("productId", preselectedProductId);
        setSelectedProduct(product);
      }
    }
  }, [open, preselectedProductId, products, form]);

  const watchedQuantity = form.watch("quantity");

  // Update selected product when productId changes
  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setSelectedProduct(product);
  };

  async function onSubmit(values: UpdateStockFormValues) {
    setIsSubmitting(true);

    try {
      const result = await addStock(values.productId, values.quantity);

      if (result.success) {
        const action = values.quantity > 0 ? "added to" : "removed from";
        toast.success(
          `Successfully ${action} ${selectedProduct?.name || "product"}!`,
        );
        form.reset();
        setSelectedProduct(undefined);
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to update stock");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  const calculateNewStock = () => {
    if (!selectedProduct || !watchedQuantity) return null;

    const quantityNumber = Number(watchedQuantity); // <-- force numeric
    if (isNaN(quantityNumber)) return selectedProduct.currentStock;

    return selectedProduct.currentStock + quantityNumber;
  };

  const newStock = calculateNewStock();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Stock</DialogTitle>
          <DialogDescription>
            Add or remove stock from a product. Use positive numbers to add
            stock, negative numbers to remove stock.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Product Selection */}
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Product *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleProductChange(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a product..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center gap-2">
                            <Package className="size-4 text-muted-foreground" />
                            <span className="font-medium">{product.name}</span>
                            {product.sku && (
                              <span className="text-xs text-muted-foreground font-mono">
                                ({product.sku})
                              </span>
                            )}
                            <span className="ml-auto text-xs text-muted-foreground">
                              Stock: {product.currentStock}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Current Stock Display */}
            {selectedProduct && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Current Stock
                    </p>
                    <p className="text-2xl font-bold">
                      {selectedProduct.currentStock}
                    </p>
                  </div>
                  {newStock !== null && watchedQuantity !== 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">New Stock</p>
                      <p
                        className={`text-2xl font-bold ${
                          newStock < 0
                            ? "text-destructive"
                            : newStock > selectedProduct.currentStock
                              ? "text-green-500"
                              : "text-orange-500"
                        }`}
                      >
                        {newStock}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quantity Input */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity Change *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 50 or -20"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Positive numbers add stock, negative numbers remove stock
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Warning for negative stock */}
            {newStock !== null && newStock < 0 && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Warning: This will result in negative stock ({newStock})
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setSelectedProduct(undefined);
                  onOpenChange(false);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {isSubmitting ? "Updating..." : "Update Stock"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

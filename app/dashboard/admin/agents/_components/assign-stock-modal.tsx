"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { assignStockToAgent } from "@/app/actions/agents";
import { Agent, Product } from "@prisma/client";

const assignStockSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  quantity: z.coerce.number().int().positive("Must be a positive number"),
});

type AssignStockFormValues = z.infer<typeof assignStockSchema>;

interface AssignStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent | null;
}

export function AssignStockModal({
  open,
  onOpenChange,
  agent,
}: AssignStockModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<
    Pick<Product, "id" | "name" | "sku" | "currentStock">[]
  >([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const router = useRouter();
  const [diaOpen, setDiaOpen] = useState(false);

  const form = useForm<AssignStockFormValues>({
    resolver: zodResolver(assignStockSchema),
    defaultValues: {
      productId: "",
      quantity: 0,
    },
  });

  const selectedProductId = form.watch("productId");
  const selectedProduct = availableProducts.find(
    (p) => p.id === selectedProductId,
  );
  const watchedQuantity = form.watch("quantity");

  // Fetch available products when dialog opens
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    console.log("The fetchProducts function is called");
    try {
      const response = await fetch("/api/products/available");
      if (response.ok) {
        const data = await response.json();
        console.log(
          "This is the data returned when products are fetched in the assign stock modal of the agents table: ",
          data,
        );
        setAvailableProducts(data.products || []);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    setDiaOpen(newOpen);
    if (newOpen) {
      // Add the agent check here
      fetchProducts();
    } else {
      form.reset();
    }
  };

  async function onSubmit(values: AssignStockFormValues) {
    if (!agent) return;

    setIsSubmitting(true);
    try {
      const result = await assignStockToAgent(
        agent.id,
        values.productId,
        values.quantity,
      );

      if (result.success) {
        toast.success(
          `Successfully assigned ${values.quantity} units to ${agent.name}`,
        );
        form.reset();
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to assign stock");
      }
    } catch (error) {
      console.error("Error assigning stock:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (open && agent) {
      console.log("Modal opened, fetching products for agent:", agent.name);
      fetchProducts();
    } else if (!open) {
      // Reset form when modal closes
      form.reset();
    }
  }, [open, agent]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Stock to {agent?.name || "Agent"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Product Selection */}
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Product</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoadingProducts}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingProducts
                              ? "Loading products..."
                              : "Choose a product..."
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {availableProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <div>
                              <span className="font-medium">
                                {product.name}
                              </span>
                              {product.sku && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({product.sku})
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
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

            {/* Available Stock Display */}
            {selectedProduct && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Available in Warehouse
                    </p>
                    <p className="text-2xl font-bold">
                      {selectedProduct.currentStock}
                    </p>
                  </div>
                  {watchedQuantity > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Remaining After
                      </p>
                      <p
                        className={`text-2xl font-bold ${
                          selectedProduct.currentStock - watchedQuantity < 0
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {selectedProduct.currentStock - watchedQuantity}
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
                  <FormLabel>Quantity to Assign</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 50" {...field} />
                  </FormControl>
                  <FormDescription>
                    Stock will be deducted from warehouse
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Warning for insufficient stock */}
            {selectedProduct &&
              watchedQuantity > selectedProduct.currentStock && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
                  <p className="text-sm text-destructive font-medium">
                    Warning: Insufficient warehouse stock (only{" "}
                    {selectedProduct.currentStock} available)
                  </p>
                </div>
              )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  (selectedProduct &&
                    watchedQuantity > selectedProduct.currentStock)
                }
                className="flex-1"
              >
                {isSubmitting ? "Assigning..." : "Assign Stock"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Agent, AgentStock, Product, ProductPrice } from "@prisma/client";
import { AlertCircle, HatGlasses, Loader2, MapPin } from "lucide-react";
import { useState } from "react";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import { assignStockToAgent } from "@/app/actions/agents";

type AgentWithStock = Agent & {
  stock: (AgentStock & {
    product: Pick<Product, "id" | "name" | "currency"> & {
      productPrices: ProductPrice[];
    };
  })[];
};

interface AgentInventoryBreakdownProps {
  agents: AgentWithStock[];
}

const assignStockSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be positive"),
});

type AssignStockFormValues = z.infer<typeof assignStockSchema>;

export function AgentInventoryBreakdown({
  agents,
}: AgentInventoryBreakdownProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <HatGlasses className="size-5 text-primary" />
        Agent Inventory Breakdown
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentWithStock }) {
  const totalStock = agent.stock.reduce((sum, item) => sum + item.quantity, 0);
  const totalDefective = agent.stock.reduce(
    (sum, item) => sum + item.defective,
    0,
  );
  const totalMissing = agent.stock.reduce((sum, item) => sum + item.missing, 0);
  const maxCapacity = 1000; // You can make this dynamic
  const capacityPercentage = Math.min((totalStock / maxCapacity) * 100, 100);

  // Get low stock items

  return (
    <Card>
      <CardContent className="p-0">
        {/* Agent Header */}
        <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 border-2 border-primary">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {agent.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-bold">{agent.name}</h4>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3" />
                {agent.location}
              </p>
            </div>
          </div>
          <Badge
            variant={agent.isActive ? "default" : "secondary"}
            className={agent.isActive ? "bg-green-500" : ""}
          >
            {agent.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* Stock Capacity */}
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Stock Capacity</span>
            <span className="font-bold">
              {totalStock} / {maxCapacity} units (
              {capacityPercentage.toFixed(0)}%)
            </span>
          </div>
          <Progress value={capacityPercentage} className="h-2" />

          {/* Stock Breakdown */}
          <div className="mt-4 pt-4 border-t space-y-2">
            {agent.stock.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No stock assigned
              </p>
            ) : (
              agent.stock.slice(0, 3).map((stock) => (
                <div key={stock.id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {stock.product.name}
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      stock.quantity < 10
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {stock.quantity} units
                    {stock.quantity < 10 && " (Low)"}
                  </span>
                </div>
              ))
            )}
            {agent.stock.length > 3 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{agent.stock.length - 3} more products
              </p>
            )}
          </div>

          {/* Issues Alert */}
          {(totalDefective > 0 || totalMissing > 0) && (
            <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-4 text-destructive mt-0.5" />
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-destructive">
                    Issues Detected
                  </p>
                  <div className="mt-1 space-y-1 text-muted-foreground">
                    {totalDefective > 0 && (
                      <p>• {totalDefective} defective units</p>
                    )}
                    {totalMissing > 0 && <p>• {totalMissing} missing units</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-3 border-t flex gap-2">
          <AssignStockDialog agent={agent} />
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1" size="sm">
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Agent Details - {agent.name}</DialogTitle>
              </DialogHeader>
              <AgentDetailsModal agent={agent} />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentDetailsModal({ agent }: { agent: AgentWithStock }) {
  const totalStock = agent.stock.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = agent.stock.reduce((sum, item) => {
    const productPrice = item.product.productPrices.find(
      (p) => p.currency === item.product.currency
    );
    const price = productPrice?.price || 0;
    return sum + item.quantity * price;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Agent Information */}
      <div>
        <h3 className="font-semibold mb-3">Agent Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-semibold">{agent.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-semibold">{agent.phone}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="font-semibold">{agent.location}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={agent.isActive ? "default" : "secondary"}>
              {agent.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        {agent.address && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">Address</p>
            <p className="font-semibold">{agent.address}</p>
          </div>
        )}
      </div>

      {/* Stock Summary */}
      <div>
        <h3 className="font-semibold mb-3">Stock Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Units</p>
              <p className="text-2xl font-bold">{totalStock}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">
                ₦{totalValue.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Products</p>
              <p className="text-2xl font-bold">{agent.stock.length}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Stock List */}
      <div>
        <h3 className="font-semibold mb-3">Stock Details</h3>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Defective</TableHead>
                <TableHead className="text-right">Missing</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agent.stock.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No stock assigned
                  </TableCell>
                </TableRow>
              ) : (
                agent.stock.map((stock) => {
                  const productPrice = stock.product.productPrices.find(
                    (p) => p.currency === stock.product.currency
                  );
                  const price = productPrice?.price || 0;
                  return (
                    <TableRow key={stock.id}>
                    <TableCell className="font-medium">
                      {stock.product.name}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {stock.quantity}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {stock.defective}
                    </TableCell>
                    <TableCell className="text-right text-orange-500">
                      {stock.missing}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₦{(stock.quantity * price).toLocaleString()}
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function AssignStockDialog({ agent }: { agent: AgentWithStock }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<
    Pick<Product, "id" | "name" | "currentStock">[]
  >([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

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
    try {
      const response = await fetch("/api/products/available");
      if (response.ok) {
        const data = await response.json();
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
    setOpen(newOpen);
    if (newOpen) {
      fetchProducts();
    } else {
      form.reset();
    }
  };

  const onSubmit = async (values: AssignStockFormValues) => {
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
        setOpen(false);
      } else {
        toast.error(result.error || "Failed to assign stock");
      }
    } catch (error) {
      console.error("Error assigning stock:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex-1" size="sm">
          Assign Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Stock to {agent.name}</DialogTitle>
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
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{product.name}</span>
                            <span className="ml-4 text-xs text-muted-foreground">
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
                  <FormLabel>Quantity to Assign *</FormLabel>
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
                    ⚠️ Warning: Insufficient warehouse stock (only{" "}
                    {selectedProduct.currentStock} available)
                  </p>
                </div>
              )}

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
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
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {isSubmitting ? "Assigning..." : "Assign Stock"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

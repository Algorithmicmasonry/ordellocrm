"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { createExpense, createProductBatch, getProductBatches } from "@/app/actions/expenses";
import { useRouter } from "next/navigation";
import { getAvailableCurrencies, getCurrencySymbol } from "@/lib/currency";
import { Loader2, Plus } from "lucide-react";
import type { Currency } from "@prisma/client";

const BATCH_TYPES = ["clearing", "waybill"] as const;

const expenseSchema = z.object({
  type: z.enum(["ad_spend", "delivery", "clearing", "waybill", "other"]),
  amount: z.number().positive("Amount must be greater than 0"),
  currency: z.enum(["NGN", "GHS", "USD", "GBP", "EUR"]),
  date: z.string(),
  productId: z.string().optional(),
  description: z.string().optional(),
  batchId: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface Batch {
  id: string;
  name: string;
  quantity: number;
  date: Date;
}

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Array<{ id: string; name: string }>;
}

export function AddExpenseModal({
  open,
  onOpenChange,
  products,
}: AddExpenseModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchQuantity, setNewBatchQuantity] = useState("");
  const [creatingBatch, setCreatingBatch] = useState(false);
  const router = useRouter();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      type: "other",
      amount: 0,
      currency: "NGN",
      date: new Date().toISOString().split("T")[0],
      productId: "general",
      description: "",
      batchId: undefined,
    },
  });

  const watchedType = form.watch("type");
  const watchedProductId = form.watch("productId");
  const isBatchType = (BATCH_TYPES as readonly string[]).includes(watchedType);
  const hasProduct = watchedProductId && watchedProductId !== "general";

  // Load batches when product changes and type is clearing/waybill
  useEffect(() => {
    if (!isBatchType || !hasProduct) {
      setBatches([]);
      form.setValue("batchId", undefined);
      return;
    }
    setLoadingBatches(true);
    getProductBatches(watchedProductId).then((res) => {
      setBatches(res.batches as Batch[]);
      setLoadingBatches(false);
    });
  }, [watchedProductId, isBatchType]);

  // Reset batch fields when type changes away from batch type
  useEffect(() => {
    if (!isBatchType) {
      form.setValue("batchId", undefined);
      setShowNewBatch(false);
    }
  }, [isBatchType]);

  const handleCreateBatch = async () => {
    if (!newBatchName.trim() || !newBatchQuantity || !hasProduct) return;
    setCreatingBatch(true);
    const result = await createProductBatch({
      productId: watchedProductId,
      name: newBatchName.trim(),
      quantity: parseInt(newBatchQuantity),
    });
    if (result.success && result.batch) {
      const newBatch = result.batch as Batch;
      setBatches((prev) => [newBatch, ...prev]);
      form.setValue("batchId", newBatch.id);
      setShowNewBatch(false);
      setNewBatchName("");
      setNewBatchQuantity("");
      toast.success("Batch created");
    } else {
      toast.error("Failed to create batch");
    }
    setCreatingBatch(false);
  };

  async function onSubmit(values: ExpenseFormValues) {
    if (isBatchType && hasProduct && !values.batchId) {
      toast.error("Please select or create a batch for this expense");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createExpense({
        type: values.type,
        amount: values.amount,
        batchId: values.batchId,
        currency: values.currency as Currency,
        date: new Date(values.date),
        productId: values.productId === "general" ? undefined : values.productId,
        description: values.description || undefined,
      });

      if (result.success) {
        toast.success("Expense created successfully!");
        form.reset();
        setBatches([]);
        setShowNewBatch(false);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create expense");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto flex-1 pr-1">

            {/* Expense Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select expense type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ad_spend">Ad Spend</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="clearing">Clearing & Shipping</SelectItem>
                      <SelectItem value="waybill">Waybill</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Amount ({getCurrencySymbol(form.watch("currency") as Currency)})
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Currency */}
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getAvailableCurrencies().map((curr) => (
                        <SelectItem key={curr.code} value={curr.code}>
                          {curr.symbol} - {curr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Product */}
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product or leave as general expense" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">General Expense</SelectItem>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Link this expense to a specific product</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Batch selector — only for clearing/waybill with a product selected */}
            {isBatchType && hasProduct && (
              <FormField
                control={form.control}
                name="batchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch <span className="text-destructive">*</span></FormLabel>
                    {loadingBatches ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Loading batches...
                      </div>
                    ) : (
                      <>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(v) => {
                            field.onChange(v === "new" ? undefined : v);
                            if (v === "new") setShowNewBatch(true);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a batch" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {batches.map((batch) => (
                              <SelectItem key={batch.id} value={batch.id}>
                                {batch.name} ({batch.quantity} units)
                              </SelectItem>
                            ))}
                            <SelectItem value="new">
                              <span className="flex items-center gap-1 text-primary font-medium">
                                <Plus className="size-3.5" /> Create new batch
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Inline new batch form */}
                        {showNewBatch && (
                          <div className="mt-2 p-3 border rounded-lg space-y-2 bg-muted/50">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Batch</p>
                            <Input
                              placeholder='Batch name e.g. "Mar 2026 Batch"'
                              value={newBatchName}
                              onChange={(e) => setNewBatchName(e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Number of units"
                              value={newBatchQuantity}
                              onChange={(e) => setNewBatchQuantity(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleCreateBatch}
                                disabled={creatingBatch || !newBatchName.trim() || !newBatchQuantity}
                              >
                                {creatingBatch && <Loader2 className="size-3 mr-1 animate-spin" />}
                                Create
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowNewBatch(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <FormDescription>
                      Clearing and waybill costs are tied to a batch so the per-unit landed cost is accurate.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter expense details..."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <div className="flex gap-3 pt-4 border-t">
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
            disabled={isSubmitting}
            className="flex-1"
            onClick={form.handleSubmit(onSubmit)}
          >
            {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
            {isSubmitting ? "Creating..." : "Create Expense"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
import { updateExpense } from "@/app/actions/expenses";
import { useRouter } from "next/navigation";

const BATCH_TYPES = ["clearing", "waybill"] as const;

const expenseSchema = z.object({
  type: z.enum(["ad_spend", "delivery", "clearing", "waybill", "other"]),
  amount: z.number().positive("Amount must be greater than 0"),
  batchQuantity: z.number().int().positive().optional(),
  date: z.string(),
  productId: z.string().optional(),
  description: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface Expense {
  id: string;
  type: string;
  amount: number;
  batchQuantity: number | null;
  description: string | null;
  date: Date;
  productId: string | null;
}

interface EditExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense;
  products: Array<{ id: string; name: string }>;
}

export function EditExpenseModal({
  open,
  onOpenChange,
  expense,
  products,
}: EditExpenseModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      type: expense.type as ExpenseFormValues["type"],
      amount: expense.amount,
      batchQuantity: expense.batchQuantity ?? undefined,
      date: new Date(expense.date).toISOString().split("T")[0],
      productId: expense.productId ?? "general",
      description: expense.description || "",
    },
  });

  const watchedType = form.watch("type");
  const isBatchType = (BATCH_TYPES as readonly string[]).includes(watchedType);

  // Reset form when expense changes
  useEffect(() => {
    form.reset({
      type: expense.type as ExpenseFormValues["type"],
      amount: expense.amount,
      batchQuantity: expense.batchQuantity ?? undefined,
      date: new Date(expense.date).toISOString().split("T")[0],
      productId: expense.productId ?? "general",
      description: expense.description || "",
    });
  }, [expense, form]);

  async function onSubmit(values: ExpenseFormValues) {
    setIsSubmitting(true);
    try {
      const result = await updateExpense(expense.id, {
        type: values.type,
        amount: values.amount,
        batchQuantity: isBatchType ? (values.batchQuantity ?? null) : null,
        date: new Date(values.date),
        productId:
          values.productId === "general" ? undefined : values.productId,
        description: values.description || undefined,
      });

      if (result.success) {
        toast.success("Expense updated successfully!");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update expense");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Expense Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
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
                  <FormLabel>Amount (₦)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value))
                      }
                    />
                  </FormControl>
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

            {/* Product (Optional) */}
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
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
                  <FormDescription>
                    Link this expense to a specific product
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Batch Quantity (clearing & waybill only) */}
            {isBatchType && (
              <FormField
                control={form.control}
                name="batchQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Quantity (Units)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Total units this cost covers"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Per-unit cost = Amount ÷ Quantity. Only the portion
                      attributable to units sold is charged per period.
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
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Updating..." : "Update Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { AgentStock, Product } from "@prisma/client";

const reconcileStockSchema = z.object({
  returnedQuantity: z.coerce.number().int().min(0, "Cannot be negative"),
  defective: z.coerce.number().int().min(0, "Cannot be negative"),
  missing: z.coerce.number().int().min(0, "Cannot be negative"),
  notes: z.string().optional(),
});

type ReconcileStockFormValues = z.infer<typeof reconcileStockSchema>;

interface ReconcileStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentStock:
    | (AgentStock & { product: Product; agent: { name: string } })
    | null;
  onReconcile: (data: {
    agentId: string;
    productId: string;
    returnedQuantity: number;
    defective: number;
    missing: number;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function ReconcileStockModal({
  open,
  onOpenChange,
  agentStock,
  onReconcile,
}: ReconcileStockModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<ReconcileStockFormValues>({
    resolver: zodResolver(reconcileStockSchema),
    defaultValues: {
      returnedQuantity: 0,
      defective: 0,
      missing: 0,
      notes: "",
    },
  });

  const returnedQuantity = Number(form.watch("returnedQuantity")) || 0;
  const defective = Number(form.watch("defective")) || 0;
  const missing = Number(form.watch("missing")) || 0;

  const currentQuantity = agentStock?.quantity || 0;
  const totalReconciled = returnedQuantity + defective + missing;
  const remaining = currentQuantity - totalReconciled;
  const isValid = totalReconciled <= currentQuantity;

  async function onSubmit(values: ReconcileStockFormValues) {
    if (!agentStock) return;

    setIsSubmitting(true);
    try {
      const result = await onReconcile({
        agentId: agentStock.agentId,
        productId: agentStock.productId,
        returnedQuantity: values.returnedQuantity,
        defective: values.defective,
        missing: values.missing,
        notes: values.notes,
      });

      if (result.success) {
        toast.success("Stock reconciled successfully!");
        form.reset();
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to reconcile stock");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Reconcile Stock</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-1">
          {agentStock && (
            <div className="rounded-lg border bg-muted/50 p-4 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Agent</p>
                  <p className="font-semibold">{agentStock.agent.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Product</p>
                  <p className="font-semibold">{agentStock.product.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Current Quantity
                  </p>
                  <p className="text-2xl font-bold">{currentQuantity}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    After Reconciliation
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      !isValid ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {remaining}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Returned Quantity */}
              <FormField
                control={form.control}
                name="returnedQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Returned to Warehouse</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormDescription>
                      Good stock returned to warehouse
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Defective Count */}
              <FormField
                control={form.control}
                name="defective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Defective Items</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormDescription>
                      Damaged or defective items
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Missing Count */}
              <FormField
                control={form.control}
                name="missing"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Missing Items</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormDescription>Lost or unaccounted items</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this reconciliation..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Validation Error */}
              {!isValid && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
                  <p className="text-sm text-destructive font-medium">
                    Total reconciled ({totalReconciled}) exceeds current
                    quantity ({currentQuantity})
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4 sticky bottom-0 bg-background pb-2">
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
                  disabled={isSubmitting || !isValid}
                  className="flex-1"
                >
                  {isSubmitting ? "Reconciling..." : "Reconcile Stock"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

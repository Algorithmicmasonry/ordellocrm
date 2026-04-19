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
import { Card } from "@/components/ui/card";
import toast from "react-hot-toast";
import { Agent } from "@prisma/client";

const settlementSchema = z.object({
  cashCollected: z.coerce.number().min(0, "Cannot be negative"),
  cashReturned: z.coerce.number().min(0, "Cannot be negative"),
  adjustments: z.coerce.number(),
  notes: z.string().optional(),
});

type SettlementFormValues = z.infer<typeof settlementSchema>;

interface SettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent | null;
  stockValue: number;
  pendingDeliveries: number;
  lastSettlement?: { settledAt: Date } | null;
  onSubmit: (data: {
    agentId: string;
    stockValue: number;
    cashCollected: number;
    cashReturned: number;
    adjustments: number;
    notes?: string;
    settledBy: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function SettlementDialog({
  open,
  onOpenChange,
  agent,
  stockValue,
  pendingDeliveries,
  lastSettlement,
  onSubmit,
}: SettlementDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      cashCollected: 0,
      cashReturned: 0,
      adjustments: 0,
      notes: "",
    },
  });

  const cashCollected = form.watch("cashCollected") || 0;
  const cashReturned = form.watch("cashReturned") || 0;
  const adjustments = form.watch("adjustments") || 0;

  // Balance Due = Stock Value + Cash Collected - Cash Returned + Adjustments
  const balanceDue = stockValue + cashCollected - cashReturned + adjustments;

  async function handleSubmit(values: SettlementFormValues) {
    if (!agent) return;

    setIsSubmitting(true);
    try {
      const result = await onSubmit({
        agentId: agent.id,
        stockValue,
        cashCollected: values.cashCollected,
        cashReturned: values.cashReturned,
        adjustments: values.adjustments,
        notes: values.notes,
        settledBy: "current-user", // TODO: Get from session
      });

      if (result.success) {
        toast.success("Settlement recorded successfully!");
        form.reset();
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to record settlement");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Settlement - {agent?.name}</DialogTitle>
        </DialogHeader>

        {/* Current State */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Stock Value</p>
            <p className="text-xl font-bold">₦{stockValue.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">
              Pending Deliveries
            </p>
            <p className="text-xl font-bold">{pendingDeliveries}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">
              Last Settlement
            </p>
            <p className="text-sm font-semibold">
              {lastSettlement
                ? new Date(lastSettlement.settledAt).toLocaleDateString()
                : "Never"}
            </p>
          </Card>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Cash Collected */}
              <FormField
                control={form.control}
                name="cashCollected"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cash Collected (₦)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormDescription>
                      Total cash from delivered orders
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cash Returned */}
              <FormField
                control={form.control}
                name="cashReturned"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cash Returned (₦)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormDescription>
                      Cash remitted to company
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Adjustments */}
            <FormField
              control={form.control}
              name="adjustments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustments (₦)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Deductions (-) or bonuses (+). Use negative for deductions.
                  </FormDescription>
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
                      placeholder="Additional notes about this settlement..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Balance Due Calculation */}
            <Card className="p-4 bg-muted/50">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stock Value:</span>
                  <span>₦{stockValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cash Collected:</span>
                  <span>₦{cashCollected.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cash Returned:</span>
                  <span className="text-destructive">
                    -₦{cashReturned.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Adjustments:</span>
                  <span className={adjustments < 0 ? "text-destructive" : ""}>
                    {adjustments >= 0 ? "+" : ""}₦{adjustments.toLocaleString()}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Balance Due:</span>
                    <span
                      className={`text-xl font-bold ${
                        balanceDue > 0
                          ? "text-orange-600"
                          : balanceDue < 0
                            ? "text-green-600"
                            : "text-muted-foreground"
                      }`}
                    >
                      ₦{balanceDue.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {balanceDue > 0
                      ? "Agent owes company"
                      : balanceDue < 0
                        ? "Company owes agent"
                        : "Settled"}
                  </p>
                </div>
              </div>
            </Card>

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
                {isSubmitting ? "Recording..." : "Record Settlement"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

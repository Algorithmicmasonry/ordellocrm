"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { deleteExpense } from "@/app/actions/expenses";
import { useRouter } from "next/navigation";

const expenseTypeConfig: Record<string, { label: string }> = {
  ad_spend: { label: "Ad Spend" },
  delivery: { label: "Delivery" },
  shipping: { label: "Shipping" },
  clearing: { label: "Clearing" },
  other: { label: "Other" },
};

interface Expense {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  date: Date;
  product: { id: string; name: string } | null;
}

interface DeleteExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense;
}

export function DeleteExpenseDialog({
  open,
  onOpenChange,
  expense,
}: DeleteExpenseDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteExpense(expense.id);

      if (result.success) {
        toast.success("Expense deleted successfully!");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete expense");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Expense</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this expense? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Expense Details */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Type:</span>
            <Badge variant="outline">
              {expenseTypeConfig[expense.type]?.label ||
                expense.type.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount:</span>
            <span className="font-bold">
              ₦{expense.amount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Date:</span>
            <span className="text-sm">
              {new Date(expense.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          {expense.product && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Product:</span>
              <span className="text-sm font-medium">
                {expense.product.name}
              </span>
            </div>
          )}
          {expense.description && (
            <div className="pt-2 border-t">
              <span className="text-sm text-muted-foreground">
                Description:
              </span>
              <p className="text-sm mt-1">{expense.description}</p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete Expense"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

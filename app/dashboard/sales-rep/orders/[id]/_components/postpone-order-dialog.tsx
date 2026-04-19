"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Clock, Loader2 } from "lucide-react";
import { updateOrderStatus } from "../actions";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface PostponeOrderDialogProps {
  orderId: string;
  orderNumber: number;
}

export function PostponeOrderDialog({ orderId, orderNumber }: PostponeOrderDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handlePostpone = () => {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, "POSTPONED");

      if (result.success) {
        toast.success("Order postponed");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to postpone order");
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-950">
          <Clock className="size-4 mr-2" />
          Postpone Order
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Postpone Order</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to postpone order <strong>{orderNumber}</strong>?
            This will mark the order as postponed and you can resume it later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handlePostpone();
            }}
            disabled={isPending}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
            Yes, Postpone Order
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

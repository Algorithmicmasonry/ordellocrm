"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { updateOrderStatus } from "../actions";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface ConfirmOrderButtonProps {
  orderId: string;
}

export function ConfirmOrderButton({ orderId }: ConfirmOrderButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, "CONFIRMED");

      if (result.success) {
        toast.success("Order confirmed successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to confirm order");
      }
    });
  };

  return (
    <Button
      onClick={handleConfirm}
      disabled={isPending}
      className="shadow-lg shadow-primary/20"
    >
      {isPending ? (
        <Loader2 className="size-4 mr-2 animate-spin" />
      ) : (
        <CheckCircle className="size-4 mr-2" />
      )}
      Confirm Order
    </Button>
  );
}

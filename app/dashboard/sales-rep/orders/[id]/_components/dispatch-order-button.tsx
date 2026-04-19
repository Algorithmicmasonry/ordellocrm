"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { updateOrderStatus } from "../actions";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface DispatchOrderButtonProps {
  orderId: string;
}

export function DispatchOrderButton({ orderId }: DispatchOrderButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDispatch = () => {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, "DISPATCHED");

      if (result.success) {
        toast.success("Order marked as dispatched");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to dispatch order");
      }
    });
  };

  return (
    <Button
      onClick={handleDispatch}
      disabled={isPending}
      className="shadow-lg shadow-primary/20"
    >
      {isPending ? (
        <Loader2 className="size-4 mr-2 animate-spin" />
      ) : (
        <MessageCircle className="size-4 mr-2" />
      )}
      Mark as Dispatched
    </Button>
  );
}

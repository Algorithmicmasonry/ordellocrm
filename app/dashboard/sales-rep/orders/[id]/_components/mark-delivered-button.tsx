"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PackageCheck, Loader2 } from "lucide-react";
import { updateOrderStatus } from "../actions";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface MarkDeliveredButtonProps {
  orderId: string;
}

export function MarkDeliveredButton({ orderId }: MarkDeliveredButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDeliver = () => {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, "DELIVERED");

      if (result.success) {
        toast.success("Order marked as delivered");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to mark as delivered");
      }
    });
  };

  return (
    <Button
      onClick={handleDeliver}
      disabled={isPending}
      className="shadow-lg shadow-primary/20"
      variant="default"
    >
      {isPending ? (
        <Loader2 className="size-4 mr-2 animate-spin" />
      ) : (
        <PackageCheck className="size-4 mr-2" />
      )}
      Mark as Delivered
    </Button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { updateOrderStatus } from "../actions";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";

interface ChangeStatusDialogProps {
  orderId: string;
  currentStatus: string;
  orderNumber: number;
  agentId: string | null;
}

const STATUS_OPTIONS = [
  {
    value: "NEW",
    label: "New",
    description: "Order just placed, awaiting confirmation",
  },
  {
    value: "CONFIRMED",
    label: "Confirmed",
    description: "Order confirmed, ready for agent assignment",
  },
  {
    value: "DISPATCHED",
    label: "Dispatched",
    description: "Order dispatched for delivery",
  },
  {
    value: "DELIVERED",
    label: "Delivered",
    description: "Order successfully delivered to customer",
  },
  {
    value: "POSTPONED",
    label: "Postponed",
    description: "Order delivery postponed",
  },
  {
    value: "NOT_REACHABLE",
    label: "Not reachable",
    description: "Customer could not be reached",
  },
  {
    value: "NOT_PICKING_CALLS",
    label: "Not Picking Calls",
    description: "Customer is not answering calls",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    description: "Order cancelled",
  },
 ] as const;

type StatusOptionValue = (typeof STATUS_OPTIONS)[number]["value"];

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-amber-500/20 text-amber-700 border-amber-500/30",
  CONFIRMED: "bg-green-500/20 text-green-700 border-green-500/30",
  DISPATCHED: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  DELIVERED: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30",
  CANCELLED: "bg-red-500/20 text-red-700 border-red-500/30",
  POSTPONED: "bg-orange-500/20 text-orange-700 border-orange-500/30",
  NOT_REACHABLE: "bg-slate-500/20 text-slate-700 border-slate-500/30",
  NOT_PICKING_CALLS: "bg-rose-500/20 text-rose-700 border-rose-500/30",
};

export function ChangeStatusDialog({
  orderId,
  currentStatus,
  orderNumber,
  agentId,
}: ChangeStatusDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState<StatusOptionValue | "">("");
  const [reason, setReason] = useState("");

  const handleStatusChange = () => {
    if (!selectedStatus || selectedStatus === currentStatus) {
      toast.error("Please select a different status");
      return;
    }

    if (selectedStatus === "DISPATCHED" && !agentId) {
      toast.error(
        "An agent must be assigned before dispatching. Scroll down to the Fulfillment Assignment section to assign one.",
        { duration: 5000 }
      );
      return;
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for the status change");
      return;
    }

    startTransition(async () => {
      const result = await updateOrderStatus(orderId, selectedStatus, reason);

      if (result.success) {
        toast.success(`Order status changed to ${selectedStatus}`);
        setOpen(false);
        setSelectedStatus("");
        setReason("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to change order status");
      }
    });
  };

  const getWarningMessage = () => {
    if (currentStatus === "DELIVERED" && selectedStatus && selectedStatus !== "DELIVERED") {
      return "⚠️ Warning: Reverting from DELIVERED will restore inventory. This action affects stock levels.";
    }
    if (selectedStatus === "DELIVERED" && currentStatus !== "DELIVERED") {
      return "⚠️ Warning: Marking as DELIVERED will deduct inventory. Ensure the order was actually delivered.";
    }
    if (selectedStatus === "CANCELLED") {
      return "⚠️ Warning: Cancelling an order is significant. Make sure this is intentional.";
    }
    return null;
  };

  const warningMessage = getWarningMessage();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="size-4" />
          Change Status
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Change Order Status</DialogTitle>
          <DialogDescription>
            Change the status of order <strong>{orderNumber}</strong>. This allows you to
            revert accidental status updates or manually adjust the order state.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div>
            <Label className="text-xs text-muted-foreground">Current Status</Label>
            <div className="mt-1.5">
              <Badge variant="outline" className={STATUS_COLORS[currentStatus]}>
                {STATUS_OPTIONS.find((opt) => opt.value === currentStatus)?.label || currentStatus}
              </Badge>
            </div>
          </div>

          {/* New Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="status">New Status *</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as StatusOptionValue)}
              disabled={isPending}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.value === currentStatus}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason for Change */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Status Change *</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Customer requested postponement, Accidental status update, Agent unavailable, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isPending}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This reason will be logged for tracking purposes
            </p>
          </div>

          {/* Warning Message */}
          {warningMessage && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
              <AlertCircle className="size-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900 dark:text-amber-200">
                {warningMessage}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              setSelectedStatus("");
              setReason("");
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStatusChange}
            disabled={isPending || !selectedStatus || !reason.trim()}
          >
            {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
            Change Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

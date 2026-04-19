"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { resetRoundRobinSequence } from "@/app/actions/round-robin";

interface ResetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResetModal({ open, onOpenChange }: ResetModalProps) {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const result = await resetRoundRobinSequence();
      if (result.success) {
        toast.success(
          result.message || "Round-robin sequence has been reset"
        );
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to reset sequence");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-4 text-red-600 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20">
              <AlertTriangle className="size-6" />
            </div>
            <DialogTitle className="text-xl">
              Reset Assignment Order?
            </DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed pt-2">
            This will revert the assignment sequence to alphabetical order and
            reset all exclusion filters. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isResetting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? "Resetting..." : "Confirm Reset"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { deleteAgent } from "@/app/actions/agents";
import { Agent } from "@prisma/client";

interface DeleteAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent | null;
}

export function DeleteAgentDialog({
  open,
  onOpenChange,
  agent,
}: DeleteAgentDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!agent) return;

    setIsDeleting(true);
    try {
      const result = await deleteAgent(agent.id);
      if (result.success) {
        toast.success("Agent deleted successfully!");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete agent");
      }
    } catch (error) {
      toast.error("An error occurred while deleting agent");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Agent</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {agent?.name}
              </span>
              ?
            </span>
            <br />
            <span className="text-destructive font-medium">
              This action cannot be undone. The agent will be permanently
              removed from the system.
            </span>
            <span className="text-sm text-muted-foreground">
              Note: You cannot delete an agent with active orders or stock
              holdings.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Agent"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

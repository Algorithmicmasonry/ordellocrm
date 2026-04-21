"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setRepRate } from "../actions";
import { toast } from "sonner";
import { formatRole } from "@/lib/utils";
import type { OrgMemberRole } from "@prisma/client";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userRole: OrgMemberRole;
  currentRate: number | null;
}

export function SetRateDialog({
  open,
  onClose,
  userId,
  userName,
  userRole,
  currentRate,
}: Props) {
  const [rate, setRate] = useState(currentRate?.toString() ?? "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const parsed = parseFloat(rate);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Please enter a valid rate greater than 0.");
      return;
    }
    setLoading(true);
    const result = await setRepRate(userId, parsed);
    setLoading(false);
    if (result.success) {
      toast.success(`Rate updated for ${userName}.`);
      onClose();
    } else {
      toast.error(result.error ?? "Failed to update rate.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Set Pay Rate</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{userName}</span>
            {" · "}
            {formatRole(userRole)}
          </p>
          {userRole === "ADMIN" && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
              Admin pay is calculated based on <strong>all</strong> orders delivered system-wide.
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="rate">Rate per delivered order (₦)</Label>
            <Input
              id="rate"
              type="number"
              min="1"
              step="100"
              placeholder="e.g. 2000"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save Rate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

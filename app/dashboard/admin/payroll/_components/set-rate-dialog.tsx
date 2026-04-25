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
import type { OrgMemberRole, PaymentType } from "@prisma/client";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userRole: OrgMemberRole;
  currentPaymentType: PaymentType | null;
  currentRate: number | null;
  currentFixedSalary: number | null;
}

export function SetRateDialog({
  open,
  onClose,
  userId,
  userName,
  userRole,
  currentPaymentType,
  currentRate,
  currentFixedSalary,
}: Props) {
  const [paymentType, setPaymentType] = useState<PaymentType>(currentPaymentType ?? "COMMISSION");
  const [rate, setRate] = useState(currentRate?.toString() ?? "");
  const [fixedSalary, setFixedSalary] = useState(currentFixedSalary?.toString() ?? "");
  const [loading, setLoading] = useState(false);

  const showRate = paymentType === "COMMISSION" || paymentType === "HYBRID";
  const showFixed = paymentType === "FIXED" || paymentType === "HYBRID";

  const handleSave = async () => {
    const parsedRate = showRate ? parseFloat(rate) : 0;
    const parsedFixed = showFixed ? parseFloat(fixedSalary) : 0;

    if (showRate && (isNaN(parsedRate) || parsedRate <= 0)) {
      toast.error("Please enter a valid rate per order greater than 0.");
      return;
    }
    if (showFixed && (isNaN(parsedFixed) || parsedFixed <= 0)) {
      toast.error("Please enter a valid fixed salary greater than 0.");
      return;
    }

    setLoading(true);
    const result = await setRepRate(userId, paymentType, parsedRate, parsedFixed);
    setLoading(false);
    if (result.success) {
      toast.success(`Pay structure updated for ${userName}.`);
      onClose();
    } else {
      toast.error(result.error ?? "Failed to update pay structure.");
    }
  };

  const typeOptions: { value: PaymentType; label: string; description: string }[] = [
    { value: "COMMISSION", label: "Commission", description: "Paid per delivered order" },
    { value: "FIXED", label: "Fixed Salary", description: "Fixed monthly amount" },
    { value: "HYBRID", label: "Fixed + Commission", description: "Monthly salary plus per-order bonus" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Set Pay Structure</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{userName}</span>
            {" · "}
            {formatRole(userRole)}
          </p>
          {userRole === "ADMIN" && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
              Admin commission is calculated based on <strong>all</strong> orders delivered system-wide.
            </p>
          )}

          {/* Payment Type Selector */}
          <div className="space-y-2">
            <Label>Payment Type</Label>
            <div className="grid grid-cols-1 gap-2">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPaymentType(opt.value)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    paymentType === opt.value
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-xs opacity-70">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Fixed Salary Input */}
          {showFixed && (
            <div className="space-y-1.5">
              <Label htmlFor="fixed">Fixed monthly salary (₦)</Label>
              <Input
                id="fixed"
                type="number"
                min="1"
                step="1000"
                placeholder="e.g. 50000"
                value={fixedSalary}
                onChange={(e) => setFixedSalary(e.target.value)}
              />
            </div>
          )}

          {/* Commission Rate Input */}
          {showRate && (
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
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

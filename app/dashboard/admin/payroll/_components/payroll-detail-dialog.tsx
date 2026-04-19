"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PayrollPreviewTable } from "./payroll-preview-table";
import { markPayrollPaid, deletePayroll } from "../actions";
import { toast } from "sonner";
import { useState } from "react";
import { formatRole } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

interface PayrollItem {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  ordersDelivered: number;
  ratePerOrder: number;
  baseAmount: number;
  hohWeeks: number;
  hohBonus: number;
  totalAmount: number;
}

interface PayrollRecord {
  id: string;
  label: string;
  monthYear: string;
  status: "DRAFT" | "PAID";
  totalAmount: number;
  notes: string | null;
  paidAt: Date | null;
  createdBy: { name: string };
  items: PayrollItem[];
}

interface Props {
  payroll: PayrollRecord | null;
  onClose: () => void;
}

const fmt = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
});

export function PayrollDetailDialog({ payroll, onClose }: Props) {
  const [loading, setLoading] = useState(false);

  if (!payroll) return null;

  const handlePay = async () => {
    setLoading(true);
    const result = await markPayrollPaid(payroll.id);
    setLoading(false);
    if (result.success) {
      toast.success("Payroll marked as paid.");
      onClose();
    } else {
      toast.error(result.error ?? "Failed.");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this draft payroll?")) return;
    setLoading(true);
    const result = await deletePayroll(payroll.id);
    setLoading(false);
    if (result.success) {
      toast.success("Draft deleted.");
      onClose();
    } else {
      toast.error(result.error ?? "Failed.");
    }
  };

  return (
    <Dialog open={!!payroll} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>{payroll.label}</DialogTitle>
            <Badge variant={payroll.status === "PAID" ? "default" : "secondary"}>
              {payroll.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span>Period: {payroll.monthYear}</span>
            <span>Created by: {payroll.createdBy.name}</span>
            {payroll.paidAt && (
              <span>
                Paid:{" "}
                {new Date(payroll.paidAt).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          {payroll.notes && (
            <p className="text-sm bg-muted/50 rounded-md px-3 py-2">
              {payroll.notes}
            </p>
          )}

          <PayrollPreviewTable
            items={payroll.items.map((item) => ({
              userId: item.userId,
              userName: item.userName,
              userRole: item.userRole,
              ordersDelivered: item.ordersDelivered,
              ratePerOrder: item.ratePerOrder,
              baseAmount: item.baseAmount,
              hohWeeks: item.hohWeeks,
              hohBonus: item.hohBonus,
              totalAmount: item.totalAmount,
            }))}
            totalAmount={payroll.totalAmount}
          />

          {payroll.status === "PAID" && (
            <p className="text-sm text-emerald-600">
              {fmt.format(payroll.totalAmount)} recorded as "Salaries & Payroll" expense.
            </p>
          )}

          {payroll.status === "DRAFT" && (
            <div className="flex gap-3">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
              >
                Delete Draft
              </Button>
              <Button size="sm" onClick={handlePay} disabled={loading}>
                {loading ? "Processing…" : "Mark as Paid"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  previewPayroll,
  generatePayroll,
  markPayrollPaid,
  deletePayroll,
} from "../actions";
import { PayrollPreviewTable, type PreviewItem } from "./payroll-preview-table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, CheckCircle, Trash2 } from "lucide-react";

interface ExistingPayroll {
  id: string;
  label: string;
  monthYear: string;
  status: "DRAFT" | "PAID";
  totalAmount: number;
  paidAt: Date | null;
  items: (PreviewItem & { id: string })[];
}

interface Props {
  existingDraft?: ExistingPayroll | null;
}

const fmt = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
});

export function RunPayrollTab({ existingDraft }: Props) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [monthYear, setMonthYear] = useState(defaultMonth);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<{
    items: PreviewItem[];
    totalAmount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handlePreview = async () => {
    if (!monthYear) return;
    setLoading(true);
    setPreview(null);
    const result = await previewPayroll(monthYear);
    setLoading(false);
    if (result.success && result.data) {
      setPreview({ items: result.data.items, totalAmount: result.data.totalAmount });
      if (!label) {
        const [y, m] = monthYear.split("-");
        const d = new Date(parseInt(y), parseInt(m) - 1, 1);
        setLabel(
          `${d.toLocaleString("en-NG", { month: "long" })} ${y} Payroll`
        );
      }
    } else {
      toast.error(result.error ?? "Failed to preview payroll.");
    }
  };

  const handleGenerate = async () => {
    if (!preview || !label.trim()) {
      toast.error("Please preview first and provide a label.");
      return;
    }
    setActionLoading(true);
    const result = await generatePayroll(monthYear, label.trim(), notes.trim() || undefined);
    setActionLoading(false);
    if (result.success) {
      toast.success("Payroll draft saved.");
      setPreview(null);
    } else {
      toast.error(result.error ?? "Failed to generate payroll.");
    }
  };

  const handleMarkPaid = async (id: string) => {
    setActionLoading(true);
    const result = await markPayrollPaid(id);
    setActionLoading(false);
    if (result.success) {
      toast.success("Payroll marked as paid. Expense recorded.");
    } else {
      toast.error(result.error ?? "Failed to mark as paid.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this draft payroll?")) return;
    setActionLoading(true);
    const result = await deletePayroll(id);
    setActionLoading(false);
    if (result.success) {
      toast.success("Payroll draft deleted.");
    } else {
      toast.error(result.error ?? "Failed to delete.");
    }
  };

  // Show existing draft/paid for the selected month
  if (existingDraft && existingDraft.monthYear === monthYear) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{existingDraft.label}</h3>
            <p className="text-sm text-muted-foreground">
              {existingDraft.monthYear}
            </p>
          </div>
          <Badge
            variant={existingDraft.status === "PAID" ? "default" : "secondary"}
          >
            {existingDraft.status}
          </Badge>
        </div>

        <PayrollPreviewTable
          items={existingDraft.items}
          totalAmount={existingDraft.totalAmount}
        />

        {existingDraft.status === "DRAFT" && (
          <div className="flex gap-3">
            <Button
              variant="destructive"
              size="sm"
              disabled={actionLoading}
              onClick={() => handleDelete(existingDraft.id)}
            >
              <Trash2 className="size-4 mr-2" />
              Delete Draft
            </Button>
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={() => handleMarkPaid(existingDraft.id)}
            >
              <CheckCircle className="size-4 mr-2" />
              {actionLoading ? "Processing…" : "Mark as Paid"}
            </Button>
          </div>
        )}

        {existingDraft.status === "PAID" && existingDraft.paidAt && (
          <p className="text-sm text-emerald-600">
            Paid on{" "}
            {new Date(existingDraft.paidAt).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            . Expense of {fmt.format(existingDraft.totalAmount)} recorded.
          </p>
        )}

        <div className="pt-2">
          <Label className="text-xs text-muted-foreground">
            Select a different month to generate a new payroll
          </Label>
          <Input
            type="month"
            value={monthYear}
            onChange={(e) => setMonthYear(e.target.value)}
            className="mt-1 w-48"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
        <div className="space-y-1.5">
          <Label htmlFor="month">Payroll Month</Label>
          <Input
            id="month"
            type="month"
            value={monthYear}
            onChange={(e) => {
              setMonthYear(e.target.value);
              setPreview(null);
            }}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={handlePreview} disabled={loading} variant="outline">
            {loading ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Eye className="size-4 mr-2" />
            )}
            {loading ? "Calculating…" : "Preview"}
          </Button>
        </div>
      </div>

      {preview && (
        <>
          <PayrollPreviewTable
            items={preview.items}
            totalAmount={preview.totalAmount}
          />

          <div className="grid gap-4 max-w-lg">
            <div className="space-y-1.5">
              <Label htmlFor="label">Payroll Label</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. March 2026 Payroll"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes for this payroll run…"
                rows={2}
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={actionLoading || !label.trim()}
              className="w-fit"
            >
              {actionLoading ? "Saving…" : "Save as Draft"}
            </Button>
          </div>
        </>
      )}

      {!preview && !loading && (
        <p className="text-sm text-muted-foreground">
          Select a month and click Preview to calculate payroll.
        </p>
      )}
    </div>
  );
}

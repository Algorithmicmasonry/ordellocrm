"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PayrollDetailDialog } from "./payroll-detail-dialog";
import { formatRole } from "@/lib/utils";
import type { OrgMemberRole, PaymentType } from "@prisma/client";

interface PayrollItem {
  id: string;
  userId: string;
  user: { id: string; name: string; role: OrgMemberRole };
  paymentType: PaymentType;
  ordersDelivered: number;
  ratePerOrder: number;
  fixedSalary: number;
  commissionAmount: number;
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
  createdAt: Date;
  createdBy: { name: string };
  items: PayrollItem[];
}

interface Props {
  payrolls: PayrollRecord[];
}

const fmt = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
});

export function PayrollHistoryTab({ payrolls }: Props) {
  const [selected, setSelected] = useState<PayrollRecord | null>(null);

  return (
    <div className="space-y-4">
      {payrolls.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No payroll records yet. Use the "Run Payroll" tab to create one.
        </p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 font-medium">Label</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Period</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
                <th className="text-right px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                  <td className="px-4 py-3 font-medium">{p.label}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {p.monthYear}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">
                    {fmt.format(p.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={p.status === "PAID" ? "default" : "secondary"}
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {p.status === "PAID" && p.paidAt
                      ? new Date(p.paidAt).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : new Date(p.createdAt).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setSelected({
                          ...p,
                          items: p.items.map((item) => ({
                            ...item,
                            userName: item.user.name,
                            userRole: item.user.role,
                          })),
                        })
                      }
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PayrollDetailDialog
        payroll={
          selected
            ? {
                ...selected,
                items: selected.items.map((item: any) => ({
                  ...item,
                  userName: item.userName ?? item.user?.name,
                  userRole: item.userRole ?? item.user?.role,
                })),
              }
            : null
        }
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

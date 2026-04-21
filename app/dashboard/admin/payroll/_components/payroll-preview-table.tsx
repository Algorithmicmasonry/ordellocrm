"use client";

import { Badge } from "@/components/ui/badge";
import { formatRole } from "@/lib/utils";
import type { OrgMemberRole } from "@prisma/client";

export interface PreviewItem {
  userId: string;
  userName: string;
  userRole: OrgMemberRole;
  ordersDelivered: number;
  ratePerOrder: number;
  baseAmount: number;
  hohWeeks: number;
  hohBonus: number;
  totalAmount: number;
}

interface Props {
  items: PreviewItem[];
  totalAmount: number;
}

const fmt = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
});

export function PayrollPreviewTable({ items, totalAmount }: Props) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-right px-4 py-3 font-medium">Delivered</th>
              <th className="text-right px-4 py-3 font-medium">Rate</th>
              <th className="text-right px-4 py-3 font-medium">Base Pay</th>
              <th className="text-right px-4 py-3 font-medium">HoH Bonus</th>
              <th className="text-right px-4 py-3 font-medium font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.userId} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{item.userName}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {formatRole(item.userRole)}
                      </Badge>
                      {item.userRole === "ADMIN" && (
                        <span className="text-[10px] text-muted-foreground">
                          (all orders)
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {item.ordersDelivered}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {fmt.format(item.ratePerOrder)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {fmt.format(item.baseAmount)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {item.hohBonus > 0 ? (
                    <span className="text-amber-600">
                      {fmt.format(item.hohBonus)}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({item.hohWeeks}w)
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-bold">
                  {fmt.format(item.totalAmount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/50 font-bold">
              <td className="px-4 py-3" colSpan={5}>
                Grand Total
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {fmt.format(totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SetRateDialog } from "./set-rate-dialog";
import { formatRole } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

interface RepWithRate {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  rate: {
    ratePerOrder: number;
    updatedAt: Date;
  } | null;
}

interface Props {
  users: RepWithRate[];
}

export function PayRatesTab({ users }: Props) {
  const [dialogUser, setDialogUser] = useState<RepWithRate | null>(null);

  const fmt = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set how much each person earns per delivered order. Admins are paid based on total orders delivered by all sales reps.
      </p>

      <div className="rounded-lg border overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Role</th>
              <th className="text-left px-4 py-3 font-medium">Rate / Order</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Last Updated</th>
              <th className="text-right px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr
                key={user.id}
                className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <Badge variant="outline" className="text-xs">
                    {formatRole(user.role)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {user.rate ? (
                    <span className="font-mono font-semibold text-emerald-600">
                      {fmt.format(user.rate.ratePerOrder)}
                    </span>
                  ) : (
                    <span className="text-amber-500 text-xs font-medium">Not set</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  {user.rate
                    ? new Date(user.rate.updatedAt).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDialogUser(user)}
                  >
                    {user.rate ? "Edit Rate" : "Set Rate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No active sales reps or admins found.
          </div>
        )}
      </div>

      {dialogUser && (
        <SetRateDialog
          open={!!dialogUser}
          onClose={() => setDialogUser(null)}
          userId={dialogUser.id}
          userName={dialogUser.name}
          userRole={dialogUser.role}
          currentRate={dialogUser.rate?.ratePerOrder ?? null}
        />
      )}
    </div>
  );
}

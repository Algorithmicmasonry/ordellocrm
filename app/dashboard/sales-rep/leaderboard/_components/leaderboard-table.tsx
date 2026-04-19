import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import { Crown, Medal } from "lucide-react";

interface RepEntry {
  id: string;
  name: string;
  image: string | null;
  rank: number;
  totalOrders: number;
  deliveredOrders: number;
  conversionRate: number;
  isCurrentHoH: boolean;
  isCurrentUser: boolean;
}

interface HoHInfo {
  userId: string;
  name: string;
  titleWeekStart: Date;
  titleWeekEnd: Date;
}

interface Props {
  reps: RepEntry[];
  currentHoH: HoHInfo | null;
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return (
    <span className="text-sm font-semibold text-muted-foreground w-6 text-center">
      {rank}
    </span>
  );
}

export function LeaderboardTable({ reps, currentHoH }: Props) {
  if (reps.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        No data for this period.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {currentHoH && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3">
          <Crown className="size-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {currentHoH.name} is Head of House this week
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              {new Date(currentHoH.titleWeekStart).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
              })}{" "}
              –{" "}
              {new Date(currentHoH.titleWeekEnd).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-3 font-medium w-12">#</th>
              <th className="text-left px-4 py-3 font-medium">Sales Rep</th>
              <th className="text-right px-4 py-3 font-medium">Delivered</th>
              <th className="text-right px-4 py-3 font-medium">Total Orders</th>
              <th className="text-right px-4 py-3 font-medium">Conversion Rate</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {reps.map((rep, i) => (
              <tr
                key={rep.id}
                className={cn(
                  i % 2 === 0 ? "bg-background" : "bg-muted/20",
                  rep.isCurrentUser && "ring-1 ring-inset ring-primary/30"
                )}
              >
                <td className="px-4 py-3">
                  <RankIcon rank={rep.rank} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarImage src={rep.image ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {getInitials(rep.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn("font-medium", rep.isCurrentUser && "text-primary")}>
                      {rep.name}
                      {rep.isCurrentUser && (
                        <span className="text-xs text-muted-foreground ml-1">(you)</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">
                  {rep.deliveredOrders}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {rep.totalOrders}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      rep.conversionRate >= 75
                        ? "text-emerald-600"
                        : rep.conversionRate >= 50
                        ? "text-amber-600"
                        : "text-red-500"
                    )}
                  >
                    {rep.conversionRate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {rep.isCurrentHoH ? (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs gap-1">
                      <Crown className="size-3" />
                      Head of House
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {reps.map((rep) => (
          <div
            key={rep.id}
            className={cn(
              "rounded-lg border p-4 space-y-3",
              rep.isCurrentUser && "border-primary/40 bg-primary/5"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RankIcon rank={rep.rank} />
                <Avatar className="size-8">
                  <AvatarImage src={rep.image ?? undefined} />
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {getInitials(rep.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {rep.name}
                    {rep.isCurrentUser && (
                      <span className="text-xs text-muted-foreground ml-1">(you)</span>
                    )}
                  </p>
                </div>
              </div>
              {rep.isCurrentHoH && (
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs gap-1">
                  <Crown className="size-3" />
                  HoH
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Delivered</p>
                <p className="font-semibold">{rep.deliveredOrders}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-semibold">{rep.totalOrders}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conversion</p>
                <p
                  className={cn(
                    "font-semibold",
                    rep.conversionRate >= 75
                      ? "text-emerald-600"
                      : rep.conversionRate >= 50
                      ? "text-amber-600"
                      : "text-red-500"
                  )}
                >
                  {rep.conversionRate}%
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

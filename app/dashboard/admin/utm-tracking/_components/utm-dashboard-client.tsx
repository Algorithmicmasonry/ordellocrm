"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Check, X, ShoppingBag, PackageCheck, TrendingUp, Megaphone, ImagePlay } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveCampaignLabel } from "../actions";
import type { UTMPageData, CampaignStat, CreativeStat } from "../actions";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SOURCE_COLORS: Record<string, string> = {
  fb: "bg-blue-100 text-blue-800",
  facebook: "bg-blue-100 text-blue-800",
  tiktok: "bg-pink-100 text-pink-800",
  instagram: "bg-purple-100 text-purple-800",
  google: "bg-yellow-100 text-yellow-800",
};

function sourceColor(raw: string | null) {
  if (!raw) return "bg-gray-100 text-gray-700";
  return SOURCE_COLORS[raw.toLowerCase()] ?? "bg-gray-100 text-gray-700";
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700",
  CONFIRMED: "bg-indigo-50 text-indigo-700",
  DISPATCHED: "bg-orange-50 text-orange-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
  POSTPONED: "bg-yellow-50 text-yellow-700",
};

// ---------------------------------------------------------------------------
// Inline label editor
// ---------------------------------------------------------------------------

function InlineEditor({
  value,
  fallback,
  onSave,
}: {
  value: string | null;
  fallback: string; // raw ID shown as monospace below
  onSave: (label: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await onSave(draft);
      setEditing(false);
    });
  }

  function handleCancel() {
    setDraft(value ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-6 text-xs w-44 px-2"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
          />
          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleSave} disabled={pending}>
            <Check className="size-3 text-green-600" />
          </Button>
          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleCancel}>
            <X className="size-3 text-red-500" />
          </Button>
        </span>
        <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[180px]">{fallback}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 group">
        <span className={cn("text-sm", value ? "font-medium" : "text-muted-foreground italic text-xs")}>
          {value ?? "Add label..."}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-3 text-muted-foreground" />
        </Button>
      </span>
      <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[180px]">{fallback}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card for campaigns / creatives
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  delivered,
  revenue,
  onSave,
  rawId,
  label,
  type,
}: {
  title: string;
  value: string;
  delivered: number;
  revenue: number;
  onSave: (label: string) => Promise<void>;
  rawId: string;
  label: string | null;
  type: "campaign" | "creative";
}) {
  return (
    <Card className="min-w-0">
      <CardContent className="pt-4 pb-4 px-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <InlineEditor value={label} fallback={rawId} onSave={onSave} />
          <Badge variant="secondary" className="shrink-0 text-xs">{type === "campaign" ? "Campaign" : "Creative"}</Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t">
          <span className="flex items-center gap-1">
            <ShoppingBag className="size-3" />
            {value} orders
          </span>
          <span className="flex items-center gap-1">
            <PackageCheck className="size-3" />
            {delivered} delivered
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="size-3" />
            ₦{revenue.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  data: UTMPageData;
}

export function UTMDashboardClient({ data: initialData }: Props) {
  const [campaigns, setCampaigns] = useState<CampaignStat[]>(initialData.campaigns);
  const [creatives, setCreatives] = useState<CreativeStat[]>(initialData.creatives);

  async function handleSaveCampaignLabel(key: string, label: string) {
    const res = await saveCampaignLabel(key, "campaign", label);
    if (!res.success) { toast.error(res.error ?? "Failed to save"); return; }
    setCampaigns((prev) => prev.map((c) => c.campaign === key ? { ...c, label: label || null } : c));
    toast.success("Label saved");
  }

  async function handleSaveContentLabel(key: string, label: string) {
    const res = await saveCampaignLabel(key, "content", label);
    if (!res.success) { toast.error(res.error ?? "Failed to save"); return; }
    setCreatives((prev) => prev.map((c) => c.content === key ? { ...c, label: label || null } : c));
    toast.success("Label saved");
  }

  if (initialData.totalOrders === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px] border rounded-lg border-dashed">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-sm">No UTM-tracked orders yet.</p>
          <p className="text-muted-foreground text-xs">Orders will appear here once customers place orders via tracked links.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{initialData.totalOrders}</p>
                <p className="text-xs text-muted-foreground">Tracked Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Megaphone className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaigns.length}</p>
                <p className="text-xs text-muted-foreground">Unique Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ImagePlay className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{creatives.length}</p>
                <p className="text-xs text-muted-foreground">Unique Creatives</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign breakdown */}
      {campaigns.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Campaigns</h2>
            <p className="text-xs text-muted-foreground">Hover the pencil icon on any card to rename a campaign ID</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {campaigns.map((c) => (
              <StatCard
                key={c.campaign}
                type="campaign"
                rawId={c.campaign}
                label={c.label}
                title={c.label ?? c.campaign}
                value={String(c.orders)}
                delivered={c.delivered}
                revenue={c.revenue}
                onSave={(label) => handleSaveCampaignLabel(c.campaign, label)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Creative breakdown */}
      {creatives.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Ad Creatives</h2>
            <p className="text-xs text-muted-foreground">Hover the pencil icon to rename a creative ID</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {creatives.map((c) => (
              <StatCard
                key={c.content}
                type="creative"
                rawId={c.content}
                label={c.label}
                title={c.label ?? c.content}
                value={String(c.orders)}
                delivered={c.delivered}
                revenue={c.revenue}
                onSave={(label) => handleSaveContentLabel(c.content, label)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Orders table */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Orders</h2>
          <p className="text-xs text-muted-foreground">All orders placed via tracked links</p>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">#</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Creative</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialData.orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{order.orderNumber}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{order.customerName}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs border-0 font-medium", STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700")}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.utmSource ? (
                          <Badge className={cn("text-xs border-0 font-medium", sourceColor(order.utmSource))}>
                            {order.utmSource}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.utmCampaign ? (
                          <div className="flex flex-col">
                            {order.campaignLabel ? (
                              <span className="text-sm font-medium">{order.campaignLabel}</span>
                            ) : null}
                            <span className={cn("font-mono text-xs text-muted-foreground", !order.campaignLabel && "text-foreground text-xs")}>
                              {order.utmCampaign}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.utmContent ? (
                          <div className="flex flex-col">
                            {order.contentLabel ? (
                              <span className="text-sm font-medium">{order.contentLabel}</span>
                            ) : null}
                            <span className={cn("font-mono text-xs text-muted-foreground", !order.contentLabel && "text-foreground text-xs")}>
                              {order.utmContent}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        ₦{order.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

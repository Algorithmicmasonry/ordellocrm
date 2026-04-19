"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UTMOrder {
  id: string;
  orderNumber: number;
  customerName: string;
  status: string;
  totalAmount: number;
  utmSource: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmMedium: string | null;
  createdAt: Date;
  // resolved labels
  campaignLabel: string | null;
  contentLabel: string | null;
}

export interface CampaignStat {
  campaign: string;
  label: string | null;
  orders: number;
  delivered: number;
  revenue: number;
}

export interface CreativeStat {
  content: string;
  label: string | null;
  orders: number;
  delivered: number;
  revenue: number;
}

export interface UTMPageData {
  orders: UTMOrder[];
  campaigns: CampaignStat[];
  creatives: CreativeStat[];
  totalOrders: number;
  totalRevenue: number;
}

// ---------------------------------------------------------------------------
// getUTMPageData — all data for the page in one call
// ---------------------------------------------------------------------------

export async function getUTMPageData(): Promise<{
  success: boolean;
  data?: UTMPageData;
  error?: string;
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    // Only orders that have utm_campaign set
    const orders = await db.order.findMany({
      where: { isSandbox: false, utmCampaign: { not: null } },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        status: true,
        totalAmount: true,
        utmSource: true,
        utmCampaign: true,
        utmContent: true,
        utmMedium: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (orders.length === 0) {
      return {
        success: true,
        data: { orders: [], campaigns: [], creatives: [], totalOrders: 0, totalRevenue: 0 },
      };
    }

    const campaignKeys = [...new Set(orders.map((o) => o.utmCampaign!))];
    const contentKeys = [
      ...new Set(orders.map((o) => o.utmContent).filter(Boolean) as string[]),
    ];

    // Fetch all labels in one query
    const labelRows = await db.campaignLabel.findMany({
      where: {
        OR: [
          { key: { in: campaignKeys }, type: "campaign" },
          ...(contentKeys.length ? [{ key: { in: contentKeys }, type: "content" }] : []),
        ],
      },
    });

    const campaignLabelMap: Record<string, string> = {};
    const contentLabelMap: Record<string, string> = {};
    for (const l of labelRows) {
      if (l.type === "campaign") campaignLabelMap[l.key] = l.label;
      if (l.type === "content") contentLabelMap[l.key] = l.label;
    }

    // Build campaign stats
    const campaignMap: Record<string, CampaignStat> = {};
    for (const o of orders) {
      const key = o.utmCampaign!;
      if (!campaignMap[key]) {
        campaignMap[key] = {
          campaign: key,
          label: campaignLabelMap[key] ?? null,
          orders: 0,
          delivered: 0,
          revenue: 0,
        };
      }
      campaignMap[key].orders++;
      if (o.status === "DELIVERED") {
        campaignMap[key].delivered++;
        campaignMap[key].revenue += o.totalAmount;
      }
    }

    // Build creative stats
    const contentMap: Record<string, CreativeStat> = {};
    for (const o of orders) {
      if (!o.utmContent) continue;
      const key = o.utmContent;
      if (!contentMap[key]) {
        contentMap[key] = {
          content: key,
          label: contentLabelMap[key] ?? null,
          orders: 0,
          delivered: 0,
          revenue: 0,
        };
      }
      contentMap[key].orders++;
      if (o.status === "DELIVERED") {
        contentMap[key].delivered++;
        contentMap[key].revenue += o.totalAmount;
      }
    }

    const totalRevenue = orders
      .filter((o) => o.status === "DELIVERED")
      .reduce((s, o) => s + o.totalAmount, 0);

    return {
      success: true,
      data: {
        orders: orders.map((o) => ({
          ...o,
          campaignLabel: o.utmCampaign ? (campaignLabelMap[o.utmCampaign] ?? null) : null,
          contentLabel: o.utmContent ? (contentLabelMap[o.utmContent] ?? null) : null,
        })),
        campaigns: Object.values(campaignMap).sort((a, b) => b.orders - a.orders),
        creatives: Object.values(contentMap).sort((a, b) => b.orders - a.orders),
        totalOrders: orders.length,
        totalRevenue,
      },
    };
  } catch (error) {
    console.error("getUTMPageData error:", error);
    return { success: false, error: "Failed to fetch UTM data" };
  }
}

// ---------------------------------------------------------------------------
// saveCampaignLabel — upsert a human-readable label for a UTM value
// ---------------------------------------------------------------------------

export async function saveCampaignLabel(
  key: string,
  type: "campaign" | "content" | "source" | "medium" | "term",
  label: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    if (!label.trim()) {
      await db.campaignLabel.deleteMany({ where: { key, type } });
      return { success: true };
    }

    await db.campaignLabel.upsert({
      where: { key_type: { key, type } },
      create: { key, type, label: label.trim() },
      update: { label: label.trim() },
    });

    return { success: true };
  } catch (error) {
    console.error("saveCampaignLabel error:", error);
    return { success: false, error: "Failed to save label" };
  }
}

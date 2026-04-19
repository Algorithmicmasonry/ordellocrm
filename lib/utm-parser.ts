import type { OrderSource } from "@prisma/client";

export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export function parseUTMParams(url: string): UTMParams {
  const urlObj = new URL(url, window.location.origin);
  return {
    source: urlObj.searchParams.get("utm_source") || undefined,
    medium: urlObj.searchParams.get("utm_medium") || undefined,
    campaign: urlObj.searchParams.get("utm_campaign") || undefined,
    term: urlObj.searchParams.get("utm_term") || undefined,
    content: urlObj.searchParams.get("utm_content") || undefined,
  };
}

export function determineOrderSource(
  utmSource?: string,
  referrer?: string,
): OrderSource {
  const source = (utmSource || referrer || "").toLowerCase();

  if (source.includes("facebook") || source.includes("fb")) return "FACEBOOK";
  if (source.includes("tiktok")) return "TIKTOK";
  if (source.includes("whatsapp") || source.includes("wa.me"))
    return "WHATSAPP";

  return "WEBSITE";
}

export function formatUTMSource(params: UTMParams): string {
  if (!params.source) return "";

  const parts = [params.source];
  if (params.campaign) parts.push(params.campaign);
  if (params.medium) parts.push(params.medium);

  return parts.join("_");
}

export function extractReferrerDomain(): string | null {
  if (typeof window === "undefined") return null;
  if (!document.referrer) return null;

  try {
    const url = new URL(document.referrer);
    return url.hostname;
  } catch {
    return null;
  }
}

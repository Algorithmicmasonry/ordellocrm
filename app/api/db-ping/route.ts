import { db } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * Keep-alive endpoint for Neon serverless database.
 *
 * Neon free plan scales to zero after 5 minutes of inactivity.
 * An external cron (e.g. cron-job.org) should hit this endpoint every 4 minutes
 * to prevent cold starts from affecting order submissions.
 *
 * Ping URL: https://your-domain.com/api/db-ping
 * Recommended interval: every 4 minutes
 */
export async function GET() {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, latencyMs: Date.now() - start });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[db-ping] DB connection failed:", message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 503 }
    );
  }
}

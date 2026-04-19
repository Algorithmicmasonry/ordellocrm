// app/api/test-subscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptions = await db.pushSubscription.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({
        working: false,
        reason: "No active subscriptions found",
      });
    }

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const testPayload = JSON.stringify({
            title: "Test Notification",
            body: "Your notifications are working!",
            tag: "test",
          });

          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            testPayload,
          );

          return { id: sub.id, working: true };
        } catch (error: unknown) {
          const statusCode =
            typeof error === "object" && error !== null && "statusCode" in error
              ? (error as { statusCode?: number }).statusCode
              : undefined;

          console.error(`Subscription ${sub.id} failed:`, statusCode);

          if (statusCode === 410 || statusCode === 404) {
            await db.pushSubscription.update({
              where: { id: sub.id },
              data: { isActive: false },
            });
          }

          return { id: sub.id, working: false, error: statusCode };
        }
      }),
    );

    const workingCount = results.filter((r) => r.working).length;

    return NextResponse.json({
      hasWorking: workingCount > 0,
      total: subscriptions.length,
      workingCount,
      results,
    });
  } catch (error) {
    console.error("Test failed:", error);
    return NextResponse.json({ error: "Test failed" }, { status: 500 });
  }
}

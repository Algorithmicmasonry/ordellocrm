import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { db } from "@/lib/db"
import { creditTokens } from "@/lib/ai-tokens"
import type { OrgPlan } from "@prisma/client"

function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest("hex")
  return hash === signature
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get("x-paystack-signature") ?? ""

  if (!verifySignature(body, signature)) {
    console.error("[paystack/webhook] Invalid signature")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const event = JSON.parse(body)
  console.log(`[paystack/webhook] Event: ${event.event}`)

  try {
    switch (event.event) {

      case "charge.success": {
        const { metadata, amount, reference } = event.data
        const { organizationId, type, tokens, plan, interval } = metadata ?? {}
        if (!organizationId) break

        // Token purchase - credit tokens to org
        if (type === "token_purchase" && tokens) {
          await creditTokens(organizationId, tokens, amount, reference)
          console.log(`[paystack/webhook] Credited ${tokens} tokens to org ${organizationId}`)
          break
        }

        // Subscription payment - activate org
        if (!plan) break

        const now = new Date()
        const periodEnd = new Date(now)
        if (interval === "yearly") {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1)
        }

        await db.organization.update({
          where: { id: organizationId },
          data: { status: "ACTIVE", subscribedAt: now, currentPeriodEnd: periodEnd },
        })

        await db.subscription.upsert({
          where: { organizationId },
          create: {
            organizationId,
            plan: plan as OrgPlan,
            interval,
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
          update: {
            plan: plan as OrgPlan,
            interval,
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        })

        console.log(`[paystack/webhook] Activated org ${organizationId} on ${plan} ${interval}`)
        break
      }

      case "subscription.disable": {
        const { metadata } = event.data
        const organizationId = metadata?.organizationId
        if (!organizationId) break

        await db.organization.update({
          where: { id: organizationId },
          data: { status: "CANCELLED" },
        })

        await db.subscription.update({
          where: { organizationId },
          data: { status: "CANCELLED", cancelledAt: new Date() },
        })

        console.log(`[paystack/webhook] Cancelled org ${organizationId}`)
        break
      }

      case "invoice.payment_failed": {
        const { metadata } = event.data
        const organizationId = metadata?.organizationId
        if (!organizationId) break

        await db.organization.update({
          where: { id: organizationId },
          data: { status: "PAST_DUE" },
        })

        await db.subscription.update({
          where: { organizationId },
          data: { status: "PAST_DUE" },
        })

        console.log(`[paystack/webhook] Past due org ${organizationId}`)
        break
      }

      default:
        console.log(`[paystack/webhook] Unhandled event: ${event.event}`)
    }
  } catch (err) {
    console.error("[paystack/webhook] Error processing event:", err)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}


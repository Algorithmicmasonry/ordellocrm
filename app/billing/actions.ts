"use server"

import { requireOrgContext } from "@/lib/org-context"
import { db } from "@/lib/db"

export type PlanId = "core_monthly" | "core_yearly" | "growth_monthly" | "growth_yearly"

export const PLANS: Record<PlanId, { name: string; amount: number; interval: string; plan: "CORE" | "GROWTH" }> = {
  core_monthly:  { name: "Core - Monthly",  amount: 800000,   interval: "monthly", plan: "CORE"   },
  core_yearly:   { name: "Core - Yearly",   amount: 8000000,  interval: "yearly",  plan: "CORE"   },
  growth_monthly:{ name: "Growth - Monthly",amount: 1500000,  interval: "monthly", plan: "GROWTH" },
  growth_yearly: { name: "Growth - Yearly", amount: 15000000, interval: "yearly",  plan: "GROWTH" },
}

/**
 * Initializes a Paystack transaction and returns the authorization URL.
 * The user is redirected to this URL to complete payment.
 */
export async function initializePaystackPayment(planId: PlanId) {
  const ctx = await requireOrgContext()
  const plan = PLANS[planId]

  if (!plan) return { success: false, error: "Invalid plan" }

  // Generate a unique reference
  const reference = `ordello_${ctx.organizationId}_${planId}_${Date.now()}`

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: ctx.userEmail,
      amount: plan.amount,
      reference,
      metadata: {
        organizationId: ctx.organizationId,
        planId,
        plan: plan.plan,
        interval: plan.interval,
        userId: ctx.userId,
      },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/verify?reference=${reference}`,
    }),
  })

  const data = await response.json()

  if (!data.status) {
    console.error("[paystack] initialize failed:", data)
    return { success: false, error: data.message ?? "Failed to initialize payment" }
  }

  // Store pending subscription record
  await db.subscription.upsert({
    where: { organizationId: ctx.organizationId },
    create: {
      organizationId: ctx.organizationId,
      plan: plan.plan,
      interval: plan.interval,
      status: "TRIALING",
    },
    update: {
      plan: plan.plan,
      interval: plan.interval,
    },
  })

  return { success: true, authorizationUrl: data.data.authorization_url }
}


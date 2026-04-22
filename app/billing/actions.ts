"use server"

import { requireOrgContext } from "@/lib/org-context"
import { db } from "@/lib/db"

export type PlanId = "core_monthly" | "core_yearly" | "growth_monthly" | "growth_yearly"

export const PLANS: Record<PlanId, { name: string; amount: number; interval: string; plan: "CORE" | "GROWTH" }> = {
  core_monthly:  { name: "Starter - Monthly",  amount: 800000,   interval: "monthly", plan: "CORE"   },
  core_yearly:   { name: "Starter - Yearly",   amount: 8000000,  interval: "yearly",  plan: "CORE"   },
  growth_monthly:{ name: "Growth - Monthly",amount: 1500000,  interval: "monthly", plan: "GROWTH" },
  growth_yearly: { name: "Growth - Yearly", amount: 15000000, interval: "yearly",  plan: "GROWTH" },
}

export async function initializePaystackPayment(planId: PlanId) {
  try {
    const ctx = await requireOrgContext()
    const plan = PLANS[planId]

    if (!plan) return { success: false, error: "Invalid plan" }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      console.error("[paystack] PAYSTACK_SECRET_KEY is not set")
      return { success: false, error: "Payment is not configured yet. Please contact support." }
    }

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

    let data: Record<string, unknown>
    try {
      data = await response.json()
    } catch {
      console.error("[paystack] non-JSON response, status:", response.status)
      return { success: false, error: "Unexpected response from payment provider." }
    }

    if (!data.status) {
      console.error("[paystack] initialize failed:", data)
      return { success: false, error: (data.message as string) ?? "Failed to initialize payment" }
    }

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

    const authData = data.data as { authorization_url: string }
    return { success: true, authorizationUrl: authData.authorization_url }
  } catch (err) {
    console.error("[paystack] unexpected error:", err)
    return { success: false, error: "An unexpected error occurred. Please try again." }
  }
}


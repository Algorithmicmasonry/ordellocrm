"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Loader2 } from "lucide-react"
import { initializePaystackPayment, type PlanId } from "../actions"
import { useRouter } from "next/navigation"

const CORE_FEATURES = [
  "Order management & tracking",
  "Inventory control",
  "Sales rep performance dashboard",
  "Agent distribution & tracking",
  "Financial reports & P&L",
  "Round-robin auto-assignment",
  "Mobile push notifications",
  "UTM Ad tracking (always free)",
]

const GROWTH_EXTRAS = [
  "Everything in Core",
  "Rep hiring & training tools",
  "Automated follow-up engine",
  "Custom commission builder",
  "Ad creative arsenal & swipe file",
  "Capital tracking dashboard",
  "Performance alerts & coaching",
]

interface BillingClientProps {
  currentPlan?: string
}

export function BillingClient({ currentPlan }: BillingClientProps) {
  const router = useRouter()
  const [yearly, setYearly] = useState(false)
  const [loading, setLoading] = useState<PlanId | null>(null)

  async function handleSubscribe(planId: PlanId) {
    setLoading(planId)
    const result = await initializePaystackPayment(planId)
    if (!result.success) {
      alert(result.error)
      setLoading(null)
      return
    }
    // Redirect to Paystack checkout
    window.location.href = result.authorizationUrl!
  }

  const corePlanId: PlanId = yearly ? "core_yearly" : "core_monthly"
  const growthPlanId: PlanId = yearly ? "growth_yearly" : "growth_monthly"

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">Simple, honest pricing</h1>
        <p className="text-muted-foreground text-lg">
          Everything you need to run a serious POD business — no hidden fees.
        </p>

        {/* Monthly / Yearly toggle */}
        <div className="inline-flex items-center gap-3 mt-6 bg-muted rounded-full px-2 py-1.5">
          <button
            onClick={() => setYearly(false)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !yearly ? "bg-background shadow text-foreground" : "text-muted-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              yearly ? "bg-background shadow text-foreground" : "text-muted-foreground"
            }`}
          >
            Yearly
            <span className="ml-1.5 text-xs text-primary font-semibold">Save 2 months</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">

        {/* Core */}
        <div className="border-2 rounded-2xl p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-1">Core</h2>
            <p className="text-muted-foreground text-sm">Everything a Nigerian POD business needs from day one.</p>
          </div>

          <div>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold">
                {yearly ? "₦80,000" : "₦8,000"}
              </span>
              <span className="text-muted-foreground mb-1">/{yearly ? "year" : "month"}</span>
            </div>
            {yearly && (
              <p className="text-xs text-primary font-medium mt-1">= ₦6,667/month — 2 months free</p>
            )}
          </div>

          <ul className="space-y-2.5">
            {CORE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>

          <Button
            variant={currentPlan === "CORE" ? "outline" : "default"}
            className="w-full"
            disabled={!!loading || currentPlan === "CORE"}
            onClick={() => handleSubscribe(corePlanId)}
          >
            {loading === corePlanId ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
            ) : currentPlan === "CORE" ? (
              "Current Plan"
            ) : (
              "Get Core"
            )}
          </Button>
        </div>

        {/* Growth */}
        <div className="border-2 border-primary rounded-2xl p-8 space-y-6 relative">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <span className="bg-primary text-white text-xs font-semibold px-4 py-1.5 rounded-full">
              Most Popular
            </span>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-1">Growth</h2>
            <p className="text-muted-foreground text-sm">Scale without it falling apart — automation, hiring, and more.</p>
          </div>

          <div>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold">
                {yearly ? "₦150,000" : "₦15,000"}
              </span>
              <span className="text-muted-foreground mb-1">/{yearly ? "year" : "month"}</span>
            </div>
            {yearly && (
              <p className="text-xs text-primary font-medium mt-1">= ₦12,500/month — 2 months free</p>
            )}
          </div>

          <ul className="space-y-2.5">
            {GROWTH_EXTRAS.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>

          <Button
            className="w-full"
            disabled={!!loading || currentPlan === "GROWTH"}
            onClick={() => handleSubscribe(growthPlanId)}
          >
            {loading === growthPlanId ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
            ) : currentPlan === "GROWTH" ? (
              "Current Plan"
            ) : (
              "Get Growth"
            )}
          </Button>
        </div>
      </div>

      {/* Enterprise */}
      <div className="border rounded-2xl p-8 text-center space-y-4">
        <div>
          <h2 className="text-xl font-bold mb-1">Enterprise</h2>
          <p className="text-muted-foreground">
            Done-for-you setup, migration, team training, and dedicated support. We build it, you run it.
          </p>
        </div>
        <a
          href="mailto:hello@ordello.com"
          className="inline-block bg-foreground text-background font-semibold px-6 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity"
        >
          Talk to Us
        </a>
      </div>

      {/* Ad Tracker note */}
      <p className="text-center text-sm text-muted-foreground mt-8">
        The Ad Tracker is always free — no plan required.{" "}
        <a href="/dashboard/admin/utm" className="text-primary hover:underline">
          Go to Ad Tracker →
        </a>
      </p>
    </div>
  )
}

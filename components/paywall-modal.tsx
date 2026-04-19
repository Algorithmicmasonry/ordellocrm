"use client"

import { Button } from "@/components/ui/button"
import { Check, Lock } from "lucide-react"
import Link from "next/link"

const CORE_FEATURES = [
  "Order management & tracking",
  "Inventory control",
  "Sales rep performance",
  "Agent distribution",
  "Financial reports & P&L",
  "Round-robin auto-assignment",
  "Mobile push notifications",
]

const GROWTH_FEATURES = [
  "Everything in Core",
  "Rep hiring & training tools",
  "Automated follow-up engine",
  "Custom commission builder",
  "Ad creative arsenal",
  "Capital tracking dashboard",
]

export function PaywallModal() {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="text-center p-8 pb-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Your free trial has ended</h2>
          <p className="text-muted-foreground">
            Choose a plan to keep your data and continue growing your business.
            <br />
            <span className="text-primary font-medium">The Ad Tracker stays free forever.</span>
          </p>
        </div>

        {/* Plans */}
        <div className="grid sm:grid-cols-2 gap-4 p-6">

          {/* Core */}
          <div className="border-2 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-lg">Core</h3>
              <p className="text-muted-foreground text-sm">Everything you need to run your business</p>
            </div>
            <div>
              <span className="text-3xl font-bold">₦8,000</span>
              <span className="text-muted-foreground text-sm">/month</span>
              <p className="text-xs text-muted-foreground mt-0.5">or ₦80,000/year (save 2 months)</p>
            </div>
            <ul className="space-y-2">
              {CORE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/billing?plan=core" className="block">
              <Button variant="outline" className="w-full">Get Core</Button>
            </Link>
          </div>

          {/* Growth */}
          <div className="border-2 border-primary rounded-xl p-6 space-y-4 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">Most Popular</span>
            </div>
            <div>
              <h3 className="font-bold text-lg">Growth</h3>
              <p className="text-muted-foreground text-sm">Scale without it falling apart</p>
            </div>
            <div>
              <span className="text-3xl font-bold">₦15,000</span>
              <span className="text-muted-foreground text-sm">/month</span>
              <p className="text-xs text-muted-foreground mt-0.5">or ₦150,000/year (save 2 months)</p>
            </div>
            <ul className="space-y-2">
              {GROWTH_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/billing?plan=growth" className="block">
              <Button className="w-full">Get Growth</Button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-muted-foreground">
            Need a custom setup?{" "}
            <Link href="/billing?plan=enterprise" className="text-primary hover:underline">
              Talk to us about Enterprise
            </Link>
          </p>
          <Link
            href="/dashboard/admin/utm"
            className="block mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Continue with free Ad Tracker →
          </Link>
        </div>
      </div>
    </div>
  )
}

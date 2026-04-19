import { requireOrgContext, trialDaysLeft, isOrgAccessible } from "@/lib/org-context"
import Link from "next/link"
import { AlertTriangle, Clock } from "lucide-react"

export async function TrialBanner() {
  const ctx = await requireOrgContext()

  // Paid and active — no banner
  if (ctx.orgStatus === "ACTIVE") return null

  // Trial expired — show urgent banner
  if (!isOrgAccessible(ctx)) {
    return (
      <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-medium">Your free trial has ended.</span>
          <span className="hidden sm:inline text-red-100">Subscribe to keep your data and continue using Ordello.</span>
        </div>
        <Link
          href="/billing"
          className="shrink-0 bg-white text-red-600 font-semibold text-xs px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
        >
          Choose a Plan
        </Link>
      </div>
    )
  }

  // Trial active — show days remaining
  const daysLeft = trialDaysLeft(ctx)
  const isUrgent = daysLeft <= 3

  return (
    <div className={`${isUrgent ? "bg-amber-500" : "bg-primary"} text-white px-4 py-2.5 flex items-center justify-between gap-4 text-sm`}>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 shrink-0" />
        <span className="font-medium">
          {daysLeft === 0
            ? "Your trial expires today."
            : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial.`}
        </span>
        <span className="hidden sm:inline opacity-90">
          The Ad Tracker is always free.
        </span>
      </div>
      <Link
        href="/billing"
        className="shrink-0 bg-white/20 hover:bg-white/30 font-semibold text-xs px-3 py-1.5 rounded-md transition-colors"
      >
        Upgrade Now
      </Link>
    </div>
  )
}

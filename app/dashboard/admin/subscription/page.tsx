import { requireOrgContext, trialDaysLeft } from "@/lib/org-context"
import { db } from "@/lib/db"
import Link from "next/link"
import { ChevronRight, CheckCircle2, Clock, AlertTriangle, XCircle, ArrowUpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Subscription – Ordello",
}

const PLAN_LABELS: Record<string, string> = {
  CORE: "Starter",
  GROWTH: "Growth",
  ENTERPRISE: "Enterprise",
}

const INTERVAL_LABELS: Record<string, string> = {
  monthly: "Monthly",
  yearly: "Yearly",
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    ACTIVE: {
      label: "Active",
      className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
      icon: <CheckCircle2 className="size-3.5" />,
    },
    TRIALING: {
      label: "Free Trial",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
      icon: <Clock className="size-3.5" />,
    },
    PAST_DUE: {
      label: "Past Due",
      className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
      icon: <AlertTriangle className="size-3.5" />,
    },
    CANCELLED: {
      label: "Cancelled",
      className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
      icon: <XCircle className="size-3.5" />,
    },
    PAUSED: {
      label: "Paused",
      className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      icon: <AlertTriangle className="size-3.5" />,
    },
  }

  const config = map[status] ?? map.TRIALING
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  )
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "—"
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date))
}

export default async function SubscriptionPage() {
  const ctx = await requireOrgContext()

  const subscription = await db.subscription.findUnique({
    where: { organizationId: ctx.organizationId },
  })

  const org = await db.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      plan: true,
      status: true,
      interval: true,
      trialEndsAt: true,
      subscribedAt: true,
      currentPeriodEnd: true,
    },
  })

  const daysLeft = trialDaysLeft(ctx)
  const isTrialing = ctx.orgStatus === "TRIALING"
  const isActive = ctx.orgStatus === "ACTIVE"
  const isOnStarter = org?.plan === "CORE"
  const isOnGrowth = org?.plan === "GROWTH"

  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/admin" className="text-muted-foreground hover:text-primary font-medium">
          Dashboard
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" />
        <span className="font-medium">Subscription</span>
      </div>

      <div>
        <h1 className="text-3xl font-black tracking-tight">Your Subscription</h1>
        <p className="text-muted-foreground mt-1">Manage your plan, billing, and usage limits.</p>
      </div>

      {/* Current Plan Card */}
      <div className="rounded-2xl border-2 border-border p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Current Plan</p>
            <h2 className="text-2xl font-bold">{PLAN_LABELS[org?.plan ?? "CORE"] ?? org?.plan}</h2>
            {isActive && org?.interval && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Billed {INTERVAL_LABELS[org.interval]?.toLowerCase()}
              </p>
            )}
          </div>
          <StatusBadge status={ctx.orgStatus} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {isTrialing && (
            <>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">Trial Ends</p>
                <p className="font-semibold">{formatDate(ctx.trialEndsAt)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">Days Remaining</p>
                <p className={`font-semibold ${daysLeft <= 3 ? "text-red-600" : ""}`}>
                  {daysLeft === 0 ? "Expires today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
                </p>
              </div>
            </>
          )}

          {isActive && (
            <>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">Subscribed Since</p>
                <p className="font-semibold">{formatDate(org?.subscribedAt)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">Next Renewal</p>
                <p className="font-semibold">{formatDate(org?.currentPeriodEnd ?? subscription?.currentPeriodEnd)}</p>
              </div>
            </>
          )}

          {ctx.orgStatus === "CANCELLED" && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-4 sm:col-span-2">
              <p className="text-xs text-muted-foreground font-medium mb-1">Cancelled On</p>
              <p className="font-semibold">{formatDate(subscription?.cancelledAt)}</p>
            </div>
          )}

          {ctx.orgStatus === "PAST_DUE" && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-4 sm:col-span-2">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                Your last payment failed. Please update your payment method to keep access.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
          {(isTrialing || isOnStarter) && (
            <Link href="/billing">
              <Button className="gap-2">
                <ArrowUpCircle className="size-4" />
                {isOnStarter ? "Upgrade to Growth" : "Choose a Plan"}
              </Button>
            </Link>
          )}
          {isOnGrowth && isActive && (
            <a href="mailto:hello@ordello.com">
              <Button variant="outline">Contact Support to Manage</Button>
            </a>
          )}
          {!isActive && !isTrialing && (
            <Link href="/billing">
              <Button variant="outline">Reactivate Subscription</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Plan Limits (Starter only) */}
      {isOnStarter && (
        <div className="rounded-2xl border border-border p-6 space-y-4">
          <h3 className="font-semibold">Your Plan Limits</h3>
          <ul className="space-y-2.5">
            {[
              "Up to 3 sales reps",
              "Up to 3 products",
              "Up to 300 orders / month",
              "1 admin",
            ].map((limit) => (
              <li key={limit} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <span className="size-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                {limit}
              </li>
            ))}
          </ul>
          <Link href="/billing" className="text-sm text-primary hover:underline font-medium">
            See what Growth unlocks →
          </Link>
        </div>
      )}

      {/* Always-free note */}
      <p className="text-sm text-muted-foreground">
        The Ad Tracker is always free — no plan required.{" "}
        <Link href="/dashboard/admin/utm-tracking" className="text-primary hover:underline">
          Go to Ad Tracker →
        </Link>
      </p>
    </div>
  )
}

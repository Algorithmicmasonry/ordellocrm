import { requireOrgContext } from "@/lib/org-context"
import { BillingClient } from "./_components/billing-client"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function BillingPage() {
  const ctx = await requireOrgContext()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Top nav */}
      <div className="border-b bg-background/95 backdrop-blur px-6 py-4 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <span className="font-bold text-lg">Ordello</span>
        <span className="text-sm text-muted-foreground">{ctx.orgName}</span>
      </div>

      {/* Content */}
      <div className="px-4 py-16">
        <BillingClient currentPlan={ctx.orgStatus === "ACTIVE" ? ctx.role : undefined} />
      </div>
    </div>
  )
}

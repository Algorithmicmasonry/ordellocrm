import { requireOrgContext } from "@/lib/org-context"
import { db } from "@/lib/db"
import { Zap } from "lucide-react"
import Link from "next/link"

export async function TokenBalanceWidget() {
  const ctx = await requireOrgContext()

  const org = await db.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { aiTokenBalance: true },
  })

  const balance = org?.aiTokenBalance ?? 0
  const isLow = balance <= 10

  return (
    <Link
      href="/dashboard/admin/ai-tokens"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        isLow
          ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
          : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
      }`}
    >
      <Zap className={`h-3.5 w-3.5 ${isLow ? "text-red-500" : "text-primary"}`} />
      {balance} tokens
      {isLow && <span className="ml-0.5">— Buy more</span>}
    </Link>
  )
}

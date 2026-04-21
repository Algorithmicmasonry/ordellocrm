"use server"

import { requireOrgContext } from "@/lib/org-context"
import { TOKEN_PACKS, type TokenPackId } from "@/lib/ai-token-packs"

export async function initializeTokenPurchase(packId: TokenPackId) {
  const ctx = await requireOrgContext()
  const pack = TOKEN_PACKS[packId]
  if (!pack) return { success: false, error: "Invalid pack" }

  const reference = `ordello_tokens_${ctx.organizationId}_${packId}_${Date.now()}`

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: ctx.userEmail,
      amount: pack.amount,
      reference,
      metadata: {
        type: "token_purchase",
        organizationId: ctx.organizationId,
        packId,
        tokens: pack.tokens,
      },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/ai-tokens/verify?reference=${reference}`,
    }),
  })

  const data = await response.json()

  if (!data.status) {
    return { success: false, error: data.message ?? "Failed to initialize payment" }
  }

  return { success: true, authorizationUrl: data.data.authorization_url }
}

export async function getTokenData() {
  const ctx = await requireOrgContext()

  const [org, transactions] = await Promise.all([
    (await import("@/lib/db")).db.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { aiTokenBalance: true },
    }),
    (await import("@/lib/db")).db.aiTokenTransaction.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ])

  return {
    balance: org?.aiTokenBalance ?? 0,
    transactions,
  }
}

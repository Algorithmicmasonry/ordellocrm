"use server"

import { db } from "./db"

export type TokenPackId = "pack_50" | "pack_150" | "pack_500"

export const TOKEN_PACKS: Record<TokenPackId, { tokens: number; amount: number; label: string; perMin: string }> = {
  pack_50:  { tokens: 50,  amount: 900000,  label: "Starter",    perMin: "₦180/min" },
  pack_150: { tokens: 150, amount: 2500000, label: "Standard",   perMin: "₦167/min" },
  pack_500: { tokens: 500, amount: 7500000, label: "Pro",        perMin: "₦150/min" },
}

/**
 * Deduct tokens from an org's balance after a Vapi call ends.
 * durationSecs is rounded UP to the nearest minute.
 * Returns false if the org has insufficient tokens (shouldn't block the call — just log it).
 */
export async function deductTokens(
  organizationId: string,
  tokensToDeduct: number,
  vapiCallId: string,
  durationSecs: number,
  orderId?: string,
): Promise<boolean> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { aiTokenBalance: true },
  })

  if (!org) return false

  const balanceAfter = Math.max(0, org.aiTokenBalance - tokensToDeduct)

  await db.$transaction([
    db.organization.update({
      where: { id: organizationId },
      data: { aiTokenBalance: { decrement: tokensToDeduct } },
    }),
    db.aiTokenTransaction.create({
      data: {
        organizationId,
        type: "CONSUMED",
        tokens: -tokensToDeduct,
        balanceAfter,
        vapiCallId,
        vapiDuration: durationSecs,
        orderId: orderId ?? null,
      },
    }),
  ])

  // Warn if balance is low
  if (balanceAfter <= 10) {
    console.warn(`[ai-tokens] Org ${organizationId} has ${balanceAfter} tokens remaining`)
  }

  return true
}

/**
 * Credit tokens to an org after a successful token pack purchase.
 */
export async function creditTokens(
  organizationId: string,
  tokens: number,
  amountPaid: number,
  paystackRef: string,
): Promise<void> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { aiTokenBalance: true },
  })

  if (!org) return

  const balanceAfter = org.aiTokenBalance + tokens

  await db.$transaction([
    db.organization.update({
      where: { id: organizationId },
      data: { aiTokenBalance: { increment: tokens } },
    }),
    db.aiTokenTransaction.create({
      data: {
        organizationId,
        type: "PURCHASE",
        tokens,
        balanceAfter,
        amountPaid,
        paystackRef,
      },
    }),
  ])
}

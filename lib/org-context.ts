"use server"

import { auth } from "./auth"
import { db } from "./db"
import { headers } from "next/headers"
import type { OrgMemberRole, OrgStatus } from "@prisma/client"

export type OrgContext = {
  organizationId: string
  orgName: string
  orgSlug: string
  orgStatus: OrgStatus
  trialEndsAt: Date
  aiTokenBalance: number
  memberId: string
  role: OrgMemberRole
  isAiAgent: boolean
  isActive: boolean
  userId: string
  userName: string
  userEmail: string
}

/**
 * Get the current user's session + their active org membership.
 * Pass orgSlug to resolve a specific org, otherwise returns the first active membership.
 *
 * Returns null if unauthenticated or not a member of the requested org.
 */
export async function getOrgContext(orgSlug?: string): Promise<OrgContext | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null

  const where = orgSlug
    ? { organization: { slug: orgSlug }, userId: session.user.id, isActive: true }
    : { userId: session.user.id, isActive: true }

  const membership = await db.organizationMember.findFirst({
    where,
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          trialEndsAt: true,
          aiTokenBalance: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  if (!membership) return null

  return {
    organizationId: membership.organization.id,
    orgName: membership.organization.name,
    orgSlug: membership.organization.slug,
    orgStatus: membership.organization.status,
    trialEndsAt: membership.organization.trialEndsAt,
    aiTokenBalance: membership.organization.aiTokenBalance,
    memberId: membership.id,
    role: membership.role,
    isAiAgent: membership.isAiAgent,
    isActive: membership.isActive,
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
  }
}

/**
 * Returns true if the org has an active trial or paid subscription.
 */
export function isOrgAccessible(ctx: OrgContext): boolean {
  if (ctx.orgStatus === "ACTIVE") return true
  if (ctx.orgStatus === "TRIALING" && new Date() < ctx.trialEndsAt) return true
  return false
}

/**
 * Returns how many trial days are left. Returns 0 if not in trial.
 */
export function trialDaysLeft(ctx: OrgContext): number {
  if (ctx.orgStatus !== "TRIALING") return 0
  const diff = ctx.trialEndsAt.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

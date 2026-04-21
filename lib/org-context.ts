import { auth } from "./auth"
import { db } from "./db"
import { headers } from "next/headers"
import type { OrgMemberRole, OrgStatus } from "@prisma/client"

// Routes always accessible regardless of subscription status
const FREE_ROUTES = [
  "/dashboard/admin/utm",
  "/dashboard/admin/ai-sandbox",
]

export function isFreeRoute(pathname: string): boolean {
  return FREE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )
}

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

export type OrgContextResult =
  | { status: "unauthenticated" }
  | { status: "no_org"; userId: string }
  | { status: "ok"; ctx: OrgContext }

/**
 * Get the current user's session + their active org membership.
 * Returns a discriminated union so callers can handle each case:
 *  - "unauthenticated" → redirect to /login
 *  - "no_org"          → redirect to /onboarding
 *  - "ok"              → proceed with ctx
 */
export async function getOrgContext(orgSlug?: string): Promise<OrgContextResult> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { status: "unauthenticated" }

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

  if (!membership) return { status: "no_org", userId: session.user.id }

  return {
    status: "ok",
    ctx: {
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
    },
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
 * Returns how many trial days are left. Returns 0 if not in trial or trial expired.
 */
export function trialDaysLeft(ctx: OrgContext): number {
  if (ctx.orgStatus !== "TRIALING") return 0
  const diff = ctx.trialEndsAt.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/**
 * Convenience: resolves org context and redirects if unauthenticated or no org.
 * Use this in dashboard pages/layouts instead of calling getOrgContext directly.
 *
 * Usage:
 *   const ctx = await requireOrgContext()
 *   // ctx is guaranteed to be OrgContext here
 */
export async function requireOrgContext(orgSlug?: string): Promise<OrgContext> {
  const { redirect } = await import("next/navigation")
  const result = await getOrgContext(orgSlug)
  if (result.status === "unauthenticated") redirect("/login")
  if (result.status === "no_org") redirect("/onboarding")
  return result.ctx
}

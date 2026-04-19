"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { slugify } from "@/lib/utils"
import { headers } from "next/headers"

export async function createOrganization(businessName: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { success: false, error: "Not authenticated" }

  const name = businessName.trim()
  if (!name || name.length < 2) return { success: false, error: "Business name is too short" }

  // Check if user already has an org — prevent duplicate onboarding
  const existing = await db.organizationMember.findFirst({
    where: { userId: session.user.id },
  })
  if (existing) return { success: false, error: "You already have an organization" }

  // Generate a unique slug from the business name
  const baseSlug = slugify(name)
  let slug = baseSlug
  let suffix = 1

  while (await db.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`
    suffix++
  }

  // Set trial to 14 days from now
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 14)

  // Create org + owner membership atomically
  const org = await db.organization.create({
    data: {
      name,
      slug,
      trialEndsAt,
      members: {
        create: {
          userId: session.user.id,
          role: "OWNER",
          isActive: true,
          joinedAt: new Date(),
        },
      },
      // Seed the round-robin system setting for this org
      settings: {
        create: {
          key: "round_robin_index",
          value: "0",
        },
      },
    },
  })

  return { success: true, orgSlug: org.slug }
}

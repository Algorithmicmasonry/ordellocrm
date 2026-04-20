import { db } from './db'

const ROUND_ROBIN_KEY = 'round_robin_index'

/**
 * Get the next sales rep in round-robin order for a specific org.
 * Queries OrganizationMember instead of User — role and isActive live there.
 */
export async function getNextSalesRep(
  excludeUserId?: string,
  organizationId?: string,
): Promise<string | null> {
  if (!organizationId) return null

  const vapiEnabled = process.env.VAPI_ENABLED === "true"

  // Get active SALES_REP members of this org
  const members = await db.organizationMember.findMany({
    where: {
      organizationId,
      role: 'SALES_REP',
      isActive: true,
      ...(!vapiEnabled ? { isAiAgent: false } : {}),
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: 'asc' } }, // Alphabetical to match UI
  })

  if (members.length === 0) return null

  // Atomically increment the index using raw SQL.
  // The unique constraint is (organizationId, key) in Ordello.
  const result = await db.$queryRaw<Array<{ value: string }>>`
    INSERT INTO system_settings (id, key, "organizationId", value, "updatedAt")
    VALUES (gen_random_uuid()::text, ${ROUND_ROBIN_KEY}, ${organizationId}, '0', NOW())
    ON CONFLICT ("organizationId", key) DO UPDATE
    SET value = ((CAST(system_settings.value AS INTEGER) + 1) % ${members.length})::text,
        "updatedAt" = NOW()
    RETURNING value
  `

  const currentIndex = parseInt(result[0].value)
  const member = members[currentIndex]

  if (!member) {
    console.warn(`[getNextSalesRep] Index ${currentIndex} out of bounds for ${members.length} members — saving order unassigned`)
    return null
  }

  return member.userId
}

/**
 * Reset the round-robin counter for a specific org
 */
export async function resetRoundRobin(organizationId: string): Promise<void> {
  await db.systemSetting.upsert({
    where: { organizationId_key: { organizationId, key: ROUND_ROBIN_KEY } },
    update: { value: '0' },
    create: { organizationId, key: ROUND_ROBIN_KEY, value: '0' },
  })
}

/**
 * Get the current round-robin index for a specific org without incrementing
 */
export async function getCurrentRoundRobinIndex(organizationId: string): Promise<number> {
  const setting = await db.systemSetting.findUnique({
    where: { organizationId_key: { organizationId, key: ROUND_ROBIN_KEY } },
  })
  return setting ? parseInt(setting.value) : 0
}

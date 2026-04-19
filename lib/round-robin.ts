import { db } from './db'

const ROUND_ROBIN_KEY = 'last_assigned_sales_rep_index'

/**
 * Get the next sales rep in round-robin order
 * This ensures fair distribution of orders among all active sales reps
 */
export async function getNextSalesRep(excludeUserId?: string): Promise<string | null> {
  // When VAPI_ENABLED is not "true", exclude the AI agent from round-robin so
  // live orders only go to human reps. Flipping VAPI_ENABLED=true brings the
  // AI agent back into rotation automatically.
  const vapiEnabled = process.env.VAPI_ENABLED === "true";

  const salesReps = await db.user.findMany({
    where: {
      role: 'SALES_REP',
      isActive: true,
      ...(!vapiEnabled ? { isAiAgent: false } : {}),
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    orderBy: {
      name: 'asc', // Alphabetical ordering to match UI
    },
  })

  if (salesReps.length === 0) {
    return null
  }

  // Atomically increment the index using a single SQL upsert.
  // This prevents race conditions where two simultaneous submissions
  // read the same index and both assign to the same rep.
  const result = await db.$queryRaw<Array<{ value: string }>>`
    INSERT INTO system_settings (id, key, value, "updatedAt")
    VALUES (gen_random_uuid()::text, ${ROUND_ROBIN_KEY}, '0', NOW())
    ON CONFLICT (key) DO UPDATE
    SET value = ((CAST(system_settings.value AS INTEGER) + 1) % ${salesReps.length})::text,
        "updatedAt" = NOW()
    RETURNING value
  `

  const currentIndex = parseInt(result[0].value)
  const rep = salesReps[currentIndex]

  if (!rep) {
    // Rep list shrank between findMany and the SQL increment (e.g. rep deactivated mid-flight).
    // Return null so the caller saves the order unassigned instead of crashing.
    console.warn(`[getNextSalesRep] Index ${currentIndex} out of bounds for ${salesReps.length} reps — saving order unassigned`)
    return null
  }

  return rep.id
}

/**
 * Reset the round-robin counter (useful when sales reps are added/removed)
 */
export async function resetRoundRobin(): Promise<void> {
  await db.systemSetting.upsert({
    where: { key: ROUND_ROBIN_KEY },
    update: { value: '0' },
    create: {
      key: ROUND_ROBIN_KEY,
      value: '0',
    },
  })
}

/**
 * Get the current round-robin index without incrementing it
 */
export async function getCurrentRoundRobinIndex(): Promise<number> {
  const setting = await db.systemSetting.findUnique({
    where: { key: ROUND_ROBIN_KEY },
  })

  return setting ? parseInt(setting.value) : 0
}

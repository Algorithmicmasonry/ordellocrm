import { db } from "./db"
import type { StockMovementType } from "@prisma/client"

type PrismaTransactionClient = Parameters<Parameters<typeof db.$transaction>[0]>[0]

interface LogStockMovementParams {
  productId: string
  organizationId: string
  type: StockMovementType
  quantity: number       // positive = stock in, negative = stock out
  balanceAfter: number   // product.currentStock after this movement
  agentId?: string | null
  orderId?: string | null
  userId?: string | null
  note?: string | null
  tx?: PrismaTransactionClient // optional transaction client
}

/**
 * Log a stock movement record. Call this after every stock mutation.
 *
 * Pass `tx` when inside a Prisma transaction so the log is part of the
 * same atomic operation. Otherwise it uses the default db client.
 */
export async function logStockMovement({
  productId,
  organizationId,
  type,
  quantity,
  balanceAfter,
  agentId,
  orderId,
  userId,
  note,
  tx,
}: LogStockMovementParams) {
  const client = tx ?? db

  await client.stockMovement.create({
    data: {
      productId,
      organizationId,
      type,
      quantity,
      balanceAfter,
      agentId: agentId ?? undefined,
      orderId: orderId ?? undefined,
      userId: userId ?? undefined,
      note: note ?? undefined,
    },
  })
}

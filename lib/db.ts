import { PrismaClient } from "@prisma/client";

// Prisma error codes that indicate a transient connection problem
const RETRYABLE_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);
const RETRYABLE_MSGS = [
  "connection",
  "timeout",
  "econnrefused",
  "etimedout",
  "socket",
  "can't reach",
  "cannot reach",
  "server has closed",
  "connection pool",
];

function isConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as Record<string, unknown>;
  if (typeof e.code === "string" && RETRYABLE_CODES.has(e.code)) return true;
  if (typeof e.message === "string") {
    const msg = e.message.toLowerCase();
    return RETRYABLE_MSGS.some((m) => msg.includes(m));
  }
  return false;
}

async function retryOperation<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isConnectionError(err) || attempt === maxAttempts) throw err;
      const delayMs = attempt * 1500; // Neon cold-starts can take 2-3s
      console.warn(
        `[db] Connection error (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms…`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

// Prisma client extended with:
// 1. Automatic retry on every query (connection errors, cold starts, P2024)
// 2. Global sandbox filter — all Order read queries default to isSandbox:false
//    unless isSandbox is explicitly specified in the where clause.
//    This means sandbox test orders are invisible to every real stats/orders
//    query without touching individual call sites.
function createPrismaClient() {
  return new PrismaClient()
    .$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            return retryOperation(() => query(args));
          },
        },
      },
    })
    .$extends({
      query: {
        order: {
          async $allOperations({ operation, args, query }) {
            const readOps = [
              "findMany", "findFirst", "findFirstOrThrow",
              "findUnique", "findUniqueOrThrow",
              "count", "aggregate", "groupBy",
            ];
            if (readOps.includes(operation)) {
              const a = args as { where?: Record<string, unknown> };
              if (!a.where) a.where = {};
              if (!("isSandbox" in a.where)) {
                a.where.isSandbox = false;
              }
            }
            return query(args);
          },
        },
      },
    });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Kept for backwards compatibility — wraps any async fn with retry logic.
 * For plain db.* calls you no longer need this; the client retries automatically.
 * Still useful for wrapping db.$transaction() or non-Prisma async operations.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  return retryOperation(fn, maxAttempts);
}

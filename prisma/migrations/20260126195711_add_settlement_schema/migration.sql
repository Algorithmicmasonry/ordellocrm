-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "stockValue" DOUBLE PRECISION NOT NULL,
    "cashCollected" DOUBLE PRECISION NOT NULL,
    "cashReturned" DOUBLE PRECISION NOT NULL,
    "adjustments" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDue" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "settledBy" TEXT,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

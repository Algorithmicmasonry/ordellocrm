/**
 * One-time migration: auto-create ProductBatch records for all existing
 * clearing expenses that have a batchQuantity and productId, then link
 * those expenses to their new batch.
 *
 * Run with: npx tsx prisma/migrate-batches.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const clearingExpenses = await db.expense.findMany({
    where: {
      type: "clearing",
      productId: { not: null },
      batchQuantity: { not: null },
      batchId: null, // not yet linked to a batch
    },
    select: {
      id: true,
      productId: true,
      batchQuantity: true,
      date: true,
      currency: true,
      amount: true,
    },
  });

  console.log(`Found ${clearingExpenses.length} unlinked clearing expense(s).`);

  for (const exp of clearingExpenses) {
    // Format date as "MMM DD, YYYY Batch" e.g. "Feb 19, 2026 Batch"
    const batchName = exp.date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + " Batch";

    const batch = await db.productBatch.create({
      data: {
        productId: exp.productId!,
        name: batchName,
        quantity: exp.batchQuantity!,
        date: exp.date,
      },
    });

    await db.expense.update({
      where: { id: exp.id },
      data: { batchId: batch.id },
    });

    console.log(
      `  ✓ Created batch "${batchName}" (qty: ${exp.batchQuantity}) for product ${exp.productId} → linked expense ${exp.id}`
    );
  }

  console.log("\nMigration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

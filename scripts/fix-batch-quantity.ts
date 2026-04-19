/**
 * One-time migration script:
 * Sets batchQuantity = product.openingStock for all existing
 * clearing and waybill expenses that have a productId and no batchQuantity yet.
 *
 * Run with: npx tsx scripts/fix-batch-quantity.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // Find all clearing/waybill expenses with a product but no batchQuantity
  const expenses = await db.expense.findMany({
    where: {
      type: { in: ["clearing", "waybill"] },
      productId: { not: null },
      batchQuantity: null,
    },
    include: {
      product: {
        select: { id: true, name: true, openingStock: true },
      },
    },
  });

  if (expenses.length === 0) {
    console.log("No expenses to update.");
    return;
  }

  console.log(`Found ${expenses.length} expense(s) to update:\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const expense of expenses) {
    const batchQty = expense.product?.openingStock ?? 0;

    if (batchQty <= 0) {
      console.log(
        `  SKIP  Expense ${expense.id} (${expense.type}) — product "${expense.product?.name}" has openingStock=${batchQty}`
      );
      skippedCount++;
      continue;
    }

    await db.expense.update({
      where: { id: expense.id },
      data: { batchQuantity: batchQty },
    });

    const perUnit = expense.amount / batchQty;
    console.log(
      `  OK    Expense ${expense.id} (${expense.type}) — "${expense.product?.name}" | batchQty=${batchQty} | amount=₦${expense.amount.toLocaleString()} | per-unit=₦${perUnit.toFixed(2)}`
    );
    updatedCount++;
  }

  console.log(
    `\nDone. Updated: ${updatedCount}, Skipped: ${skippedCount}`
  );
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());

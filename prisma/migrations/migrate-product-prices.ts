/**
 * Migration Script: Migrate existing Product prices to ProductPrice table
 *
 * This script:
 * 1. Creates ProductPrice records from existing Product.price/cost/currency
 * 2. Ensures each product has at least one ProductPrice entry
 *
 * Run after creating the product_prices table with: pnpm db:push or pnpm db:migrate
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateProductPrices() {
  console.log('🚀 Starting ProductPrice migration...\n');

  try {
    // Get all products
    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        productPrices: true,
      },
    });

    console.log(`📦 Found ${products.length} products to migrate\n`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      // Check if product already has a ProductPrice for its currency
      const existingPrice = product.productPrices.find(
        (pp) => pp.currency === product.currency
      );

      if (existingPrice) {
        console.log(`⏭️  Skipping ${product.name} - already has ${product.currency} price`);
        skippedCount++;
        continue;
      }

      // Skip products without valid pricing data
      if (product.price === null || product.cost === null) {
        console.log(`⚠️  Skipping ${product.name} - no pricing data`);
        skippedCount++;
        continue;
      }

      // Create ProductPrice from existing Product fields
      await prisma.productPrice.create({
        data: {
          productId: product.id,
          currency: product.currency,
          price: product.price,
          cost: product.cost,
        },
      });

      console.log(`✅ Migrated ${product.name} - ${product.currency} ₦${product.price}`);
      migratedCount++;
    }

    console.log(`\n✨ Migration complete!`);
    console.log(`   - Migrated: ${migratedCount} products`);
    console.log(`   - Skipped: ${skippedCount} products (already had prices)`);
    console.log(`   - Total: ${products.length} products\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateProductPrices()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

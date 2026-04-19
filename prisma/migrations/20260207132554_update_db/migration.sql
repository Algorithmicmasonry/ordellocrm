-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'NGN';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'NGN',
ALTER COLUMN "price" DROP NOT NULL,
ALTER COLUMN "cost" DROP NOT NULL;

-- CreateTable
CREATE TABLE "product_prices" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_prices_productId_idx" ON "product_prices"("productId");

-- CreateIndex
CREATE INDEX "product_prices_currency_idx" ON "product_prices"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "product_prices_productId_currency_key" ON "product_prices"("productId", "currency");

-- CreateIndex
CREATE INDEX "expenses_currency_idx" ON "expenses"("currency");

-- CreateIndex
CREATE INDEX "products_currency_idx" ON "products"("currency");

-- AddForeignKey
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

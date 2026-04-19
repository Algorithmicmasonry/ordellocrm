-- CreateTable
CREATE TABLE "product_package_components" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_package_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_package_components_packageId_idx" ON "product_package_components"("packageId");

-- CreateIndex
CREATE INDEX "product_package_components_productId_idx" ON "product_package_components"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_package_components_packageId_productId_key" ON "product_package_components"("packageId", "productId");

-- AddForeignKey
ALTER TABLE "product_package_components" ADD CONSTRAINT "product_package_components_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "product_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_package_components" ADD CONSTRAINT "product_package_components_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

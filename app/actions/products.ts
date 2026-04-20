"use server";

import { db } from "@/lib/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { logStockMovement } from "@/lib/stock-movements";
import { requireOrgContext } from "@/lib/org-context";
import type { Currency } from "@prisma/client";

// ---------------------------------------------------------------------------
// createProduct — ADMIN + INVENTORY_MANAGER only
// ---------------------------------------------------------------------------
export async function createProduct(data: {
  name: string;
  description?: string;
  price: number;
  cost: number;
  currency?: Currency;
  sku?: string;
  openingStock: number;
  reorderPoint?: number;
  isActive?: boolean;
}) {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER" && ctx.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Insufficient permissions" };
    }

    // SKU uniqueness check is per-org (not global)
    if (data.sku) {
      const existingProduct = await db.product.findFirst({
        where: { organizationId: ctx.organizationId, sku: data.sku },
        select: { id: true, name: true },
      });
      if (existingProduct) {
        return {
          success: false,
          error: `SKU "${data.sku}" is already in use by "${existingProduct.name}".`,
        };
      }
    }

    const product = await db.$transaction(async (tx) => {
      const { price, cost, currency = "NGN", ...productData } = data;

      const newProduct = await tx.product.create({
        data: {
          ...productData,
          organizationId: ctx.organizationId,
          currency,
          currentStock: data.openingStock,
          reorderPoint: data.reorderPoint ?? 0,
          isActive: data.isActive ?? true,
          price: null,
          cost: null,
        },
      });

      await tx.productPrice.create({
        data: { productId: newProduct.id, currency, price, cost },
      });

      return newProduct;
    });

    revalidatePath("/dashboard/admin/inventory");
    revalidatePath("/dashboard/inventory");
    return { success: true, product };
  } catch (error: any) {
    console.error("Error creating product:", error);
    if (error.code === "P2002") {
      return { success: false, error: "A product with these details already exists." };
    }
    return { success: false, error: "Failed to create product. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// updateProduct — ADMIN + INVENTORY_MANAGER only
// ---------------------------------------------------------------------------
export async function updateProduct(
  productId: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    cost?: number;
    currency?: Currency;
    sku?: string;
    isActive?: boolean;
  },
) {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER" && ctx.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Insufficient permissions" };
    }

    const currentProduct = await db.product.findUnique({
      where: { id: productId, organizationId: ctx.organizationId },
      select: { currency: true },
    });

    if (!currentProduct) return { success: false, error: "Product not found" };

    const product = await db.$transaction(async (tx) => {
      const { price, cost, currency, ...productDataWithoutPricing } = data;

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          ...productDataWithoutPricing,
          ...(currency && { currency }),
        },
      });

      if (price !== undefined || cost !== undefined || currency !== undefined) {
        const targetCurrency = currency || currentProduct.currency;
        const currentPrice = await tx.productPrice.findUnique({
          where: { productId_currency: { productId, currency: targetCurrency } },
        });

        await tx.productPrice.upsert({
          where: { productId_currency: { productId, currency: targetCurrency } },
          update: {
            ...(price !== undefined && { price }),
            ...(cost !== undefined && { cost }),
          },
          create: {
            productId,
            currency: targetCurrency,
            price: price ?? currentPrice?.price ?? 0,
            cost: cost ?? currentPrice?.cost ?? 0,
          },
        });
      }

      return updatedProduct;
    });

    revalidatePath("/dashboard/admin/inventory");
    revalidatePath("/dashboard/inventory");
    revalidatePath(`/dashboard/admin/inventory/${productId}/pricing`);
    revalidateTag("products");
    return { success: true, product };
  } catch (error) {
    console.error("Error updating product:", error);
    return { success: false, error: "Failed to update product" };
  }
}

// ---------------------------------------------------------------------------
// addStock — ADMIN + INVENTORY_MANAGER only
// ---------------------------------------------------------------------------
export async function addStock(productId: string, quantity: number) {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER" && ctx.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Insufficient permissions" };
    }

    // Verify product belongs to this org
    const exists = await db.product.findUnique({
      where: { id: productId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!exists) return { success: false, error: "Product not found" };

    const product = await db.product.update({
      where: { id: productId },
      data: { currentStock: { increment: quantity } },
    });

    await logStockMovement({
      productId,
      organizationId: ctx.organizationId,
      type: "STOCK_ADDED",
      quantity,
      balanceAfter: product.currentStock,
      userId: ctx.userId,
    });

    revalidatePath("/dashboard/admin/inventory");
    revalidatePath("/dashboard/inventory");
    return { success: true, product };
  } catch (error) {
    console.error("Error adding stock:", error);
    return { success: false, error: "Failed to add stock" };
  }
}

// ---------------------------------------------------------------------------
// getAllProducts — scoped to org
// ---------------------------------------------------------------------------
export async function getAllProducts() {
  try {
    const ctx = await requireOrgContext();

    const products = await db.product.findMany({
      where: { organizationId: ctx.organizationId, isDeleted: false },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, products };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

// ---------------------------------------------------------------------------
// getActiveProducts — for order form, scoped to org
// ---------------------------------------------------------------------------
export async function getActiveProducts(organizationId: string) {
  try {
    const allProducts = await db.product.findMany({
      where: { organizationId, isActive: true, isDeleted: false },
      select: {
        id: true,
        name: true,
        currentStock: true,
        currency: true,
        productPrices: true,
      },
      orderBy: { name: "asc" },
    });

    const products = allProducts
      .map((product) => {
        const productPrice = product.productPrices.find(
          (p) => p.currency === product.currency,
        );
        if (!productPrice) return null;
        return {
          id: product.id,
          name: product.name,
          price: productPrice.price,
          currentStock: product.currentStock,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    return { success: true, products };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

// ---------------------------------------------------------------------------
// softDeleteProduct — ADMIN + INVENTORY_MANAGER only
// ---------------------------------------------------------------------------
export async function softDeleteProduct(productId: string) {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER" && ctx.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Insufficient permissions" };
    }

    const product = await db.product.findUnique({
      where: { id: productId, organizationId: ctx.organizationId },
    });

    if (!product) return { success: false, error: "Product not found" };

    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    revalidatePath("/dashboard/admin/inventory");
    revalidateTag("products");
    return { success: true, product: updatedProduct };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, error: "Failed to delete product" };
  }
}

// ---------------------------------------------------------------------------
// getProductWithPackages — for order form, scoped to org
// ---------------------------------------------------------------------------
export async function getProductWithPackages(
  productId: string,
  organizationId: string,
) {
  try {
    const product = await db.product.findUnique({
      where: { id: productId, organizationId, isActive: true, isDeleted: false },
      include: {
        packages: {
          where: { isActive: true },
          include: {
            components: {
              include: {
                product: {
                  select: { id: true, name: true, isActive: true, isDeleted: true },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    if (!product) return { success: false, error: "Product not found" };
    if (product.packages.length === 0) return { success: false, error: "Product has no available packages" };

    return { success: true, data: product };
  } catch (error) {
    console.error("Error fetching product:", error);
    return { success: false, error: "Failed to fetch product" };
  }
}

// ---------------------------------------------------------------------------
// updatePackageSelectorNote — ADMIN only
// ---------------------------------------------------------------------------
export async function updatePackageSelectorNote(
  productId: string,
  note: string | null,
) {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Insufficient permissions" };
    }

    const product = await db.product.findUnique({
      where: { id: productId, organizationId: ctx.organizationId, isDeleted: false },
    });

    if (!product) return { success: false, error: "Product not found" };

    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: { packageSelectorNote: note },
    });

    revalidatePath(`/dashboard/admin/inventory/${productId}/packages`);
    revalidateTag("products");
    return { success: true, product: updatedProduct };
  } catch (error) {
    console.error("Error updating package selector note:", error);
    return { success: false, error: "Failed to update package selector note" };
  }
}

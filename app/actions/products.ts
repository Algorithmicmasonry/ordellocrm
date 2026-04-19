"use server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { logStockMovement } from "@/lib/stock-movements";
import type { Currency } from "@prisma/client";

/**
 * Create a new product (Admin only)
 */
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
    // Authorization: ADMIN and INVENTORY_MANAGER only
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (user?.role !== "ADMIN" && user?.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Insufficient permissions" };
    }

    // Check if SKU is provided and already exists
    if (data.sku) {
      const existingProduct = await db.product.findUnique({
        where: { sku: data.sku },
        select: { id: true, name: true, sku: true },
      });

      if (existingProduct) {
        return {
          success: false,
          error: `SKU "${data.sku}" is already in use by "${existingProduct.name}". Please use a different SKU.`,
        };
      }
    }

    // Create the product and its price entry in a transaction
    const product = await db.$transaction(async (tx) => {
      // Extract pricing data from the input
      const { price, cost, currency = "NGN", ...productData } = data;

      // Create the product WITHOUT the deprecated price/cost fields
      const newProduct = await tx.product.create({
        data: {
          ...productData,
          currency, // Keep currency as it's the primary currency
          currentStock: data.openingStock,
          reorderPoint: data.reorderPoint ?? 0,
          isActive: data.isActive ?? true,
          // Deprecated fields - explicitly set to null (not used)
          price: null,
          cost: null,
        },
      });

      // Create the ProductPrice entry - SINGLE SOURCE OF TRUTH for pricing
      await tx.productPrice.create({
        data: {
          productId: newProduct.id,
          currency,
          price,
          cost,
        },
      });

      return newProduct;
    });

    revalidatePath("/admin/products");
    revalidatePath("/dashboard/admin/inventory");
    revalidatePath("/dashboard/inventory");

    return { success: true, product };
  } catch (error: any) {
    console.error("Error creating product:", error);

    // Handle Prisma unique constraint errors
    if (error.code === "P2002") {
      const target = error.meta?.target;

      if (target?.includes("sku")) {
        return {
          success: false,
          error: "This SKU is already in use. Please choose a different one.",
        };
      }

      if (target?.includes("name")) {
        return {
          success: false,
          error: "A product with this name already exists.",
        };
      }

      return {
        success: false,
        error: "A product with these details already exists.",
      };
    }

    // Handle other potential errors
    return {
      success: false,
      error: "Failed to create product. Please try again.",
    };
  }
}
/**
 * Update product (Admin only)
 */
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
    // Authorization: ADMIN and INVENTORY_MANAGER only
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (user?.role !== "ADMIN" && user?.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Insufficient permissions" };
    }

    // Get current product to know the currency
    const currentProduct = await db.product.findUnique({
      where: { id: productId },
      select: { currency: true },
    });

    if (!currentProduct) {
      return { success: false, error: "Product not found" };
    }

    const product = await db.$transaction(async (tx) => {
      // Extract pricing data from the input
      const { price, cost, currency, ...productDataWithoutPricing } = data;

      // Update the product WITHOUT the deprecated price/cost fields
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          ...productDataWithoutPricing,
          // Only update currency if provided (it's the primary currency)
          ...(currency && { currency }),
        },
      });

      // If price, cost, or currency were updated, update ProductPrice table (SINGLE SOURCE OF TRUTH)
      if (price !== undefined || cost !== undefined || currency !== undefined) {
        const targetCurrency = currency || currentProduct.currency;
        const currentPrice = await tx.productPrice.findUnique({
          where: {
            productId_currency: {
              productId: productId,
              currency: targetCurrency,
            },
          },
        });

        // Upsert the ProductPrice entry
        await tx.productPrice.upsert({
          where: {
            productId_currency: {
              productId: productId,
              currency: targetCurrency,
            },
          },
          update: {
            ...(price !== undefined && { price }),
            ...(cost !== undefined && { cost }),
          },
          create: {
            productId: productId,
            currency: targetCurrency,
            price: price ?? currentPrice?.price ?? 0,
            cost: cost ?? currentPrice?.cost ?? 0,
          },
        });
      }

      return updatedProduct;
    });

    revalidatePath("/admin/products");
    revalidatePath("/dashboard/admin/inventory");
    revalidatePath("/dashboard/inventory");
    revalidatePath(`/dashboard/admin/inventory/${productId}/pricing`);
    revalidateTag("products", {}); // Bust embed form product cache immediately

    return { success: true, product };
  } catch (error) {
    console.error("Error updating product:", error);
    return { success: false, error: "Failed to update product" };
  }
}

/**
 * Add stock to product (Admin and Inventory Manager)
 */
export async function addStock(productId: string, quantity: number) {
  try {
    // Authorization: ADMIN and INVENTORY_MANAGER only
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (user?.role !== "ADMIN" && user?.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Insufficient permissions" };
    }

    const product = await db.product.update({
      where: { id: productId },
      data: {
        currentStock: {
          increment: quantity,
        },
      },
    });

    await logStockMovement({
      productId,
      type: "STOCK_ADDED",
      quantity,
      balanceAfter: product.currentStock,
      userId: session.user.id,
    });

    revalidatePath("/admin/products");
    revalidatePath("/dashboard/admin/inventory");
    revalidatePath("/dashboard/inventory");

    return { success: true, product };
  } catch (error) {
    console.error("Error adding stock:", error);
    return { success: false, error: "Failed to add stock" };
  }
}

/**
 * Get all products
 */
export async function getAllProducts() {
  try {
    const products = await db.product.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, products };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

/**
 * Get active products (for order form)
 */
export async function getActiveProducts() {
  try {
    const allProducts = await db.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        currentStock: true,
        currency: true,
        productPrices: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Only return products with valid pricing
    const products = allProducts
      .map((product) => {
        const productPrice = product.productPrices.find(
          (p) => p.currency === product.currency
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

/**
 * Soft delete a product (Admin and Inventory Manager)
 */
export async function softDeleteProduct(productId: string) {
  try {
    // Authorization: ADMIN and INVENTORY_MANAGER only
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (user?.role !== "ADMIN" && user?.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Insufficient permissions" };
    }

    // Check if product exists
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        orders: {
          take: 1,
        },
      },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    // Soft delete the product
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    revalidatePath("/admin/products");
    revalidatePath("/dashboard/admin/inventory");
    revalidateTag("products", {}); // Bust embed form product cache immediately

    return { success: true, product: updatedProduct };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, error: "Failed to delete product" };
  }
}

/**
 * Get product with its active packages (for order form)
 */
export async function getProductWithPackages(productId: string) {
  try {
    const product = await db.product.findUnique({
      where: {
        id: productId,
        isActive: true,
        isDeleted: false,
      },
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

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    if (product.packages.length === 0) {
      return { success: false, error: "Product has no available packages" };
    }

    return { success: true, data: product };
  } catch (error) {
    console.error("Error fetching product:", error);
    return { success: false, error: "Failed to fetch product" };
  }
}

/**
 * Update package selector note for a product (Admin only)
 */
export async function updatePackageSelectorNote(
  productId: string,
  note: string | null
) {
  try {
    // Authorization: ADMIN only
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (user?.role !== "ADMIN") {
      return { success: false, error: "Insufficient permissions" };
    }

    // Check if product exists
    const product = await db.product.findUnique({
      where: { id: productId, isDeleted: false },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    // Update the package selector note
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: {
        packageSelectorNote: note,
      },
    });

    revalidatePath(`/dashboard/admin/inventory/${productId}/packages`);
    revalidatePath("/order-form");
    revalidatePath("/order-form/embed");
    revalidateTag("products", {}); // Bust embed form product cache immediately

    return { success: true, product: updatedProduct };
  } catch (error) {
    console.error("Error updating package selector note:", error);
    return {
      success: false,
      error: "Failed to update package selector note",
    };
  }
}

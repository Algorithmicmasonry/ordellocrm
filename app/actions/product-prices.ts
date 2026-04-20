"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/lib/org-context";
import type { Currency } from "@prisma/client";

/**
 * Get all prices for a product (Admin + Inventory Manager)
 */
export async function getProductPrices(productId: string) {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER" && ctx.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Unauthorized" };
    }

    // Verify product belongs to this org
    const product = await db.product.findUnique({
      where: { id: productId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!product) return { success: false, error: "Product not found" };

    const prices = await db.productPrice.findMany({
      where: { productId },
      orderBy: { currency: "asc" },
    });

    return { success: true, data: prices };
  } catch (error) {
    console.error("Error fetching product prices:", error);
    return { success: false, error: "Failed to fetch product prices" };
  }
}

/**
 * Add or update a product price for a specific currency (Admin + Inventory Manager)
 */
export async function upsertProductPrice(data: {
  productId: string;
  currency: Currency;
  price: number;
  cost: number;
}) {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER" && ctx.role !== "INVENTORY_MANAGER") {
      return { success: false, error: "Unauthorized" };
    }

    if (data.price < 0 || data.cost < 0) {
      return { success: false, error: "Price and cost must be positive numbers" };
    }

    // Verify product belongs to this org
    const product = await db.product.findUnique({
      where: { id: data.productId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!product) return { success: false, error: "Product not found" };

    const productPrice = await db.productPrice.upsert({
      where: { productId_currency: { productId: data.productId, currency: data.currency } },
      update: { price: data.price, cost: data.cost },
      create: { productId: data.productId, currency: data.currency, price: data.price, cost: data.cost },
    });

    revalidatePath(`/dashboard/admin/inventory/${data.productId}`);
    revalidatePath("/dashboard/admin/inventory");

    return { success: true, data: productPrice };
  } catch (error) {
    console.error("Error upserting product price:", error);
    return { success: false, error: "Failed to save product price" };
  }
}

/**
 * Delete a product price for a specific currency (Admin only)
 */
export async function deleteProductPrice(productId: string, currency: Currency) {
  try {
    const ctx = await requireOrgContext();

    if (ctx.role !== "ADMIN" && ctx.role !== "OWNER") {
      return { success: false, error: "Unauthorized" };
    }

    // Verify product belongs to this org
    const product = await db.product.findUnique({
      where: { id: productId, organizationId: ctx.organizationId },
      select: { id: true, currency: true },
    });
    if (!product) return { success: false, error: "Product not found" };

    if (product.currency === currency) {
      return {
        success: false,
        error: "Cannot delete primary currency price. Change the product's primary currency first.",
      };
    }

    // Check if any packages use this currency
    const packagesUsingCurrency = await db.productPackage.count({
      where: { productId, currency, isActive: true },
    });
    if (packagesUsingCurrency > 0) {
      return {
        success: false,
        error: `Cannot delete ${currency} price. ${packagesUsingCurrency} active package(s) use this currency. Delete or deactivate those packages first.`,
      };
    }

    await db.productPrice.delete({
      where: { productId_currency: { productId, currency } },
    });

    revalidatePath(`/dashboard/admin/inventory/${productId}`);
    revalidatePath("/dashboard/admin/inventory");

    return { success: true };
  } catch (error) {
    console.error("Error deleting product price:", error);
    return { success: false, error: "Failed to delete product price" };
  }
}

/**
 * Check if a product has pricing for a specific currency
 */
export async function hasProductPrice(productId: string, currency: Currency) {
  try {
    const ctx = await requireOrgContext();

    // Verify product belongs to this org
    const product = await db.product.findUnique({
      where: { id: productId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!product) return { success: false, error: "Product not found", data: false };

    const price = await db.productPrice.findUnique({
      where: { productId_currency: { productId, currency } },
    });

    return { success: true, data: !!price };
  } catch (error) {
    console.error("Error checking product price:", error);
    return { success: false, error: "Failed to check product price", data: false };
  }
}

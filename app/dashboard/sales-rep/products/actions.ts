"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";

interface GetProductsCatalogParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  stockFilter?: string;
}

export async function getProductsCatalog({
  page = 1,
  limit = 12,
  search = "",
  sort = "name",
  stockFilter = "all",
}: GetProductsCatalogParams = {}) {
  try {
    const ctx = await requireOrgContext();
    if (ctx.role !== "SALES_REP") return { success: false, error: "Unauthorized" };

    const skip = (page - 1) * limit;

    const whereClause = {
      organizationId: ctx.organizationId,
      isActive: true,
      isDeleted: false,
      ...(search && search.trim() !== ""
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { sku: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const allProducts = await db.product.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        sku: true,
        currentStock: true,
        reorderPoint: true,
        currency: true,
        productPrices: true,
        agentStock: { select: { quantity: true } },
      },
    });

    let productsWithPrice = allProducts.map((product) => {
      const agentStockTotal = product.agentStock.reduce((sum, s) => sum + s.quantity, 0);
      const availableStock = product.currentStock + agentStockTotal;
      const productPrice = product.productPrices.find((p) => p.currency === product.currency);
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        currentStock: availableStock,
        reorderPoint: product.reorderPoint,
        currency: product.currency,
        price: productPrice?.price || 0,
      };
    });

    if (stockFilter === "in-stock") {
      productsWithPrice = productsWithPrice.filter((p) => p.currentStock > 10);
    } else if (stockFilter === "low-stock") {
      productsWithPrice = productsWithPrice.filter((p) => p.currentStock >= 1 && p.currentStock <= 10);
    } else if (stockFilter === "out-of-stock") {
      productsWithPrice = productsWithPrice.filter((p) => p.currentStock <= 0);
    }

    switch (sort) {
      case "price-asc": productsWithPrice.sort((a, b) => a.price - b.price); break;
      case "price-desc": productsWithPrice.sort((a, b) => b.price - a.price); break;
      case "stock-asc": productsWithPrice.sort((a, b) => a.currentStock - b.currentStock); break;
      case "stock-desc": productsWithPrice.sort((a, b) => b.currentStock - a.currentStock); break;
      default: productsWithPrice.sort((a, b) => a.name.localeCompare(b.name)); break;
    }

    const totalProducts = productsWithPrice.length;
    const products = productsWithPrice.slice(skip, skip + limit);

    // Stats scoped to this org's active products
    const allActiveProducts = await db.product.findMany({
      where: { organizationId: ctx.organizationId, isActive: true, isDeleted: false },
      select: { currentStock: true, agentStock: { select: { quantity: true } } },
    });

    const totalActive = allActiveProducts.length;
    const lowStockCount = allActiveProducts.filter((p) => {
      const total = p.currentStock + p.agentStock.reduce((s, a) => s + a.quantity, 0);
      return total >= 1 && total <= 10;
    }).length;
    const outOfStockCount = allActiveProducts.filter((p) => {
      const total = p.currentStock + p.agentStock.reduce((s, a) => s + a.quantity, 0);
      return total <= 0;
    }).length;

    return {
      success: true,
      data: {
        products,
        pagination: { total: totalProducts, page, limit, totalPages: Math.ceil(totalProducts / limit) },
        stats: { totalActive, lowStockCount, outOfStockCount },
      },
    };
  } catch (error) {
    console.error("Error fetching products catalog:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

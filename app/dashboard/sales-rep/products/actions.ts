"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user || session.user.role !== "SALES_REP") {
      return { success: false, error: "Unauthorized" };
    }

    const skip = (page - 1) * limit;

    // Build where clause (search only; stock filtering is computed from warehouse + agent stock)
    const whereClause = {
      isActive: true,
      isDeleted: false,
      ...(search && search.trim() !== ""
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { sku: { contains: search, mode: "insensitive" as const } },
              {
                description: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    // Get all matching products (stock filter/sort are computed after including agent stock)
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
        agentStock: {
          select: {
            quantity: true,
          },
        },
      },
    });

    // Transform products to include computed available stock (warehouse + agents)
    let productsWithPrice = allProducts.map((product) => {
        const agentStockTotal = product.agentStock.reduce(
          (sum, stock) => sum + stock.quantity,
          0
        );
        const availableStock = product.currentStock + agentStockTotal;
        const productPrice = product.productPrices.find(
          (p) => p.currency === product.currency
        );
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          sku: product.sku,
          // Keep field name for UI compatibility, but value is total available stock.
          currentStock: availableStock,
          reorderPoint: product.reorderPoint,
          currency: product.currency,
          price: productPrice?.price || 0,
        };
      });

    // Apply stock filter against total available stock
    if (stockFilter === "in-stock") {
      productsWithPrice = productsWithPrice.filter((p) => p.currentStock > 10);
    } else if (stockFilter === "low-stock") {
      productsWithPrice = productsWithPrice.filter(
        (p) => p.currentStock >= 1 && p.currentStock <= 10
      );
    } else if (stockFilter === "out-of-stock") {
      productsWithPrice = productsWithPrice.filter((p) => p.currentStock <= 0);
    }

    // Sort after computing derived fields
    switch (sort) {
      case "price-asc":
        productsWithPrice.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        productsWithPrice.sort((a, b) => b.price - a.price);
        break;
      case "stock-asc":
        productsWithPrice.sort((a, b) => a.currentStock - b.currentStock);
        break;
      case "stock-desc":
        productsWithPrice.sort((a, b) => b.currentStock - a.currentStock);
        break;
      case "name":
      default:
        productsWithPrice.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    const totalProducts = productsWithPrice.length;

    // Apply pagination after sorting
    const products = productsWithPrice.slice(skip, skip + limit);

    // Get stock stats across all active products using total available stock
    const allActiveProducts = await db.product.findMany({
      where: { isActive: true, isDeleted: false },
      select: {
        currentStock: true,
        agentStock: {
          select: { quantity: true },
        },
      },
    });

    const totalActive = allActiveProducts.length;
    const lowStockCount = allActiveProducts.filter((product) => {
      const totalAgentStock = product.agentStock.reduce(
        (sum, stock) => sum + stock.quantity,
        0
      );
      const totalStock = product.currentStock + totalAgentStock;
      return totalStock >= 1 && totalStock <= 10;
    }).length;

    const outOfStockCount = allActiveProducts.filter((product) => {
      const totalAgentStock = product.agentStock.reduce(
        (sum, stock) => sum + stock.quantity,
        0
      );
      const totalStock = product.currentStock + totalAgentStock;
      return totalStock <= 0;
    }).length;

    return {
      success: true,
      data: {
        products,
        pagination: {
          total: totalProducts,
          page,
          limit,
          totalPages: Math.ceil(totalProducts / limit),
        },
        stats: {
          totalActive,
          lowStockCount,
          outOfStockCount,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching products catalog:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

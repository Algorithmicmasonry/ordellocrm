"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import type { Currency } from "@prisma/client";

type PackageComponentInput = {
  productId: string;
  quantity: number;
  isFree?: boolean;
};

function normalizeComponents(components?: PackageComponentInput[]) {
  if (!components) return [];

  return components
    .filter((c) => c.productId && Number.isFinite(c.quantity))
    .map((c) => ({
      productId: c.productId,
      quantity: Math.max(1, Math.floor(c.quantity)),
      isFree: true,
    }));
}

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }
  return session.user;
}

/**
 * Get all active packages for a specific product
 */
export async function getProductPackages(productId: string) {
  try {
    const packages = await db.productPackage.findMany({
      where: {
        productId,
        isActive: true,
      },
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
      orderBy: {
        displayOrder: "asc",
      },
    });

    return { success: true, data: packages };
  } catch (error) {
    console.error("Error fetching product packages:", error);
    return { success: false, error: "Failed to fetch packages" };
  }
}

/**
 * Get all packages for a product (including inactive) - Admin only
 */
export async function getAllProductPackages(productId: string) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const packages = await db.productPackage.findMany({
      where: {
        productId,
      },
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
      orderBy: {
        displayOrder: "asc",
      },
    });

    return { success: true, data: packages };
  } catch (error) {
    console.error("Error fetching all product packages:", error);
    return { success: false, error: "Failed to fetch packages" };
  }
}

/**
 * Create a new product package
 */
export async function createPackage({
  productId,
  name,
  description,
  quantity,
  price,
  currency = "NGN",
  displayOrder = 0,
  components,
}: {
  productId: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
  currency?: Currency;
  displayOrder?: number;
  components?: PackageComponentInput[];
}) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // VALIDATION: Check if product has pricing for the selected currency
    const productPrice = await db.productPrice.findUnique({
      where: {
        productId_currency: {
          productId,
          currency,
        },
      },
    });

    if (!productPrice) {
      return {
        success: false,
        error: `Cannot create ${currency} package. Please add ${currency} pricing to this product first.`,
      };
    }

    // Check for duplicate package name + currency combination
    const existingPackage = await db.productPackage.findFirst({
      where: {
        productId,
        name,
        currency,
        isActive: true,
      },
    });

    if (existingPackage) {
      return {
        success: false,
        error: `A package named "${name}" already exists for ${currency}`,
      };
    }

    const normalizedComponents = normalizeComponents(components);
    const duplicateComponentIds = new Set<string>();
    for (const component of normalizedComponents) {
      if (duplicateComponentIds.has(component.productId)) {
        return {
          success: false,
          error: "A companion product was added more than once in this package.",
        };
      }
      duplicateComponentIds.add(component.productId);
    }

    if (normalizedComponents.some((c) => c.productId === productId)) {
      return {
        success: false,
        error: "Base product is already tracked by package quantity; do not add it as a companion.",
      };
    }

    if (normalizedComponents.length > 0) {
      const validProducts = await db.product.findMany({
        where: {
          id: { in: normalizedComponents.map((c) => c.productId) },
          isActive: true,
          isDeleted: false,
        },
        select: { id: true },
      });
      if (validProducts.length !== normalizedComponents.length) {
        return {
          success: false,
          error: "One or more companion products are invalid or inactive.",
        };
      }
    }

    const package_ = await db.$transaction(async (tx) => {
      const created = await tx.productPackage.create({
        data: {
          productId,
          name,
          description,
          quantity,
          price,
          currency,
          displayOrder,
        },
      });

      if (normalizedComponents.length > 0) {
        await tx.productPackageComponent.createMany({
          data: normalizedComponents.map((component) => ({
            packageId: created.id,
            productId: component.productId,
            quantity: component.quantity,
            isFree: component.isFree,
          })),
        });
      }

      return tx.productPackage.findUnique({
        where: { id: created.id },
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
      });
    });

    revalidatePath("/dashboard/admin/inventory");
    revalidatePath(`/dashboard/admin/inventory/${productId}/packages`);
    revalidatePath(`/order-form`);
    revalidatePath(`/order-form/embed`);
    revalidateTag("products", {}); // Bust the embed form product cache immediately

    return { success: true, data: package_ };
  } catch (error) {
    console.error("Error creating package:", error);
    return { success: false, error: "Failed to create package" };
  }
}

/**
 * Update a product package
 */
export async function updatePackage({
  id,
  name,
  description,
  quantity,
  price,
  currency,
  isActive,
  displayOrder,
  components,
}: {
  id: string;
  name?: string;
  description?: string;
  quantity?: number;
  price?: number;
  currency?: Currency;
  isActive?: boolean;
  displayOrder?: number;
  components?: PackageComponentInput[];
}) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const existing = await db.productPackage.findUnique({
      where: { id },
      select: { productId: true, currency: true },
    });

    if (!existing) {
      return { success: false, error: "Package not found" };
    }

    const targetCurrency = currency ?? existing.currency;
    if (currency !== undefined && currency !== existing.currency) {
      const productPrice = await db.productPrice.findUnique({
        where: {
          productId_currency: {
            productId: existing.productId,
            currency: targetCurrency,
          },
        },
      });
      if (!productPrice) {
        return {
          success: false,
          error: `Cannot change package currency to ${targetCurrency}. Add product pricing for that currency first.`,
        };
      }
    }

    const normalizedComponents = components ? normalizeComponents(components) : undefined;
    if (normalizedComponents) {
      const duplicateComponentIds = new Set<string>();
      for (const component of normalizedComponents) {
        if (duplicateComponentIds.has(component.productId)) {
          return {
            success: false,
            error: "A companion product was added more than once in this package.",
          };
        }
        duplicateComponentIds.add(component.productId);
      }

      if (normalizedComponents.some((c) => c.productId === existing.productId)) {
        return {
          success: false,
          error: "Base product is already tracked by package quantity; do not add it as a companion.",
        };
      }

      if (normalizedComponents.length > 0) {
        const validProducts = await db.product.findMany({
          where: {
            id: { in: normalizedComponents.map((c) => c.productId) },
            isActive: true,
            isDeleted: false,
          },
          select: { id: true },
        });
        if (validProducts.length !== normalizedComponents.length) {
          return {
            success: false,
            error: "One or more companion products are invalid or inactive.",
          };
        }
      }
    }

    const package_ = await db.$transaction(async (tx) => {
      const updateData: Record<string, string | number | boolean> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (quantity !== undefined) updateData.quantity = quantity;
      if (price !== undefined) updateData.price = price;
      if (currency !== undefined) updateData.currency = currency;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

      await tx.productPackage.update({
        where: { id },
        data: updateData,
      });

      if (normalizedComponents) {
        await tx.productPackageComponent.deleteMany({
          where: { packageId: id },
        });

        if (normalizedComponents.length > 0) {
          await tx.productPackageComponent.createMany({
            data: normalizedComponents.map((component) => ({
              packageId: id,
              productId: component.productId,
              quantity: component.quantity,
              isFree: component.isFree,
            })),
          });
        }
      }

      return tx.productPackage.findUnique({
        where: { id },
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
      });
    });

    revalidatePath("/dashboard/admin/inventory");
    revalidatePath(`/dashboard/admin/inventory/${existing.productId}/packages`);
    revalidatePath(`/order-form`);
    revalidatePath(`/order-form/embed`);
    revalidateTag("products", {}); // Bust the embed form product cache immediately

    return { success: true, data: package_ };
  } catch (error) {
    console.error("Error updating package:", error);
    return { success: false, error: "Failed to update package" };
  }
}

/**
 * Delete a product package
 */
export async function deletePackage(id: string) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const existing = await db.productPackage.findUnique({
      where: { id },
      select: { productId: true },
    });
    if (!existing) {
      return { success: false, error: "Package not found" };
    }

    await db.productPackage.delete({
      where: { id },
    });

    revalidatePath("/dashboard/admin/inventory");
    revalidatePath(`/dashboard/admin/inventory/${existing.productId}/packages`);
    revalidatePath(`/order-form`);
    revalidatePath(`/order-form/embed`);
    revalidateTag("products", {}); // Bust the embed form product cache immediately

    return { success: true };
  } catch (error) {
    console.error("Error deleting package:", error);
    return { success: false, error: "Failed to delete package" };
  }
}

/**
 * Toggle package active status
 */
export async function togglePackageStatus(id: string) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const package_ = await db.productPackage.findUnique({
      where: { id },
    });

    if (!package_) {
      return { success: false, error: "Package not found" };
    }

    const updated = await db.productPackage.update({
      where: { id },
      data: { isActive: !package_.isActive },
    });

    revalidatePath("/dashboard/admin/inventory");
    revalidatePath(`/dashboard/admin/inventory/${package_.productId}/packages`);
    revalidatePath(`/order-form`);
    revalidatePath(`/order-form/embed`);
    revalidateTag("products", {}); // Bust the embed form product cache immediately

    return { success: true, data: updated };
  } catch (error) {
    console.error("Error toggling package status:", error);
    return { success: false, error: "Failed to toggle package status" };
  }
}

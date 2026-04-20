import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/products/available?orgSlug=kolor-naturals
 *
 * Public endpoint used by the embedded order form.
 * orgSlug is required — returns only that org's active products.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const orgSlug = searchParams.get("orgSlug");

    if (!orgSlug) {
      return NextResponse.json(
        { success: false, error: "orgSlug is required" },
        { status: 400 },
      );
    }

    // Resolve org from slug
    const org = await db.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, status: true },
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 },
      );
    }

    const products = await db.product.findMany({
      where: {
        organizationId: org.id,
        isDeleted: false,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching available products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}

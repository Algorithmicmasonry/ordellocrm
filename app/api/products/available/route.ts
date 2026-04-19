import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const products = await db.product.findMany({
      where: {
        isDeleted: false,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching available products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProductPricesList } from "./_components";

interface ProductPricingPageProps {
  params: Promise<{ productId: string }>;
}

export default async function ProductPricingPage({
  params,
}: ProductPricingPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const { productId } = await params;

  // Fetch product with prices
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      productPrices: {
        orderBy: { currency: "asc" },
      },
    },
  });

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The product you're looking for doesn't exist.
        </p>
        <Button asChild>
          <Link href="/dashboard/admin/inventory">
            <ArrowLeft className="size-4 mr-2" />
            Back to Inventory
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/admin/inventory">
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-muted-foreground">
            Manage multi-currency pricing and costs
          </p>
        </div>
      </div>

      {/* Pricing List */}
      <ProductPricesList
        productId={product.id}
        productName={product.name}
        primaryCurrency={product.currency}
        prices={product.productPrices || []}
      />

      {/* Info Card */}
      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">About Multi-Currency Pricing</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Set different prices for each currency to enable multi-currency order forms</li>
          <li>• Packages can only be created in currencies with configured pricing</li>
          <li>• The primary currency ({product.currency}) cannot be deleted</li>
          <li>• Deleting a currency requires removing all packages in that currency first</li>
        </ul>
      </div>
    </div>
  );
}

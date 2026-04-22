import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PackageList,
  CreatePackageButton,
  PackageSelectorNote,
} from "./_components";

interface PageProps {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const ctx = await requireOrgContext();
  const { productId } = await params;
  const product = await db.product.findFirst({
    where: { id: productId, organizationId: ctx.organizationId },
    select: { name: true },
  });

  return {
    title: `Manage Packages - ${product?.name || "Product"} - Ordello CRM`,
  };
}

export default async function ProductPackagesPage({ params }: PageProps) {
  const ctx = await requireOrgContext();
  const { productId } = await params;

  // Fetch product with packages and prices
  const product = await db.product.findFirst({
    where: {
      id: productId,
      organizationId: ctx.organizationId,
      isDeleted: false,
    },
    include: {
      packages: {
        include: {
          components: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  isActive: true,
                  isDeleted: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { displayOrder: "asc" },
      },
      productPrices: {
        select: { currency: true },
      },
    },
  });

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground">
            Product Not Found
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            The product you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/admin/inventory">Back to Inventory</Link>
          </Button>
        </div>
      </div>
    );
  }

  const companionProducts = await db.product.findMany({
    where: {
      organizationId: ctx.organizationId,
      isActive: true,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      currency: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/admin"
          className="text-muted-foreground hover:text-primary font-medium"
        >
          Dashboard
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" />
        <Link
          href="/dashboard/admin/inventory"
          className="text-muted-foreground hover:text-primary font-medium"
        >
          Inventory
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" />
        <span className="font-medium">{product.name} Packages</span>
      </div>

      {/* Back Button */}
      <Link href="/dashboard/admin/inventory">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="size-4" />
          Back to Inventory
        </Button>
      </Link>

      {/* Page Header */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-4xl font-black leading-tight tracking-tight">
            Manage Packages
          </h1>
          <p className="text-muted-foreground text-lg mt-1">{product.name}</p>
          {product.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {product.description}
            </p>
          )}
        </div>
        <CreatePackageButton
          productId={product.id}
          availableCurrencies={product.productPrices.map((p) => p.currency)}
          companionProducts={companionProducts}
        />
      </div>

      {/* General Package Description */}
      <PackageSelectorNote
        productId={product.id}
        currentNote={product.packageSelectorNote}
      />

      {/* Package List */}
      <PackageList
        packages={product.packages}
        companionProducts={companionProducts}
      />

      {/* Info Card */}
      {product.packages.length === 0 && (
        <div className="border rounded-lg p-6 text-center">
          <p className="text-muted-foreground mb-2">
            No packages have been created for this product yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Packages allow customers to select different quantity options with
            custom pricing.
          </p>
        </div>
      )}
    </div>
  );
}

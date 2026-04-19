import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EmbedFormGenerator } from "./_components/embed-form-generator";

export const metadata = {
  title: "Embed Form Generator - Ordo CRM",
  description: "Generate embeddable order forms for your products",
};

export default async function EmbedFormPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch all active products with package counts
  const products = await db.product.findMany({
    where: {
      isActive: true,
      isDeleted: false,
    },
    include: {
      packages: {
        where: { isActive: true },
        select: { id: true },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Transform to include package count
  const productsWithPackageCount = products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    packageCount: product.packages.length,
  }));

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/admin"
          className="text-muted-foreground hover:text-primary font-medium"
        >
          Dashboard
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" />
        <span className="font-medium">Embed Form Generator</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-black leading-tight tracking-tight">
          Embed Form Generator
        </h1>
        <p className="text-muted-foreground text-lg mt-1">
          Generate embeddable order forms for products with packages
        </p>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>How it works:</strong> Only products with active packages can
          have embed forms. Create packages for your products in the{" "}
          <Link
            href="/dashboard/admin/inventory"
            className="underline font-medium"
          >
            Inventory
          </Link>{" "}
          section first.
        </p>
      </div>

      {/* Product List */}
      <EmbedFormGenerator products={productsWithPackageCount} />
    </div>
  );
}

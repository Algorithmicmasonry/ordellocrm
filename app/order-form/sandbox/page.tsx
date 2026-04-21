import { SandboxOrderFormClient } from "./_components/sandbox-order-form-client";
import { parseCurrency } from "@/lib/currency";
import { db } from "@/lib/db";
import { Suspense } from "react";

interface SandboxOrderFormPageProps {
  searchParams: Promise<{ product?: string; currency?: string }>;
}

export default async function SandboxOrderFormPage({
  searchParams,
}: SandboxOrderFormPageProps) {
  const params = await searchParams;
  const productId = params?.product;
  const currency = parseCurrency(params?.currency);

  if (!productId) {
    return (
      <div className="w-full p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Product ID Required</h2>
            <p className="text-red-700 text-sm">
              Please provide a product ID in the URL parameter. Example: ?product=PRODUCT_ID
            </p>
          </div>
        </div>
      </div>
    );
  }

  const product = await db.product.findUnique({
    where: { id: productId, isActive: true, isDeleted: false },
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

  if (!product || product.packages.length === 0) {
    return (
      <div className="w-full p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Product Not Found</h2>
            <p className="text-red-700 text-sm">
              The requested product could not be found or has no available packages.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="p-6 text-center">Loading sandbox form…</div>}>
      <SandboxOrderFormClient product={product} currency={currency} organizationId={product.organizationId} />
    </Suspense>
  );
}

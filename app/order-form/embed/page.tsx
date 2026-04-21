import { unstable_cache } from "next/cache";
import { EmbedOrderFormClient } from "./_components/embed-order-form-client";
import { parseCurrency } from "@/lib/currency";
import { db } from "@/lib/db";
import { Suspense } from "react";

// Cached product getter for embed forms - 60 second cache
const getCachedProductForEmbed = unstable_cache(
  async (productId: string) => {
    return db.product.findUnique({
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
  },
  ["embed-product"],
  { revalidate: 10, tags: ["products"] }
);

interface EmbedOrderFormPageProps {
  searchParams: Promise<{ product?: string; currency?: string }>;
}

export default async function EmbedOrderFormPage({
  searchParams,
}: EmbedOrderFormPageProps) {
  const params = await searchParams;
  const productId = params?.product;
  const currency = parseCurrency(params?.currency);

  if (!productId) {
    return (
      <>
        <style>{`html, body { margin: 0; padding: 0; } ::-webkit-scrollbar { width: 0; height: 0; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: transparent; } * { scrollbar-width: none; scrollbar-color: transparent transparent; }`}</style>
        <div className="w-full p-4 md:p-6">
          <div className="max-w-2xl mx-auto">
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <h2 className="text-lg font-semibold text-red-800 mb-2">
                Product ID Required
              </h2>
              <p className="text-red-700 text-sm">
                Please provide a product ID in the URL parameter. Example:
                ?product=PRODUCT_ID
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const product = await getCachedProductForEmbed(productId);

  if (!product || product.packages.length === 0) {
    return (
      <>
        <style>{`html, body { margin: 0; padding: 0; } ::-webkit-scrollbar { width: 0; height: 0; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: transparent; } * { scrollbar-width: none; scrollbar-color: transparent transparent; }`}</style>
        <div className="w-full p-4 md:p-6">
          <div className="max-w-2xl mx-auto">
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <h2 className="text-lg font-semibold text-red-800 mb-2">
                Product Not Found
              </h2>
              <p className="text-red-700 text-sm">
                The requested product could not be found or has no available packages.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`html, body { margin: 0; padding: 0; } ::-webkit-scrollbar { width: 0; height: 0; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: transparent; } * { scrollbar-width: none; scrollbar-color: transparent transparent; }`}</style>
      <Suspense
        fallback={<div className="p-6 text-center">Loading order form…</div>}
      >
        <EmbedOrderFormClient product={product} currency={currency} organizationId={product.organizationId} />
      </Suspense>
    </>
  );
}

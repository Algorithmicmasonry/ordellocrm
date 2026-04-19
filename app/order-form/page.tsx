// app/order-form/page.tsx
import { Suspense } from "react";
import OrderFormPageClient from "./_components/order-form-client";

export default function OrderFormPage() {
  return (
    <Suspense
      fallback={<div className="p-6 text-center">Loading order form…</div>}
    >
      <OrderFormPageClient />
    </Suspense>
  );
}

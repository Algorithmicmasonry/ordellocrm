import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { CustomerDetailsClient } from "./_components";
import { Skeleton } from "@/components/ui/skeleton";
import { Metadata } from "next";

interface CustomerDetailPageProps {
  params: Promise<{ phone: string }>;
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}

async function getCustomerDetails(phone: string, startDateParam?: string, endDateParam?: string) {
  // Build date filter when custom range is provided
  const dateFilter = (startDateParam && endDateParam)
    ? { gte: new Date(startDateParam), lte: new Date(endDateParam) }
    : undefined;

  // Fetch all orders for this customer (optionally filtered by date range)
  const orders = await db.order.findMany({
    where: {
      customerPhone: phone,
      ...(dateFilter && { createdAt: dateFilter }),
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (orders.length === 0) {
    return null;
  }

  // Get the most recent customer information
  const latestOrder = orders[0];
  const customerName = latestOrder.customerName;
  const customerWhatsapp = latestOrder.customerWhatsapp || phone;
  const firstOrderDate = orders[orders.length - 1].createdAt;
  const lastOrderDate = latestOrder.createdAt;

  // Calculate statistics
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED").length;
  const cancelledOrders = orders.filter((o) => o.status === "CANCELLED").length;
  const pendingOrders = orders.filter(
    (o) => !["DELIVERED", "CANCELLED"].includes(o.status),
  ).length;

  const totalSpent = orders
    .filter((o) => o.status === "DELIVERED")
    .reduce((sum, order) => sum + order.totalAmount, 0);

  const avgOrderValue = deliveredOrders > 0 ? totalSpent / deliveredOrders : 0;

  const conversionRate =
    totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

  // Days since last order
  const daysSinceLastOrder = Math.floor(
    (new Date().getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Calculate if customer is active (ordered in last 30 days)
  const isActive = daysSinceLastOrder <= 30;

  // Get most common location
  const locations = orders
    .filter((o) => o.city && o.state)
    .map((o) => `${o.city}, ${o.state}`);
  const locationFrequency = locations.reduce(
    (acc, loc) => {
      acc[loc] = (acc[loc] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const mostCommonLocation =
    Object.keys(locationFrequency).length > 0
      ? Object.entries(locationFrequency).sort((a, b) => b[1] - a[1])[0][0]
      : null;

  // Get order source distribution
  const sourceDistribution = orders.reduce(
    (acc, order) => {
      const source = order.source || "UNKNOWN";
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const preferredSource =
    Object.keys(sourceDistribution).length > 0
      ? Object.entries(sourceDistribution).sort((a, b) => b[1] - a[1])[0][0]
      : "UNKNOWN";

  // Get top products
  const productFrequency = new Map<
    string,
    { name: string; count: number; spent: number }
  >();
  orders.forEach((order) => {
    order.items.forEach((item) => {
      const productName = item.product.name;
      const existing = productFrequency.get(productName) || {
        name: productName,
        count: 0,
        spent: 0,
      };
      existing.count += item.quantity;
      existing.spent += item.price * item.quantity;
      productFrequency.set(productName, existing);
    });
  });

  const topProducts = Array.from(productFrequency.values())
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  // Calculate purchase frequency (average days between orders)
  let purchaseFrequency = 0;
  if (totalOrders > 1) {
    const daysBetweenOrders: number[] = [];
    for (let i = 0; i < orders.length - 1; i++) {
      const daysDiff = Math.floor(
        (orders[i].createdAt.getTime() - orders[i + 1].createdAt.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      daysBetweenOrders.push(daysDiff);
    }
    purchaseFrequency =
      daysBetweenOrders.reduce((sum, days) => sum + days, 0) /
      daysBetweenOrders.length;
  }

  // Customer badges/flags
  const badges = {
    isVIP: totalOrders >= 5,
    isRepeat: totalOrders >= 2,
    isAtRisk: daysSinceLastOrder >= 60,
    isHighValue: totalSpent >= 100000,
    isProblematic: cancelledOrders >= 2,
  };

  // Orders by month for chart
  const ordersByMonth = orders.reduce(
    (acc, order) => {
      const monthKey = order.createdAt.toISOString().slice(0, 7); // YYYY-MM
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Status distribution for chart
  const statusDistribution = orders.reduce(
    (acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    customer: {
      name: customerName,
      phone: phone,
      whatsapp: customerWhatsapp,
      firstOrderDate,
      lastOrderDate,
      location: mostCommonLocation,
      isActive,
    },
    stats: {
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      pendingOrders,
      totalSpent,
      avgOrderValue,
      conversionRate,
      daysSinceLastOrder,
    },
    insights: {
      purchaseFrequency,
      topProducts,
      preferredSource,
      badges,
    },
    charts: {
      ordersByMonth,
      statusDistribution,
      sourceDistribution,
    },
    orders,
  };
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: CustomerDetailPageProps) {
  const { phone } = await params;
  const query = await searchParams;
  const decodedPhone = decodeURIComponent(phone);

  const customerData = await getCustomerDetails(decodedPhone, query?.startDate, query?.endDate);

  if (!customerData) {
    notFound();
  }

  return (
    <Suspense fallback={<CustomerDetailsSkeleton />}>
      <CustomerDetailsClient data={customerData} />
    </Suspense>
  );
}

function CustomerDetailsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>

      {/* Orders Table */}
      <Skeleton className="h-96" />
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ phone: string }>;
}): Promise<Metadata> {
  const { phone } = await params;
  const decodedPhone = decodeURIComponent(phone);

  const customerData = await getCustomerDetails(decodedPhone);

  return {
    title: customerData
      ? `${customerData.customer.name} - Customer Details`
      : "Customer Details",
    description: customerData
      ? `Order history and statistics for ${customerData.customer.name} (${customerData.customer.phone})`
      : "Customer details and order history",
  };
}

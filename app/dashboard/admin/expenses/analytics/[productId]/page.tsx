import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";
import { notFound } from "next/navigation";
import { OrderStatus } from "@prisma/client";
import ProductAnalyticsClient from "./_components/product-analytics-client";
import { getDateRange } from "@/lib/date-utils";
import type { TimePeriod } from "@/lib/types";
import { attributeExpense } from "@/lib/expense-utils";

export async function generateMetadata({ params }: { params: Promise<{ productId: string }> }) {
  const ctx = await requireOrgContext();
  const { productId } = await params;

  const product = await db.product.findFirst({
    where: { id: productId, organizationId: ctx.organizationId },
    select: { name: true },
  });

  if (!product) {
    return {
      title: "Product Not Found | Ordo CRM",
    };
  }

  return {
    title: `${product.name} - Expense Analytics | Ordo CRM`,
    description: `Detailed expense and profit analysis for ${product.name}`,
  };
}

async function getProductAnalytics(organizationId: string, productId: string, period: TimePeriod = "month", timezone?: string, startDateParam?: string, endDateParam?: string) {
  // Verify product exists and get pricing from ProductPrice table
  const product = await db.product.findFirst({
    where: { id: productId, organizationId },
    select: {
      id: true,
      name: true,
      description: true,
      currency: true,
      productPrices: true,
    },
  });

  if (!product) {
    return null;
  }

  // Get price and cost from ProductPrice table for the product's primary currency
  const productPrice = product.productPrices.find(
    (p) => p.currency === product.currency
  );

  if (!productPrice) {
    return null; // Product has no pricing configured
  }

  // Get date range for current period (or custom range)
  const { startDate, endDate } = (startDateParam && endDateParam)
    ? { startDate: new Date(startDateParam), endDate: new Date(endDateParam) }
    : getDateRange(period, timezone);

  // Get date 6 months ago for historical chart data
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Fetch all delivered orders containing this product (6 months for chart)
  const allOrderItems = await db.orderItem.findMany({
    where: {
      productId: productId,
      order: {
        organizationId,
        status: OrderStatus.DELIVERED,
        deliveredAt: {
          gte: sixMonthsAgo,
        },
      },
    },
    include: {
      order: {
        select: {
          id: true,
          status: true,
          deliveredAt: true,
          createdAt: true,
        },
      },
    },
  });

  // Fetch all expenses for this product (6 months for chart)
  const allExpenses = await db.expense.findMany({
    where: {
      organizationId,
      productId: productId,
      date: {
        gte: sixMonthsAgo,
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  // Filter for current period only (for stats)
  const currentOrderItems = allOrderItems.filter(
    (item) => item.order.deliveredAt &&
    item.order.deliveredAt >= startDate &&
    item.order.deliveredAt <= endDate
  );

  const currentExpenses = allExpenses.filter(
    (expense) => expense.date >= startDate && expense.date <= endDate
  );

  // Calculate revenue and COGS from current period order items
  let totalRevenue = 0;
  let totalCOGS = 0;
  let totalUnitsSold = 0;

  currentOrderItems.forEach((item) => {
    totalRevenue += item.price * item.quantity;
    totalCOGS += item.cost * item.quantity;
    totalUnitsSold += item.quantity;
  });

  // Calculate total expenses from current period with batch amortization
  const productUnitsSoldMap = new Map([[productId, totalUnitsSold]]);
  const totalExpenses = currentExpenses.reduce(
    (sum, exp) => sum + attributeExpense(exp, productUnitsSoldMap),
    0
  );

  // Calculate net profit
  const netProfit = totalRevenue - totalCOGS - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Group expenses by type (current period) with batch amortization
  const expensesByType = currentExpenses.reduce(
    (acc, expense) => {
      acc[expense.type] =
        (acc[expense.type] || 0) +
        attributeExpense(expense, productUnitsSoldMap);
      return acc;
    },
    {} as Record<string, number>
  );

  // Monthly breakdown (last 6 months)
  const monthlyData = new Map<
    string,
    {
      month: string;
      revenue: number;
      cogs: number;
      expenses: number;
      profit: number;
      unitsSold: number;
    }
  >();

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = date.toLocaleDateString("en-US", { month: "short" });

    monthlyData.set(monthKey, {
      month: monthLabel,
      revenue: 0,
      cogs: 0,
      expenses: 0,
      profit: 0,
      unitsSold: 0,
    });
  }

  // Populate monthly revenue and COGS (using all data for 6-month chart)
  allOrderItems.forEach((item) => {
    if (item.order.deliveredAt) {
      const deliveryDate = new Date(item.order.deliveredAt);
      const monthKey = `${deliveryDate.getFullYear()}-${String(deliveryDate.getMonth() + 1).padStart(2, "0")}`;
      const data = monthlyData.get(monthKey);

      if (data) {
        data.revenue += item.price * item.quantity;
        data.cogs += item.cost * item.quantity;
        data.unitsSold += item.quantity;
      }
    }
  });

  // Populate monthly expenses (using all data for 6-month chart) with batch amortization
  allExpenses.forEach((expense) => {
    const expenseDate = new Date(expense.date);
    const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, "0")}`;
    const data = monthlyData.get(monthKey);

    if (data) {
      // For batch costs, use the units sold in that specific month for amortization
      const monthUnitsSoldMap = new Map([[productId, data.unitsSold]]);
      data.expenses += attributeExpense(expense, monthUnitsSoldMap);
    }
  });

  // Calculate monthly profit
  monthlyData.forEach((data) => {
    data.profit = data.revenue - data.cogs - data.expenses;
  });

  const monthlyBreakdown = Array.from(monthlyData.values());

  // Calculate max values for chart scaling
  const allMonthlyValues = monthlyBreakdown.flatMap((m) => [
    m.revenue,
    m.cogs,
    m.expenses,
    m.profit,
  ]);
  const maxMonthlyValue = Math.max(...allMonthlyValues, 1);

  // Expense breakdown for recent expenses table (current period)
  const recentExpenses = currentExpenses.slice(0, 10);

  return {
    product: {
      id: product.id,
      name: product.name,
      description: product.description,
      price: productPrice.price,
      cost: productPrice.cost,
    },
    stats: {
      totalRevenue,
      totalCOGS,
      totalExpenses,
      netProfit,
      profitMargin,
      totalUnitsSold,
      averageRevenuePerUnit: totalUnitsSold > 0 ? totalRevenue / totalUnitsSold : 0,
      averageCostPerUnit: totalUnitsSold > 0 ? totalCOGS / totalUnitsSold : 0,
    },
    expensesByType,
    monthlyBreakdown,
    maxMonthlyValue,
    recentExpenses,
    totalExpenseCount: currentExpenses.length,
  };
}

export default async function ProductAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ period?: string; tz?: string; startDate?: string; endDate?: string }>;
}) {
  const ctx = await requireOrgContext();
  const { productId } = await params;
  const query = await searchParams;
  const period = (query?.period || "month") as TimePeriod;
  const timezone = query?.tz;
  const startDate = query?.startDate;
  const endDate = query?.endDate;

  const data = await getProductAnalytics(ctx.organizationId, productId, period, timezone, startDate, endDate);

  if (!data) {
    notFound();
  }

  return <ProductAnalyticsClient {...data} currentPeriod={period} />;
}

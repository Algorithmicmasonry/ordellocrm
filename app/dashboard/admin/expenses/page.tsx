import { Suspense } from "react";
import { ExpensesClient } from "./_components";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/org-context";
import {
  getDateRange,
  getPreviousPeriodRange,
  calculatePercentageChange,
} from "@/lib/date-utils";
import type { TimePeriod } from "@/lib/types";
import { OrderStatus, Currency } from "@prisma/client";
import { sumAttributedExpenses, buildUnitsSoldMap } from "@/lib/expense-utils";

interface ExpensesPageProps {
  searchParams: Promise<{ period?: string; currency?: Currency; tz?: string; startDate?: string; endDate?: string }>;
}

async function getExpensesData(organizationId: string, period: TimePeriod = "month", currency?: Currency, timezone?: string, startDateParam?: string, endDateParam?: string) {
  const { startDate, endDate } = (startDateParam && endDateParam)
    ? { startDate: new Date(startDateParam), endDate: new Date(endDateParam) }
    : getDateRange(period, timezone);
  const previousRange = (startDateParam && endDateParam)
    ? null
    : getPreviousPeriodRange(period, timezone);

  // Fetch all data in parallel
  const [allExpenses, products, orders] = await Promise.all([
    // Fetch expenses from both current and previous periods
    db.expense.findMany({
      where: {
        organizationId,
        date: {
          gte: previousRange ? previousRange.startDate : startDate,
          lte: endDate,
        },
        ...(currency && { currency }),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    }),
    // Fetch all products for dropdown
    db.product.findMany({
      where: {
        organizationId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    // Fetch delivered orders for profit calculations
    db.order.findMany({
      where: {
        organizationId,
        status: OrderStatus.DELIVERED,
        deliveredAt: {
          gte: previousRange ? previousRange.startDate : startDate,
          lte: endDate,
        },
        ...(currency && { currency }),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    }),
  ]);

  // Split expenses into current and previous periods
  const currentExpenses = allExpenses.filter(
    (e) => e.date >= startDate && e.date <= endDate
  );
  const previousExpenses = previousRange
    ? allExpenses.filter(
        (e) =>
          e.date >= previousRange.startDate && e.date <= previousRange.endDate
      )
    : [];

  // Calculate current period stats
  const totalExpenses = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
  const productLinkedExpenses = currentExpenses
    .filter((e) => e.productId)
    .reduce((sum, e) => sum + e.amount, 0);
  const generalExpenses = currentExpenses
    .filter((e) => !e.productId)
    .reduce((sum, e) => sum + e.amount, 0);

  // Calculate daily burn rate
  const daysInPeriod = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const dailyBurnRate =
    daysInPeriod > 0 ? totalExpenses / daysInPeriod : totalExpenses;

  // Calculate previous period stats for trends
  const prevTotalExpenses = previousExpenses.reduce(
    (sum, e) => sum + e.amount,
    0
  );
  const prevProductLinkedExpenses = previousExpenses
    .filter((e) => e.productId)
    .reduce((sum, e) => sum + e.amount, 0);
  const prevGeneralExpenses = previousExpenses
    .filter((e) => !e.productId)
    .reduce((sum, e) => sum + e.amount, 0);

  // Calculate percentage changes (null when custom range)
  const trends = {
    totalExpenses: previousRange
      ? calculatePercentageChange(totalExpenses, prevTotalExpenses)
      : null,
    productLinkedExpenses: previousRange
      ? calculatePercentageChange(productLinkedExpenses, prevProductLinkedExpenses)
      : null,
    generalExpenses: previousRange
      ? calculatePercentageChange(generalExpenses, prevGeneralExpenses)
      : null,
  };

  // Calculate expense breakdown by type
  const expensesByType = currentExpenses.reduce(
    (acc, expense) => {
      const type = expense.type;
      acc[type] = (acc[type] || 0) + expense.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate daily expenses for trend chart
  const dailyExpenses: Record<string, number> = {};
  currentExpenses.forEach((expense) => {
    const dayKey = expense.date.toISOString().split("T")[0];
    dailyExpenses[dayKey] = (dailyExpenses[dayKey] || 0) + expense.amount;
  });

  // Calculate profit impact from orders
  const currentOrders = orders.filter(
    (o) => o.deliveredAt && o.deliveredAt >= startDate && o.deliveredAt <= endDate
  );

  let grossRevenue = 0;
  let costOfGoods = 0;

  currentOrders.forEach((order) => {
    order.items.forEach((item) => {
      grossRevenue += item.price * item.quantity;
      costOfGoods += item.cost * item.quantity;
    });
  });

  // For the Profit Impact Report, use batch-amortized expenses so clearing/waybill
  // costs are only charged for units actually sold in the period
  const profitImpactExpenses = sumAttributedExpenses(
    currentExpenses,
    buildUnitsSoldMap(currentOrders.flatMap((o) => o.items))
  );
  const netProfit = grossRevenue - costOfGoods - profitImpactExpenses;
  const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  // Get top 5 products by expense
  const productExpenseMap = new Map<
    string,
    { id: string; name: string; amount: number; primaryType: string }
  >();

  currentExpenses.forEach((expense) => {
    if (expense.productId && expense.product) {
      const existing = productExpenseMap.get(expense.productId);
      if (existing) {
        existing.amount += expense.amount;
      } else {
        productExpenseMap.set(expense.productId, {
          id: expense.productId,
          name: expense.product.name,
          amount: expense.amount,
          primaryType: expense.type,
        });
      }
    }
  });

  const topProducts = Array.from(productExpenseMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const maxProductExpense = topProducts.length > 0 ? topProducts[0].amount : 0;

  // Monthly comparison (last 6 months)
  const monthlyData = new Map<
    string,
    { operating: number; marketing: number; month: string }
  >();

  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = date.toLocaleDateString("en-US", { month: "short" });

    monthlyData.set(monthKey, {
      operating: 0,
      marketing: 0,
      month: monthLabel,
    });
  }

  // Populate monthly expense data
  allExpenses.forEach((expense) => {
    const expenseDate = new Date(expense.date);
    const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, "0")}`;
    const data = monthlyData.get(monthKey);

    if (data) {
      if (expense.type === "ad_spend") {
        data.marketing += expense.amount;
      } else {
        data.operating += expense.amount;
      }
    }
  });

  const monthlyComparison = Array.from(monthlyData.values());
  const allMonthlyValues = monthlyComparison.flatMap((m) => [m.operating, m.marketing]);
  const maxMonthlyValue = Math.max(...allMonthlyValues, 1);

  return {
    expenses: currentExpenses,
    products,
    stats: {
      totalExpenses,
      productLinkedExpenses,
      generalExpenses,
      dailyBurnRate,
      trends,
    },
    profitImpact: {
      grossRevenue,
      costOfGoods,
      totalExpenses: profitImpactExpenses,
      netProfit,
      profitMargin,
    },
    topProducts,
    maxProductExpense,
    monthlyComparison,
    maxMonthlyValue,
    charts: {
      expensesByType,
      dailyExpenses,
    },
  };
}

export default async function ExpensesPage({
  searchParams,
}: ExpensesPageProps) {
  const ctx = await requireOrgContext();
  const params = await searchParams;
  const period = (params?.period || "month") as TimePeriod;
  const currency = params?.currency;
  const timezone = params?.tz;
  const startDate = params?.startDate;
  const endDate = params?.endDate;
  const data = await getExpensesData(ctx.organizationId, period, currency, timezone, startDate, endDate);

  return (
    <Suspense fallback={<ExpensesPageSkeleton />}>
      <ExpensesClient
        expenses={data.expenses}
        products={data.products}
        stats={data.stats}
        profitImpact={data.profitImpact}
        topProducts={data.topProducts}
        maxProductExpense={data.maxProductExpense}
        monthlyComparison={data.monthlyComparison}
        maxMonthlyValue={data.maxMonthlyValue}
        charts={data.charts}
        currentPeriod={period}
        currency={currency}
      />
    </Suspense>
  );
}

function ExpensesPageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-80" />
        <Skeleton className="h-80" />
      </div>

      {/* Table */}
      <Skeleton className="h-96" />
    </div>
  );
}

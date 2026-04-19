"use server";

import { db } from "@/lib/db";
import { getDateRange } from "@/lib/date-utils";
import type { TimePeriod } from "@/lib/types";
import type { Currency } from "@prisma/client";
import {
  sumAttributedExpenses,
  attributeExpense,
  buildUnitsSoldMap,
} from "@/lib/expense-utils";

/**
 * Get financial overview data
 */
export async function getFinancialOverview(
  period: TimePeriod = "month",
  customStartDate?: Date,
  customEndDate?: Date,
  currency?: Currency,
  timezone?: string,
) {
  try {
    // Use custom dates if provided, otherwise calculate from period
    let startDate: Date;
    let endDate: Date;

    if (customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      const dateRange = getDateRange(period, timezone);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    }

    // Get previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate.getTime() - 1);

    // Current period orders — anchor on deliveredAt so revenue matches the dashboard
    const currentOrders = await db.order.findMany({
      where: {
        status: "DELIVERED",
        deliveredAt: { gte: startDate, lte: endDate },
        ...(currency && { currency }),
      },
      include: {
        items: { include: { product: true } },
      },
    });

    // Previous period orders
    const previousOrders = await db.order.findMany({
      where: {
        status: "DELIVERED",
        deliveredAt: { gte: previousStartDate, lte: previousEndDate },
        ...(currency && { currency }),
      },
      include: {
        items: { include: { product: true } },
      },
    });

    // Current period expenses
    const currentExpenses = await db.expense.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        ...(currency && { currency }),
      },
    });

    // Previous period expenses
    const previousExpenses = await db.expense.findMany({
      where: {
        date: { gte: previousStartDate, lte: previousEndDate },
        ...(currency && { currency }),
      },
    });

    // Calculate current period metrics (all orders already DELIVERED)
    const currentRevenue = currentOrders
      .reduce((sum, order) => {
        const orderTotal = order.items.reduce(
          (itemSum, item) => itemSum + item.price * item.quantity,
          0
        );
        return sum + orderTotal;
      }, 0);

    const currentCost = currentOrders
      .reduce((sum, order) => {
        const orderCost = order.items.reduce(
          (itemSum, item) => itemSum + item.cost * item.quantity,
          0
        );
        return sum + orderCost;
      }, 0);

    // Build units-sold maps for batch cost amortization
    const currentDeliveredItems = currentOrders.flatMap((o) => o.items);
    const currentUnitsSold = buildUnitsSoldMap(currentDeliveredItems);
    const currentTotalExpenses = sumAttributedExpenses(
      currentExpenses,
      currentUnitsSold
    );

    const currentGrossProfit = currentRevenue - currentCost;
    const currentNetProfit = currentRevenue - currentCost - currentTotalExpenses;

    // Calculate previous period metrics
    const previousRevenue = previousOrders
      .reduce((sum, order) => {
        const orderTotal = order.items.reduce(
          (itemSum, item) => itemSum + item.price * item.quantity,
          0
        );
        return sum + orderTotal;
      }, 0);

    const previousCost = previousOrders
      .reduce((sum, order) => {
        const orderCost = order.items.reduce(
          (itemSum, item) => itemSum + item.cost * item.quantity,
          0
        );
        return sum + orderCost;
      }, 0);

    const previousDeliveredItems = previousOrders.flatMap((o) => o.items);
    const previousUnitsSold = buildUnitsSoldMap(previousDeliveredItems);
    const previousTotalExpenses = sumAttributedExpenses(
      previousExpenses,
      previousUnitsSold
    );

    const previousGrossProfit = previousRevenue - previousCost;
    const previousNetProfit = previousRevenue - previousCost - previousTotalExpenses;

    // Calculate percentage changes
    const revenueChange =
      previousRevenue !== 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : currentRevenue > 0 ? 100 : 0;

    const grossProfitChange =
      previousGrossProfit !== 0
        ? ((currentGrossProfit - previousGrossProfit) / Math.abs(previousGrossProfit)) * 100
        : currentGrossProfit > 0 ? 100 : 0;

    const netProfitChange =
      previousNetProfit !== 0
        ? ((currentNetProfit - previousNetProfit) / Math.abs(previousNetProfit)) * 100
        : currentNetProfit > 0 ? 100 : 0;

    const burnRateChange =
      previousTotalExpenses !== 0
        ? ((currentTotalExpenses - previousTotalExpenses) / previousTotalExpenses) * 100
        : currentTotalExpenses > 0 ? 100 : 0;

    // Generate revenue vs expenses chart data based on period
    const chartData = await generateChartDataByPeriod(startDate, endDate, period, currency);

    // Calculate expense categories
    const expensesByCategory = await getExpensesByCategory(startDate, endDate, currency);

    return {
      success: true,
      data: {
        kpis: {
          revenue: {
            value: currentRevenue,
            change: revenueChange,
          },
          grossProfit: {
            value: currentGrossProfit,
            change: grossProfitChange,
          },
          netProfit: {
            value: currentNetProfit,
            change: netProfitChange,
          },
          burnRate: {
            value: currentTotalExpenses,
            change: burnRateChange,
          },
        },
        chartData,
        expensesByCategory,
      },
    };
  } catch (error) {
    console.error("Error fetching financial overview:", error);
    return {
      success: false,
      error: "Failed to fetch financial overview",
    };
  }
}

/**
 * Generate chart data based on the selected period
 */
async function generateChartDataByPeriod(
  startDate: Date,
  endDate: Date,
  period: TimePeriod,
  currency?: Currency
) {
  const chartData: Array<{ label: string; revenue: number; expenses: number }> = [];

  if (period === "today") {
    // Hourly data for today
    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(startDate);
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date(startDate);
      hourEnd.setHours(hour, 59, 59, 999);

      const orders = await db.order.findMany({
        where: {
          status: "DELIVERED",
          deliveredAt: { gte: hourStart, lte: hourEnd },
          ...(currency && { currency }),
        },
        include: { items: true },
      });

      const expenses = await db.expense.findMany({
        where: {
          date: { gte: hourStart, lte: hourEnd },
          ...(currency && { currency }),
        },
      });

      const revenue = orders.reduce((sum, order) => {
        return sum + order.items.reduce((s, item) => s + item.price * item.quantity, 0);
      }, 0);

      const unitsSoldByProduct = buildUnitsSoldMap(
        orders.flatMap((o) => o.items)
      );
      const totalExpenses = sumAttributedExpenses(expenses, unitsSoldByProduct);

      chartData.push({
        label: `${hour.toString().padStart(2, "0")}:00`,
        revenue,
        expenses: totalExpenses,
      });
    }
  } else if (period === "week") {
    // Daily data for the week
    for (let day = 0; day < 7; day++) {
      const dayStart = new Date(startDate);
      dayStart.setDate(startDate.getDate() + day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const orders = await db.order.findMany({
        where: {
          status: "DELIVERED",
          deliveredAt: { gte: dayStart, lte: dayEnd },
          ...(currency && { currency }),
        },
        include: { items: true },
      });

      const expenses = await db.expense.findMany({
        where: {
          date: { gte: dayStart, lte: dayEnd },
          ...(currency && { currency }),
        },
      });

      const revenue = orders.reduce((sum, order) => {
        return sum + order.items.reduce((s, item) => s + item.price * item.quantity, 0);
      }, 0);

      const unitsSoldByProduct = buildUnitsSoldMap(
        orders.flatMap((o) => o.items)
      );
      const totalExpenses = sumAttributedExpenses(expenses, unitsSoldByProduct);

      chartData.push({
        label: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
        revenue,
        expenses: totalExpenses,
      });
    }
  } else if (period === "month") {
    // Daily data for the month (every 3 days to avoid overcrowding)
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const interval = Math.max(1, Math.floor(totalDays / 10)); // Show ~10 data points

    for (let day = 0; day < totalDays; day += interval) {
      const dayStart = new Date(startDate);
      dayStart.setDate(startDate.getDate() + day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + interval - 1);
      dayEnd.setHours(23, 59, 59, 999);

      const orders = await db.order.findMany({
        where: {
          status: "DELIVERED",
          deliveredAt: { gte: dayStart, lte: dayEnd },
          ...(currency && { currency }),
        },
        include: { items: true },
      });

      const expenses = await db.expense.findMany({
        where: {
          date: { gte: dayStart, lte: dayEnd },
          ...(currency && { currency }),
        },
      });

      const revenue = orders.reduce((sum, order) => {
        return sum + order.items.reduce((s, item) => s + item.price * item.quantity, 0);
      }, 0);

      const unitsSoldByProduct = buildUnitsSoldMap(
        orders.flatMap((o) => o.items)
      );
      const totalExpenses = sumAttributedExpenses(expenses, unitsSoldByProduct);

      chartData.push({
        label: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue,
        expenses: totalExpenses,
      });
    }
  } else if (period === "year") {
    // Monthly data for the year
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    const endMonth = endDate.getMonth();
    const endYear = endDate.getFullYear();

    let currentYear = startYear;
    let currentMonth = startMonth;

    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      const monthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

      const orders = await db.order.findMany({
        where: {
          status: "DELIVERED",
          deliveredAt: { gte: monthStart, lte: monthEnd },
          ...(currency && { currency }),
        },
        include: { items: true },
      });

      const expenses = await db.expense.findMany({
        where: {
          date: { gte: monthStart, lte: monthEnd },
          ...(currency && { currency }),
        },
      });

      const revenue = orders.reduce((sum, order) => {
        return sum + order.items.reduce((s, item) => s + item.price * item.quantity, 0);
      }, 0);

      const unitsSoldByProduct = buildUnitsSoldMap(
        orders.flatMap((o) => o.items)
      );
      const totalExpenses = sumAttributedExpenses(expenses, unitsSoldByProduct);

      chartData.push({
        label: monthStart.toLocaleDateString("en-US", { month: "short" }),
        revenue,
        expenses: totalExpenses,
      });

      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
  }

  return chartData;
}

/**
 * Get expenses grouped by type
 */
async function getExpensesByCategory(startDate: Date, endDate: Date, currency?: Currency) {
  const expenses = await db.expense.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      ...(currency && { currency }),
    },
  });

  const categoryTotals = expenses.reduce((acc, expense) => {
    const category = expense.type || "OTHER";
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += expense.amount;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(categoryTotals)
    .map(([category, total]) => ({
      category,
      total,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Get sales rep financial performance data
 */
export async function getSalesRepFinance(
  period: TimePeriod = "month",
  customStartDate?: Date,
  customEndDate?: Date,
  currency?: Currency,
  timezone?: string,
) {
  try {
    // Use custom dates if provided, otherwise calculate from period
    let startDate: Date;
    let endDate: Date;

    if (customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      const dateRange = getDateRange(period, timezone);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    }

    // Get all sales reps
    const salesReps = await db.user.findMany({
      where: {
        role: "SALES_REP",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Pre-fetch company-wide delivered orders for the period (for expense attribution)
    const allDeliveredOrders = await db.order.findMany({
      where: {
        status: "DELIVERED",
        deliveredAt: { gte: startDate, lte: endDate },
        ...(currency && { currency }),
      },
      include: {
        items: {
          select: { productId: true, quantity: true },
        },
      },
    });

    // Build map: productId → total units sold company-wide
    const companyUnitsByProduct = new Map<string, number>();
    allDeliveredOrders.forEach((order) => {
      order.items.forEach((item) => {
        companyUnitsByProduct.set(
          item.productId,
          (companyUnitsByProduct.get(item.productId) || 0) + item.quantity
        );
      });
    });

    // Pre-fetch all product-linked expenses for the period, excluding ad_spend
    // (ad_spend is a company-level marketing cost, not attributable to individual reps)
    const allProductExpenses = await db.expense.findMany({
      where: {
        productId: { not: null },
        type: { not: "ad_spend" },
        date: { gte: startDate, lte: endDate },
        ...(currency && { currency }),
      },
    });

    // Get performance data for each sales rep
    const repPerformance = await Promise.all(
      salesReps.map(async (rep) => {
        // Get delivered orders for this rep
        const orders = await db.order.findMany({
          where: {
            assignedToId: rep.id,
            status: "DELIVERED",
            deliveredAt: { gte: startDate, lte: endDate },
            ...(currency && { currency }),
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        // Calculate revenue and cost
        const revenue = orders.reduce((sum, order) => {
          return (
            sum +
            order.items.reduce(
              (itemSum, item) => itemSum + item.price * item.quantity,
              0
            )
          );
        }, 0);

        const cost = orders.reduce((sum, order) => {
          return (
            sum +
            order.items.reduce(
              (itemSum, item) => itemSum + item.cost * item.quantity,
              0
            )
          );
        }, 0);

        // Build map: productId → units sold by this rep
        const repUnitsByProduct = new Map<string, number>();
        orders.forEach((order) => {
          order.items.forEach((item) => {
            repUnitsByProduct.set(
              item.productId,
              (repUnitsByProduct.get(item.productId) || 0) + item.quantity
            );
          });
        });

        // Attribute expenses to this rep using the correct cost model:
        // - clearing/waybill with batchQuantity: perUnitCost × repUnits (batch cost)
        // - delivery/other: proportional share based on units sold
        let totalExpenses = 0;
        for (const expense of allProductExpenses) {
          if (!expense.productId) continue;
          const repUnits = repUnitsByProduct.get(expense.productId) || 0;
          if (repUnits === 0) continue;

          const companyUnits =
            companyUnitsByProduct.get(expense.productId) || 0;

          if (
            (expense.type === "clearing" || expense.type === "waybill") &&
            expense.batchQuantity
          ) {
            // Batch cost: charged per unit regardless of period
            const perUnitCost = expense.amount / expense.batchQuantity;
            totalExpenses += perUnitCost * repUnits;
          } else if (companyUnits > 0) {
            // Period cost: proportionally allocate by this rep's share of units
            totalExpenses += (repUnits / companyUnits) * expense.amount;
          }
        }

        // Calculate metrics
        const deliveredCount = orders.length;
        const netProfit = revenue - cost - totalExpenses;
        const cpa = deliveredCount > 0 ? totalExpenses / deliveredCount : 0;
        const totalCost = cost + totalExpenses;
        const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

        return {
          repId: rep.id,
          repName: rep.name,
          repEmail: rep.email,
          revenue,
          cost,
          expenses: totalExpenses,
          deliveredCount,
          netProfit,
          cpa,
          roi,
        };
      })
    );

    // Sort by net profit (top performers first)
    repPerformance.sort((a, b) => b.netProfit - a.netProfit);

    // Calculate team metrics
    const totalRevenue = repPerformance.reduce((sum, rep) => sum + rep.revenue, 0);
    const totalCost = repPerformance.reduce((sum, rep) => sum + rep.cost, 0);
    const totalExpenses = repPerformance.reduce(
      (sum, rep) => sum + rep.expenses,
      0
    );
    const totalNetProfit = totalRevenue - totalCost - totalExpenses;
    const totalDelivered = repPerformance.reduce(
      (sum, rep) => sum + rep.deliveredCount,
      0
    );
    const teamROI =
      totalCost + totalExpenses > 0
        ? (totalNetProfit / (totalCost + totalExpenses)) * 100
        : 0;
    const avgCPA = totalDelivered > 0 ? totalExpenses / totalDelivered : 0;
    const topPerformer =
      repPerformance.length > 0 ? repPerformance[0] : null;

    return {
      success: true,
      data: {
        teamMetrics: {
          teamROI,
          avgCPA,
          topPerformer: topPerformer
            ? {
                name: topPerformer.repName,
                revenue: topPerformer.revenue,
              }
            : null,
        },
        repPerformance,
      },
    };
  } catch (error) {
    console.error("Error fetching sales rep finance data:", error);
    return {
      success: false,
      error: "Failed to fetch sales rep finance data",
    };
  }
}

/**
 * Get agent cost analysis data
 */
export async function getAgentCostAnalysis(
  period: TimePeriod = "month",
  customStartDate?: Date,
  customEndDate?: Date,
  currency?: Currency,
  timezone?: string,
) {
  try {
    // Use custom dates if provided, otherwise calculate from period
    let startDate: Date;
    let endDate: Date;

    if (customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      const dateRange = getDateRange(period, timezone);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    }

    // Get all active agents
    const agents = await db.agent.findMany({
      where: {
        isActive: true,
      },
      include: {
        stock: {
          include: {
            product: {
              include: {
                productPrices: true,
              },
            },
          },
        },
      },
    });

    // Get all delivered orders with agent assignments in the period
    const deliveredOrders = await db.order.findMany({
      where: {
        status: "DELIVERED",
        agentId: { not: null },
        deliveredAt: { gte: startDate, lte: endDate },
        ...(currency && { currency }),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        agent: true,
      },
    });

    // Get delivery expenses for the period (for the KPI card)
    const deliveryExpenses = await db.expense.findMany({
      where: {
        type: "delivery",
        date: { gte: startDate, lte: endDate },
        ...(currency && { currency }),
      },
    });

    const totalDeliveryExpenses = deliveryExpenses.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );

    // Pre-fetch all product-linked expenses (excluding ad_spend) for attribution
    const allAgentProductExpenses = await db.expense.findMany({
      where: {
        productId: { not: null },
        type: { not: "ad_spend" },
        date: { gte: startDate, lte: endDate },
        ...(currency && { currency }),
      },
    });

    // Build company-wide units sold map (all delivered orders in the period)
    const companyAgentUnitsByProduct = buildUnitsSoldMap(
      deliveredOrders.flatMap((o) => o.items)
    );

    // Calculate agent performance metrics
    const agentPerformance = await Promise.all(
      agents.map(async (agent) => {
        // Get orders delivered by this agent
        const agentOrders = deliveredOrders.filter(
          (order) => order.agentId === agent.id
        );

        // Get all orders assigned to this agent (for success rate)
        const allAssignedOrders = await db.order.findMany({
          where: {
            agentId: agent.id,
            createdAt: { gte: startDate, lte: endDate },
            ...(currency && { currency }),
          },
        });

        const totalDeliveries = agentOrders.length;
        const totalAssigned = allAssignedOrders.length;
        const successRate =
          totalAssigned > 0 ? (totalDeliveries / totalAssigned) * 100 : 0;

        // Calculate stock value in hand using ProductPrice table
        const stockValue = agent.stock.reduce((sum, stock) => {
          const productPrice = stock.product.productPrices.find(
            (p) => p.currency === stock.product.currency
          );
          const cost = productPrice?.cost || 0;
          return sum + stock.quantity * cost;
        }, 0);

        // Calculate defective and missing stock counts and values
        const defectiveCount = agent.stock.reduce(
          (sum, stock) => sum + stock.defective,
          0
        );
        const missingCount = agent.stock.reduce(
          (sum, stock) => sum + stock.missing,
          0
        );
        const defectiveValue = agent.stock.reduce((sum, stock) => {
          const productPrice = stock.product.productPrices.find(
            (p) => p.currency === stock.product.currency
          );
          const cost = productPrice?.cost || 0;
          return sum + stock.defective * cost;
        }, 0);
        const missingValue = agent.stock.reduce((sum, stock) => {
          const productPrice = stock.product.productPrices.find(
            (p) => p.currency === stock.product.currency
          );
          const cost = productPrice?.cost || 0;
          return sum + stock.missing * cost;
        }, 0);
        const totalStockIssues = defectiveCount + missingCount;
        const totalStockIssuesValue = defectiveValue + missingValue;

        // Calculate revenue and profit from agent's deliveries
        const revenue = agentOrders.reduce((sum, order) => {
          return (
            sum +
            order.items.reduce(
              (itemSum, item) => itemSum + item.price * item.quantity,
              0
            )
          );
        }, 0);

        const cost = agentOrders.reduce((sum, order) => {
          return (
            sum +
            order.items.reduce(
              (itemSum, item) => itemSum + item.cost * item.quantity,
              0
            )
          );
        }, 0);

        // Build agent's units sold map for expense attribution
        const agentUnitsSold = buildUnitsSoldMap(
          agentOrders.flatMap((o) => o.items)
        );

        // Attribute product expenses to this agent using the correct cost model:
        // - clearing/waybill with batchQuantity: perUnitCost × agentUnits
        // - delivery/other: proportional share based on units vs company total
        let totalExpenses = 0;
        for (const expense of allAgentProductExpenses) {
          if (!expense.productId) continue;
          const agentUnits = agentUnitsSold.get(expense.productId) ?? 0;
          if (agentUnits === 0) continue;

          const companyUnits =
            companyAgentUnitsByProduct.get(expense.productId) ?? 0;

          if (
            (expense.type === "clearing" || expense.type === "waybill") &&
            expense.batchQuantity &&
            expense.batchQuantity > 0
          ) {
            totalExpenses +=
              (expense.amount / expense.batchQuantity) * agentUnits;
          } else if (companyUnits > 0) {
            totalExpenses += (agentUnits / companyUnits) * expense.amount;
          }
        }

        const profitContribution = revenue - cost - totalExpenses;

        return {
          agentId: agent.id,
          agentName: agent.name,
          location: agent.location,
          totalDeliveries,
          successRate,
          stockValue,
          profitContribution,
          totalStockIssues,
          totalStockIssuesValue,
          defectiveCount,
          missingCount,
        };
      })
    );

    // Sort by total deliveries (most active first)
    agentPerformance.sort((a, b) => b.totalDeliveries - a.totalDeliveries);

    // Calculate total stock value across all agents using ProductPrice table
    const totalStockValue = agents.reduce((sum, agent) => {
      return (
        sum +
        agent.stock.reduce((stockSum, stock) => {
          const productPrice = stock.product.productPrices.find(
            (p) => p.currency === stock.product.currency
          );
          const cost = productPrice?.cost || 0;
          return stockSum + stock.quantity * cost;
        }, 0)
      );
    }, 0);

    // Calculate defective and missing stock losses using ProductPrice table
    const defectiveValue = agents.reduce((sum, agent) => {
      return (
        sum +
        agent.stock.reduce((stockSum, stock) => {
          const productPrice = stock.product.productPrices.find(
            (p) => p.currency === stock.product.currency
          );
          const cost = productPrice?.cost || 0;
          return stockSum + stock.defective * cost;
        }, 0)
      );
    }, 0);

    const missingValue = agents.reduce((sum, agent) => {
      return (
        sum +
        agent.stock.reduce((stockSum, stock) => {
          const productPrice = stock.product.productPrices.find(
            (p) => p.currency === stock.product.currency
          );
          const cost = productPrice?.cost || 0;
          return stockSum + stock.missing * cost;
        }, 0)
      );
    }, 0);

    const totalStockLoss = defectiveValue + missingValue;

    // Calculate total orders delivered by agents
    const totalOrdersDelivered = deliveredOrders.length;

    // Get previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate.getTime() - 1);

    const previousDeliveryExpenses = await db.expense.findMany({
      where: {
        type: "delivery",
        date: { gte: previousStartDate, lte: previousEndDate },
        ...(currency && { currency }),
      },
    });

    const previousTotalDeliveryExpenses = previousDeliveryExpenses.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );

    // Calculate percentage change
    const deliveryCostChange =
      previousTotalDeliveryExpenses !== 0
        ? ((totalDeliveryExpenses - previousTotalDeliveryExpenses) /
            previousTotalDeliveryExpenses) *
          100
        : totalDeliveryExpenses > 0
        ? 100
        : 0;

    return {
      success: true,
      data: {
        kpis: {
          totalDeliveryCosts: {
            value: totalDeliveryExpenses,
            change: deliveryCostChange,
          },
          totalOrdersDelivered: {
            value: totalOrdersDelivered,
          },
          totalStockValue: {
            value: totalStockValue,
            units: agents.reduce(
              (sum, agent) =>
                sum +
                agent.stock.reduce((s, stock) => s + stock.quantity, 0),
              0
            ),
          },
          stockLoss: {
            value: totalStockLoss,
            percentage:
              totalStockValue > 0 ? (totalStockLoss / totalStockValue) * 100 : 0,
            breakdown: {
              defective: defectiveValue,
              missing: missingValue,
            },
          },
        },
        agentPerformance,
      },
    };
  } catch (error) {
    console.error("Error fetching agent cost analysis:", error);
    return {
      success: false,
      error: "Failed to fetch agent cost analysis data",
    };
  }
}

/**
 * Get profit and loss statement data
 */
export async function getProfitLossStatement(
  period: TimePeriod = "month",
  customStartDate?: Date,
  customEndDate?: Date,
  currency?: Currency,
  timezone?: string,
) {
  try {
    // Use custom dates if provided, otherwise calculate from period
    let startDate: Date;
    let endDate: Date;

    if (customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      const dateRange = getDateRange(period, timezone);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    }

    // Get previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate.getTime() - 1);

    // Current period orders — anchor on deliveredAt for consistent revenue recognition
    const currentOrders = await db.order.findMany({
      where: {
        status: "DELIVERED",
        deliveredAt: { gte: startDate, lte: endDate },
        ...(currency && { currency }),
      },
      include: {
        items: true,
      },
    });

    // Previous period orders
    const previousOrders = await db.order.findMany({
      where: {
        status: "DELIVERED",
        deliveredAt: { gte: previousStartDate, lte: previousEndDate },
        ...(currency && { currency }),
      },
      include: {
        items: true,
      },
    });

    // Current period expenses
    const currentExpenses = await db.expense.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        ...(currency && { currency }),
      },
    });

    // Previous period expenses
    const previousExpenses = await db.expense.findMany({
      where: {
        date: { gte: previousStartDate, lte: previousEndDate },
        ...(currency && { currency }),
      },
    });

    // Calculate current period revenue
    const currentRevenue = currentOrders.reduce((sum, order) => {
      return (
        sum +
        order.items.reduce(
          (itemSum, item) => itemSum + item.price * item.quantity,
          0
        )
      );
    }, 0);

    // Calculate current period COGS
    const currentCOGS = currentOrders.reduce((sum, order) => {
      return (
        sum +
        order.items.reduce(
          (itemSum, item) => itemSum + item.cost * item.quantity,
          0
        )
      );
    }, 0);

    // Build units-sold maps for batch cost amortization
    const currentPLUnitsSold = buildUnitsSoldMap(
      currentOrders.flatMap((o) => o.items)
    );
    const previousPLUnitsSold = buildUnitsSoldMap(
      previousOrders.flatMap((o) => o.items)
    );

    // Calculate current period expenses by type (with batch amortization)
    const currentExpensesByType = currentExpenses.reduce((acc, expense) => {
      const type = expense.type || "other";
      if (!acc[type]) acc[type] = 0;
      acc[type] += attributeExpense(expense, currentPLUnitsSold);
      return acc;
    }, {} as Record<string, number>);

    const currentTotalExpenses = sumAttributedExpenses(
      currentExpenses,
      currentPLUnitsSold
    );

    // Calculate previous period revenue
    const previousRevenue = previousOrders.reduce((sum, order) => {
      return (
        sum +
        order.items.reduce(
          (itemSum, item) => itemSum + item.price * item.quantity,
          0
        )
      );
    }, 0);

    // Calculate previous period COGS
    const previousCOGS = previousOrders.reduce((sum, order) => {
      return (
        sum +
        order.items.reduce(
          (itemSum, item) => itemSum + item.cost * item.quantity,
          0
        )
      );
    }, 0);

    // Calculate previous period expenses by type (with batch amortization)
    const previousExpensesByType = previousExpenses.reduce((acc, expense) => {
      const type = expense.type || "other";
      if (!acc[type]) acc[type] = 0;
      acc[type] += attributeExpense(expense, previousPLUnitsSold);
      return acc;
    }, {} as Record<string, number>);

    const previousTotalExpenses = sumAttributedExpenses(
      previousExpenses,
      previousPLUnitsSold
    );

    // Calculate gross profit
    const currentGrossProfit = currentRevenue - currentCOGS;
    const previousGrossProfit = previousRevenue - previousCOGS;

    // Calculate net profit
    const currentNetProfit = currentGrossProfit - currentTotalExpenses;
    const previousNetProfit = previousGrossProfit - previousTotalExpenses;

    // Calculate margins
    const grossMargin = currentRevenue > 0 ? (currentGrossProfit / currentRevenue) * 100 : 0;
    const netMargin = currentRevenue > 0 ? (currentNetProfit / currentRevenue) * 100 : 0;

    // Calculate percentage changes
    const revenueChange =
      previousRevenue !== 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : currentRevenue > 0
        ? 100
        : 0;

    const cogsChange =
      previousCOGS !== 0
        ? ((currentCOGS - previousCOGS) / previousCOGS) * 100
        : currentCOGS > 0
        ? 100
        : 0;

    const grossProfitChange =
      previousGrossProfit !== 0
        ? ((currentGrossProfit - previousGrossProfit) / Math.abs(previousGrossProfit)) * 100
        : currentGrossProfit > 0
        ? 100
        : 0;

    const netProfitChange =
      previousNetProfit !== 0
        ? ((currentNetProfit - previousNetProfit) / Math.abs(previousNetProfit)) * 100
        : currentNetProfit > 0
        ? 100
        : 0;

    // Calculate expense changes by type
    const expenseTypes = ["ad_spend", "delivery", "shipping", "clearing", "waybill", "other", "payroll"];
    const expenseDetails = expenseTypes.map((type) => {
      const current = currentExpensesByType[type] || 0;
      const previous = previousExpensesByType[type] || 0;
      const change =
        previous !== 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

      return {
        type,
        current,
        previous,
        change,
      };
    });

    return {
      success: true,
      data: {
        revenue: {
          current: currentRevenue,
          previous: previousRevenue,
          change: revenueChange,
        },
        cogs: {
          current: currentCOGS,
          previous: previousCOGS,
          change: cogsChange,
        },
        grossProfit: {
          current: currentGrossProfit,
          previous: previousGrossProfit,
          change: grossProfitChange,
        },
        expenses: expenseDetails,
        totalExpenses: {
          current: currentTotalExpenses,
          previous: previousTotalExpenses,
          change:
            previousTotalExpenses !== 0
              ? ((currentTotalExpenses - previousTotalExpenses) / previousTotalExpenses) * 100
              : currentTotalExpenses > 0
              ? 100
              : 0,
        },
        netProfit: {
          current: currentNetProfit,
          previous: previousNetProfit,
          change: netProfitChange,
        },
        margins: {
          gross: grossMargin,
          net: netMargin,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching profit and loss statement:", error);
    return {
      success: false,
      error: "Failed to fetch profit and loss statement",
    };
  }
}

/**
 * Get product profitability analysis
 */
export async function getProductProfitability(
  period: TimePeriod = "month",
  customStartDate?: Date,
  customEndDate?: Date,
  currency?: Currency,
  timezone?: string,
) {
  try {
    // Use custom dates if provided, otherwise calculate from period
    let startDate: Date;
    let endDate: Date;

    if (customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      const dateRange = getDateRange(period, timezone);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    }

    // Fetch all products (including soft-deleted for historical data)
    const products = await db.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        cost: true,
      },
    });

    // Fetch all delivered orders in the period with items
    const deliveredOrders = await db.order.findMany({
      where: {
        status: "DELIVERED",
        deliveredAt: {
          gte: startDate,
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
    });

    // Fetch all product expenses in the period
    const productExpenses = await db.expense.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        productId: { not: null },
        ...(currency && { currency }),
      },
    });

    // Calculate profitability per product
    const productProfitability = products.map((product) => {
      // Calculate units sold
      let unitsSold = 0;
      let revenue = 0;
      let cogs = 0;

      deliveredOrders.forEach((order) => {
        order.items.forEach((item) => {
          if (item.productId === product.id) {
            unitsSold += item.quantity;
            revenue += item.price * item.quantity;
            cogs += item.cost * item.quantity;
          }
        });
      });

      // Build a single-product units map for batch amortization
      const productUnitsSoldMap = new Map([[product.id, unitsSold]]);

      // Calculate product-specific expenses by type with batch amortization
      const productExpensesByType = productExpenses
        .filter((exp) => exp.productId === product.id)
        .reduce((acc, exp) => {
          const type = exp.type || "other";
          acc[type] =
            (acc[type] || 0) + attributeExpense(exp, productUnitsSoldMap);
          return acc;
        }, {} as Record<string, number>);

      const expenses = Object.values(productExpensesByType).reduce(
        (sum, amount) => sum + amount,
        0
      );
      const adSpend = productExpensesByType["ad_spend"] || 0;

      // Calculate net profit
      const netProfit = revenue - cogs - expenses;

      // Calculate margin percentage
      const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      // Calculate ROI
      const totalCost = cogs + expenses;
      const roi = totalCost > 0 ? netProfit / totalCost : 0;

      // Calculate ROAS (Return on Ad Spend)
      const roas = adSpend > 0 ? revenue / adSpend : 0;

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku || "N/A",
        unitsSold,
        revenue,
        cogs,
        expenses,
        adSpend,
        netProfit,
        margin,
        roi,
        roas,
        expensesByType: productExpensesByType,
      };
    });

    // Filter out products with no sales in the period
    const productsWithSales = productProfitability.filter((p) => p.unitsSold > 0);

    // Sort by revenue descending
    productsWithSales.sort((a, b) => b.revenue - a.revenue);

    // Calculate summary statistics
    const totalRevenue = productsWithSales.reduce((sum, p) => sum + p.revenue, 0);
    const totalNetProfit = productsWithSales.reduce((sum, p) => sum + p.netProfit, 0);
    const totalAdSpend = productsWithSales.reduce((sum, p) => sum + p.adSpend, 0);
    const averageMargin =
      productsWithSales.length > 0
        ? productsWithSales.reduce((sum, p) => sum + p.margin, 0) / productsWithSales.length
        : 0;
    const overallRoas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;

    // Find top performer (highest margin with positive profit)
    const topPerformer = productsWithSales
      .filter((p) => p.netProfit > 0)
      .sort((a, b) => b.margin - a.margin)[0] || null;

    // Find products at a loss
    const productsAtLoss = productsWithSales
      .filter((p) => p.netProfit < 0)
      .sort((a, b) => a.netProfit - b.netProfit);

    return {
      success: true,
      data: {
        products: productsWithSales,
        summary: {
          totalRevenue,
          totalNetProfit,
          totalAdSpend,
          averageMargin,
          overallRoas,
          totalProducts: productsWithSales.length,
        },
        insights: {
          topPerformer: topPerformer
            ? {
                name: topPerformer.productName,
                margin: topPerformer.margin,
                netProfit: topPerformer.netProfit,
                revenue: topPerformer.revenue,
              }
            : null,
          worstPerformer:
            productsAtLoss.length > 0
              ? {
                  name: productsAtLoss[0].productName,
                  margin: productsAtLoss[0].margin,
                  netProfit: productsAtLoss[0].netProfit,
                  revenue: productsAtLoss[0].revenue,
                  cogs: productsAtLoss[0].cogs,
                  expenses: productsAtLoss[0].expenses,
                }
              : null,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching product profitability:", error);
    return {
      success: false,
      error: "Failed to fetch product profitability data",
    };
  }
}

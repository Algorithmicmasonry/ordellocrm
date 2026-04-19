"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/currency";
import type { TimePeriod } from "@/lib/types";
import {
  AlertTriangle,
  DollarSign,
  Package,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

interface ProductProfitabilityProps {
  data: {
    products: Array<{
      productId: string;
      productName: string;
      sku: string;
      unitsSold: number;
      revenue: number;
      cogs: number;
      expenses: number;
      adSpend: number;
      netProfit: number;
      margin: number;
      roi: number;
      roas: number;
      expensesByType: Record<string, number>;
    }>;
    summary: {
      totalRevenue: number;
      totalNetProfit: number;
      totalAdSpend: number;
      averageMargin: number;
      overallRoas: number;
      totalProducts: number;
    };
    insights: {
      topPerformer: {
        name: string;
        margin: number;
        netProfit: number;
        revenue: number;
      } | null;
      worstPerformer: {
        name: string;
        margin: number;
        netProfit: number;
        revenue: number;
        cogs: number;
        expenses: number;
      } | null;
    };
  };
  period: TimePeriod;
  currency?: import("@prisma/client").Currency;
}

export function ProductProfitability({
  data,
  period,
  currency,
}: ProductProfitabilityProps) {
  const { products, summary, insights } = data;
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const itemsPerPage = 10;

  // Get selected product details
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.productId === selectedProductId) || null;
  }, [selectedProductId, products]);

  // Check if using custom date range
  const hasCustomDateRange =
    searchParams.get("startDate") && searchParams.get("endDate");

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.productName.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query),
    );
  }, [products, searchQuery]);

  // Paginate results
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const getMarginColor = (margin: number) => {
    if (margin >= 30)
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (margin >= 15)
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return "text-green-600 dark:text-green-400";
    if (profit < 0) return "text-red-500 dark:text-red-400";
    return "text-slate-500";
  };

  const EXPENSE_LABELS: Record<string, string> = {
    ad_spend: "Marketing & Ad Spend",
    delivery: "Logistics & Delivery",
    shipping: "Shipping Costs",
    clearing: "Clearing & Customs",
    waybill: "Waybill Costs",
    payroll: "Salaries & Payroll",
    other: "Other Expenses",
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-4 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Avg Margin:{" "}
            <span className="font-bold text-primary">
              {summary.averageMargin.toFixed(1)}%
            </span>
          </p>
        </div>
        <div className="flex items-center gap-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-xl px-4 py-2">
          <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            ROAS:{" "}
            <span className="font-bold text-green-600 dark:text-green-400">
              {summary.overallRoas.toFixed(2)}x
            </span>
          </p>
        </div>
      </div>

      {/* Product Selector */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <label className="text-sm font-semibold mb-2 block">
            Select Product for Detailed Analysis
          </label>
          <Select
            value={selectedProductId}
            onValueChange={setSelectedProductId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a product..." />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.productId} value={product.productId}>
                  {product.productName} ({product.sku})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedProductId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedProductId("")}
            className="mt-6"
          >
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Selected Product Details */}
      {selectedProduct && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {selectedProduct.productName} - Detailed Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Units Sold
                </p>
                <p className="text-2xl font-bold">
                  {selectedProduct.unitsSold.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Revenue
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(selectedProduct.revenue, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Net Profit
                </p>
                <p
                  className={`text-2xl font-bold ${getProfitColor(
                    selectedProduct.netProfit,
                  )}`}
                >
                  {formatCurrency(selectedProduct.netProfit, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Margin
                </p>
                <p className="text-2xl font-bold">
                  {selectedProduct.margin.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cost Breakdown */}
              <div>
                <h4 className="text-sm font-bold mb-3">Cost Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">COGS</span>
                    <span className="text-sm font-semibold">
                      {formatCurrency(selectedProduct.cogs, currency)}
                    </span>
                  </div>
                  {Object.entries(selectedProduct.expensesByType).map(
                    ([type, amount]) => (
                      <div
                        key={type}
                        className="flex justify-between items-center py-2 border-b"
                      >
                        <span className="text-sm text-muted-foreground">
                          {EXPENSE_LABELS[type] || type}
                        </span>
                        <span className="text-sm font-semibold">
                          {formatCurrency(amount, currency)}
                        </span>
                      </div>
                    ),
                  )}
                  <div className="flex justify-between items-center py-2 pt-4 border-t-2 border-primary/20">
                    <span className="text-sm font-bold">Total Costs</span>
                    <span className="text-sm font-bold">
                      {formatCurrency(
                        selectedProduct.cogs + selectedProduct.expenses,
                        currency,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h4 className="text-sm font-bold mb-3">Performance Metrics</h4>
                <div className="space-y-4">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">
                        Return on Investment (ROI)
                      </span>
                      {selectedProduct.roi > 1 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <p className="text-xl font-bold">
                      {selectedProduct.roi.toFixed(2)}x
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedProduct.roi > 1
                        ? `Earning ${selectedProduct.roi.toFixed(2)}x on every ${formatCurrency(1, currency)} invested`
                        : "Investment not yet profitable"}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">
                        Return on Ad Spend (ROAS)
                      </span>
                      <DollarSign className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xl font-bold">
                      {selectedProduct.roas > 0
                        ? `${selectedProduct.roas.toFixed(2)}x`
                        : "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedProduct.adSpend > 0
                        ? `Generating ${formatCurrency(selectedProduct.roas, currency)} for every ${formatCurrency(1, currency)} spent on ads`
                        : "No ad spend recorded for this period"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredProducts.length} of {products.length} products
        </p>
      </div>

      {/* Profitability Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b">
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Product Name
                  </th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                    Units Sold
                  </th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                    Revenue
                  </th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                    COGS
                  </th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                    Expenses
                  </th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                    Net Profit
                  </th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                    Margin %
                  </th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                    ROI
                  </th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                    ROAS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedProducts.length > 0 ? (
                  paginatedProducts.map((product) => (
                    <tr
                      key={product.productId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-sm">
                            {product.productName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {product.sku}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-right text-sm font-medium">
                        {product.unitsSold.toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-sm font-medium">
                        {formatCurrency(product.revenue, currency)}
                      </td>
                      <td className="p-4 text-right text-sm text-muted-foreground">
                        {formatCurrency(product.cogs, currency)}
                      </td>
                      <td className="p-4 text-right text-sm text-muted-foreground">
                        {formatCurrency(product.expenses, currency)}
                      </td>
                      <td
                        className={`p-4 text-right text-sm font-bold ${getProfitColor(
                          product.netProfit,
                        )}`}
                      >
                        {formatCurrency(product.netProfit, currency)}
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${getMarginColor(
                            product.margin,
                          )}`}
                        >
                          {product.margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-4 text-right text-sm font-semibold">
                        {product.roi.toFixed(1)}x
                      </td>
                      <td className="p-4 text-right text-sm font-semibold text-primary">
                        {product.roas > 0 ? `${product.roas.toFixed(2)}x` : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center">
                      <p className="text-muted-foreground">
                        No products found matching your search
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <p className="text-xs font-medium text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredProducts.length)}{" "}
                of {filteredProducts.length} products
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Growth Opportunity */}
        {insights.topPerformer && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm">Top Growth Opportunity</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                The{" "}
                <span className="text-foreground font-bold">
                  {insights.topPerformer.name}
                </span>{" "}
                has the highest net margin (
                {insights.topPerformer.margin.toFixed(1)}
                %) this period. Consider increasing marketing spend for this
                product.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-green-600">
                  {formatCurrency(insights.topPerformer.netProfit, currency)}{" "}
                  profit
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(insights.topPerformer.revenue, currency)}{" "}
                  revenue
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Margin Alert */}
        {insights.worstPerformer && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm">Margin Alert</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                The{" "}
                <span className="text-foreground font-bold">
                  {insights.worstPerformer.name}
                </span>{" "}
                is currently operating at a loss. COGS (
                {formatCurrency(insights.worstPerformer.cogs, currency)}) plus
                expenses (
                {formatCurrency(insights.worstPerformer.expenses, currency)})
                exceed revenue.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-600">
                  Losing{" "}
                  {formatCurrency(
                    Math.abs(insights.worstPerformer.netProfit),
                    currency,
                  )}{" "}
                  this period
                </span>
                <span className="text-xs text-muted-foreground">
                  {insights.worstPerformer.margin.toFixed(1)}% margin
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

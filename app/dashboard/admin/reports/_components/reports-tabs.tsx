"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { FinancialOverview } from "./financial-overview";
import { SalesRepFinance } from "./sales-rep-finance";
import { AgentCostAnalysis } from "./agent-cost-analysis";
import { ProfitLossStatement } from "./profit-loss-statement";
import { ProductProfitability } from "./product-profitability";
import { TabErrorBoundary } from "./tab-error-boundary";
import {
  getSalesRepFinance,
  getAgentCostAnalysis,
  getProfitLossStatement,
  getProductProfitability,
} from "../actions";
import type { TimePeriod } from "@/lib/types";
import type { Currency } from "@prisma/client";

interface ReportsTabsProps {
  overviewData: any;
  period: TimePeriod;
  currency?: Currency;
  startDate?: string;
  endDate?: string;
  timezone?: string;
}

export function ReportsTabs({
  overviewData,
  period,
  currency,
  startDate,
  endDate,
  timezone,
}: ReportsTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [salesRepData, setSalesRepData] = useState<any>(null);
  const [agentCostData, setAgentCostData] = useState<any>(null);
  const [profitLossData, setProfitLossData] = useState<any>(null);
  const [productProfitData, setProductProfitData] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleTabChange(tab: string) {
    setActiveTab(tab);

    const sd = startDate ? new Date(startDate) : undefined;
    const ed = endDate ? new Date(endDate) : undefined;

    if (tab === "sales-rep" && !salesRepData) {
      setLoading("sales-rep");
      const res = await getSalesRepFinance(period, sd, ed, currency, timezone);
      setLoading(null);
      if (res.success && res.data) setSalesRepData(res.data);
      else setErrors((prev) => ({ ...prev, "sales-rep": res.error || "Failed to load" }));
    }

    if (tab === "agent-costs" && !agentCostData) {
      setLoading("agent-costs");
      const res = await getAgentCostAnalysis(period, sd, ed, currency, timezone);
      setLoading(null);
      if (res.success && res.data) setAgentCostData(res.data);
      else setErrors((prev) => ({ ...prev, "agent-costs": res.error || "Failed to load" }));
    }

    if (tab === "profit-loss" && !profitLossData) {
      setLoading("profit-loss");
      const res = await getProfitLossStatement(period, sd, ed, currency, timezone);
      setLoading(null);
      if (res.success && res.data) setProfitLossData(res.data);
      else setErrors((prev) => ({ ...prev, "profit-loss": res.error || "Failed to load" }));
    }

    if (tab === "product" && !productProfitData) {
      setLoading("product");
      const res = await getProductProfitability(period, sd, ed, currency, timezone);
      setLoading(null);
      if (res.success && res.data) setProductProfitData(res.data);
      else setErrors((prev) => ({ ...prev, product: res.error || "Failed to load" }));
    }
  }

  function TabLoader() {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  function TabError({ label }: { label: string }) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground">Failed to Load {label}</h2>
          <p className="text-sm text-muted-foreground mt-2">{errors[activeTab] || "Something went wrong"}</p>
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:w-auto lg:inline-grid gap-1 z-10 relative">
        <TabsTrigger value="overview" className="text-xs sm:text-sm">Financial Overview</TabsTrigger>
        <TabsTrigger value="sales-rep" className="text-xs sm:text-sm">Sales Rep Finance</TabsTrigger>
        <TabsTrigger value="agent-costs" className="text-xs sm:text-sm">Agent Costs</TabsTrigger>
        <TabsTrigger value="profit-loss" className="text-xs sm:text-sm">Profit & Loss</TabsTrigger>
        <TabsTrigger value="product" className="text-xs sm:text-sm">Product Profitability</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6 relative z-0">
        <TabErrorBoundary label="Financial Overview">
          <FinancialOverview data={overviewData} period={period} currency={currency} />
        </TabErrorBoundary>
      </TabsContent>

      <TabsContent value="sales-rep" className="mt-6">
        {loading === "sales-rep" ? (
          <TabLoader />
        ) : errors["sales-rep"] ? (
          <TabError label="Sales Rep Data" />
        ) : salesRepData ? (
          <TabErrorBoundary label="Sales Rep Finance">
            <SalesRepFinance data={salesRepData} period={period} currency={currency} />
          </TabErrorBoundary>
        ) : null}
      </TabsContent>

      <TabsContent value="agent-costs" className="mt-6">
        {loading === "agent-costs" ? (
          <TabLoader />
        ) : errors["agent-costs"] ? (
          <TabError label="Agent Cost Data" />
        ) : agentCostData ? (
          <TabErrorBoundary label="Agent Cost Analysis">
            <AgentCostAnalysis data={agentCostData} period={period} currency={currency} />
          </TabErrorBoundary>
        ) : null}
      </TabsContent>

      <TabsContent value="profit-loss" className="mt-6">
        {loading === "profit-loss" ? (
          <TabLoader />
        ) : errors["profit-loss"] ? (
          <TabError label="P&L Statement" />
        ) : profitLossData ? (
          <TabErrorBoundary label="Profit & Loss Statement">
            <ProfitLossStatement data={profitLossData} period={period} currency={currency} />
          </TabErrorBoundary>
        ) : null}
      </TabsContent>

      <TabsContent value="product" className="mt-6">
        {loading === "product" ? (
          <TabLoader />
        ) : errors["product"] ? (
          <TabError label="Product Profitability" />
        ) : productProfitData ? (
          <TabErrorBoundary label="Product Profitability">
            <ProductProfitability data={productProfitData} period={period} currency={currency} />
          </TabErrorBoundary>
        ) : null}
      </TabsContent>
    </Tabs>
  );
}

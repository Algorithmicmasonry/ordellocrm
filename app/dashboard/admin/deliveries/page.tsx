import { redirect } from "next/navigation";
import { requireOrgContext } from "@/lib/org-context";
import type { TimePeriod } from "@/lib/types";
import type { Currency } from "@prisma/client";
import {
  DashboardHeader,
  PeriodFilter,
  DateRangePicker,
  CurrencyFilter,
} from "../_components";
import { DeliveryStats, DeliveriesTable } from "./_components";
import {
  getDeliveries,
  getDeliveryStats,
  getAgentsForFilter,
} from "./actions";

type SearchParams = {
  period?: string;
  startDate?: string;
  endDate?: string;
  currency?: Currency;
  agent?: string;
  search?: string;
  page?: string;
};

export const metadata = {
  title: "Deliveries | Ordo CRM",
};

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireOrgContext();
  if (ctx.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const sp = await searchParams;

  const validPeriods: TimePeriod[] = ["today", "week", "month", "year"];
  const rawPeriod = (sp.period ?? "month") as TimePeriod;
  const currentPeriod = validPeriods.includes(rawPeriod) ? rawPeriod : "month";

  const startDate = sp.startDate;
  const endDate = sp.endDate;
  const currency = sp.currency;
  const agentId = sp.agent;
  const search = sp.search;
  const page = parseInt(sp.page ?? "1", 10);

  const filters = { agentId, currency, search };

  const [deliveriesResult, statsResult, agentsResult] = await Promise.all([
    getDeliveries(filters, { page, perPage: 10 }, currentPeriod, startDate, endDate),
    getDeliveryStats(currentPeriod, currency, startDate, endDate),
    getAgentsForFilter(),
  ]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardHeader
        heading="Deliveries"
        text="Orders fulfilled in the selected period, anchored to delivery date"
      />

      {/* Period / Date Range / Currency Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <PeriodFilter currentPeriod={currentPeriod} />
        <DateRangePicker />
        <CurrencyFilter />
      </div>

      <DeliveryStats
        stats={statsResult.success ? (statsResult.data ?? null) : null}
        currency={currency}
      />

      <DeliveriesTable
        deliveries={deliveriesResult.data?.deliveries ?? []}
        pagination={
          deliveriesResult.data?.pagination ?? {
            total: 0,
            page: 1,
            perPage: 10,
            totalPages: 0,
          }
        }
        agents={agentsResult.data ?? []}
        currentAgent={agentId}
      />
    </div>
  );
}

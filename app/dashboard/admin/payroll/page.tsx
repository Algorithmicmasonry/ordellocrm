import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "../_components";
import {
  getSalesRepsWithRates,
  getPayrollHistory,
  getPayrollByMonth,
} from "./actions";
import { PayRatesTab, RunPayrollTab, PayrollHistoryTab } from "./_components";
import type { UserRole } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ tab?: string; month?: string }>;
}

export default async function PayrollPage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const tab = query.tab ?? "rates";

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const selectedMonth = query.month ?? defaultMonth;

  const [ratesResult, historyResult, existingResult] = await Promise.all([
    getSalesRepsWithRates(),
    getPayrollHistory(),
    getPayrollByMonth(selectedMonth),
  ]);

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      <DashboardHeader
        heading="Payroll"
        text="Manage pay rates and generate monthly payroll for your team"
      />

      <Tabs defaultValue={tab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="rates">Pay Rates</TabsTrigger>
          <TabsTrigger value="run">Run Payroll</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="mt-6">
          {ratesResult.success && ratesResult.data ? (
            <PayRatesTab
              users={ratesResult.data as Array<{
                id: string;
                name: string;
                email: string;
                role: UserRole;
                rate: { ratePerOrder: number; updatedAt: Date } | null;
              }>}
            />
          ) : (
            <p className="text-sm text-destructive">
              {ratesResult.error ?? "Failed to load rates."}
            </p>
          )}
        </TabsContent>

        <TabsContent value="run" className="mt-6">
          <RunPayrollTab
            existingDraft={
              existingResult.data
                ? {
                    id: existingResult.data.id,
                    label: existingResult.data.label,
                    monthYear: existingResult.data.monthYear,
                    status: existingResult.data.status,
                    totalAmount: existingResult.data.totalAmount,
                    paidAt: existingResult.data.paidAt,
                    items: existingResult.data.items.map((item) => ({
                      id: item.id,
                      userId: item.userId,
                      userName: item.user.name,
                      userRole: item.user.role as UserRole,
                      ordersDelivered: item.ordersDelivered,
                      ratePerOrder: item.ratePerOrder,
                      baseAmount: item.baseAmount,
                      hohWeeks: item.hohWeeks,
                      hohBonus: item.hohBonus,
                      totalAmount: item.totalAmount,
                    })),
                  }
                : null
            }
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {historyResult.success && historyResult.data ? (
            <PayrollHistoryTab
              payrolls={historyResult.data as any}
            />
          ) : (
            <p className="text-sm text-destructive">
              {historyResult.error ?? "Failed to load history."}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

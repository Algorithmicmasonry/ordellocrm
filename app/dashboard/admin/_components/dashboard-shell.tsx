import { Sidebar } from "./sidebar"
import { TrialBanner } from "@/components/trial-banner"
import { PaywallGuard } from "@/components/paywall-guard"
import { TokenBalanceWidget } from "@/components/token-balance-widget"

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TrialBanner />
        {/* Token balance shown in top-right of main area */}
        <div className="flex justify-end px-4 sm:px-6 lg:px-8 pt-3">
          <TokenBalanceWidget />
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <PaywallGuard>
            {children}
          </PaywallGuard>
        </div>
      </main>
    </div>
  );
}
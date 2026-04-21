import { Sidebar } from "./_components/sidebar";
import { TrialBanner } from "@/components/trial-banner";
import { PaywallGuard } from "@/components/paywall-guard";
import { TokenBalanceWidget } from "@/components/token-balance-widget";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden" suppressHydrationWarning>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TrialBanner />
        <div className="flex justify-end px-4 sm:px-6 lg:px-8 pt-3">
          <TokenBalanceWidget />
        </div>
        <div className="flex-1 overflow-y-auto p-4 pt-2 lg:pt-4 lg:p-8">
          <PaywallGuard>
            {children}
          </PaywallGuard>
        </div>
      </main>
    </div>
  );
}

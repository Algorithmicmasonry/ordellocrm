import { Sidebar } from "./_components/sidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory Manager Dashboard - Ordo",
  description: "Manage inventory, agent stock, and warehouse operations",
};

interface InventoryLayoutProps {
  children: React.ReactNode;
}

export default function InventoryLayout({ children }: InventoryLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row overflow-hidden" suppressHydrationWarning>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 pt-20 lg:pt-8 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

import { Sidebar } from "./_components/sidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales Rep Dashboard - Ordo",
  description: "Carry out all of your sales rep responsibilities here",
};

interface SalesRepLayoutProps {
  children: React.ReactNode;
}

export default function SalesRepLayout({ children }: SalesRepLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row overflow-hidden" suppressHydrationWarning>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 pt-20 lg:pt-8 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

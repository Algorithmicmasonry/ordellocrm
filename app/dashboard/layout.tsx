import type { Metadata } from "next";
import { Rethink_Sans } from "next/font/google";
import { requireOrgContext } from "@/lib/org-context";
import { NotificationListener } from "@/app/_components/notification-listener";

const inter = Rethink_Sans({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Dashboard – Ordello",
  description: "Manage your e-commerce business with Ordello.",
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // requireOrgContext handles all redirects:
  // → /login if not authenticated
  // → /onboarding if authenticated but no org yet
  await requireOrgContext();

  return (
    <div className={inter.className} suppressHydrationWarning>
      <NotificationListener />
      {children}
    </div>
  );
}

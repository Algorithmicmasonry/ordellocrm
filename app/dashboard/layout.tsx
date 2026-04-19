import type { Metadata } from "next";
import { Rethink_Sans } from "next/font/google";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NotificationListener } from "@/app/_components/notification-listener";

const inter = Rethink_Sans({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Admin Dashboard – Ordo CRM",
  description:
    "Admin dashboard for managing e-commerce orders, inventory, sales representatives, agents, expenses, revenue, and profit tracking in real time.",
};

// TODO:Create a fancy user not authenticated page

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    console.log("User is not authenticated");
    redirect("/login");
  }

  return (
    <div className={inter.className} suppressHydrationWarning>
      <NotificationListener />
      {children}
    </div>
  );
}

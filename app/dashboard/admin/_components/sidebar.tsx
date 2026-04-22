"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, getInitials, formatRole } from "@/lib/utils";
import {
  Banknote,
  Bell,
  BookUser,
  BotMessageSquare,
  ChartPie,
  Code2,
  CreditCard,
  HatGlasses,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  PackageOpen,
  PanelLeftClose,
  Phone,
  PanelLeftOpen,
  Repeat,
  Settings,
  ShoppingBag,
  Target,
  Users,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { OrdelloLogo } from "@/components/ordello-logo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/app/actions/user";
import type { OrgMemberRole } from "@prisma/client";
import { authClient } from "@/lib/auth-client";

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard/admin",
  },
  {
    label: "Orders",
    icon: ShoppingBag,
    href: "/dashboard/admin/orders",
  },
  {
    label: "Deliveries",
    icon: PackageCheck,
    href: "/dashboard/admin/deliveries",
  },
  {
    label: "Inventory",
    icon: PackageOpen,
    href: "/dashboard/admin/inventory",
  },
  {
    label: "Sales Reps",
    icon: UsersRound,
    href: "/dashboard/admin/sales-reps",
  },
  {
    label: "Agents",
    icon: HatGlasses,
    href: "/dashboard/admin/agents",
  },
  {
    label: "Payroll",
    icon: Banknote,
    href: "/dashboard/admin/payroll",
  },
  {
    label: "Customers",
    icon: BookUser,
    href: "/dashboard/admin/customers",
  },
  {
    label: "Expenses",
    icon: WalletCards,
    href: "/dashboard/admin/expenses",
  },
  {
    label: "Finance & Accounting",
    icon: ChartPie,
    href: "/dashboard/admin/reports",
  },
  {
    label: "Ad Tracking",
    icon: Target,
    href: "/dashboard/admin/utm-tracking",
  },
  {
    label: "User Management",
    icon: Users,
    href: "/dashboard/admin/users",
  },
  {
    label: "Round-Robin",
    icon: Repeat,
    href: "/dashboard/admin/round-robin",
  },
  {
    label: "Embed Form",
    icon: Code2,
    href: "/dashboard/admin/embed",
  },
  {
    label: "AI Agent",
    icon: Phone,
    href: "/dashboard/admin/ai-agent",
  },
  {
    label: "AI Sandbox",
    icon: BotMessageSquare,
    href: "/dashboard/admin/ai-sandbox",
  },
  {
    label: "Notifications",
    icon: Bell,
    href: "/dashboard/admin/notifications",
  },
  {
    label: "Subscription",
    icon: CreditCard,
    href: "/dashboard/admin/subscription",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/dashboard/admin/settings",
  },
];

interface UserData {
  id: string;
  name: string;
  email: string;
  role: OrgMemberRole | null;
  image: string | null;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await authClient.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Failed to sign out:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={cn(
          "p-6 flex items-center",
          isCollapsed ? "justify-center flex-col gap-3" : "gap-3",
        )}
      >
        <OrdelloLogo size={40} />

        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-none">Ordello</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Management System
            </p>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 hidden lg:flex"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="size-6 text-primary" />
          ) : (
            <PanelLeftClose className="size-6 text-primary" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <TooltipProvider delayDuration={0}>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {routes.map((route) => {
            const isActive = pathname === route.href;
            const linkContent = (
              <Link
                key={route.href}
                href={route.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/80 hover:bg-primary hover:text-primary-foreground",
                  isCollapsed && "justify-center",
                )}
              >
                <route.icon className="size-5 shrink-0" />
                {!isCollapsed && <span>{route.label}</span>}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={route.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{route.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>
      </TooltipProvider>

      {/* User Profile */}
      <div className="p-4 border-t border-border space-y-2">
        {isLoading ? (
          <div className="flex items-center gap-3 p-2 animate-pulse">
            <div className="size-8 rounded-full bg-muted" />
            {!isCollapsed && (
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded w-24" />
                <div className="h-2 bg-muted rounded w-16" />
              </div>
            )}
          </div>
        ) : (
          <>
            <div
              className={cn(
                "flex items-center gap-3 p-2",
                isCollapsed && "flex-col gap-2",
              )}
            >
              <Avatar className="size-8 shrink-0">
                <AvatarImage src={user?.image || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {user?.name ? getInitials(user.name) : "??"}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && user && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {user.role ? formatRole(user.role) : ""}
                  </p>
                </div>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size={isCollapsed ? "icon" : "sm"}
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className={cn(
                      "w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20",
                      isCollapsed && "h-8 w-8",
                    )}
                  >
                    <LogOut className="size-4" />
                    {!isCollapsed && <span className="ml-2">Sign Out</span>}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Sign Out</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-card">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex shrink-0 border-r border-border bg-card flex-col transition-all duration-300",
          isCollapsed ? "w-20" : "w-64",
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

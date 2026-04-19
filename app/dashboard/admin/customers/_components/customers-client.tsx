"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, getCurrencyName } from "@/lib/currency";
import type { Currency } from "@prisma/client";
import {
  Users,
  UserCheck,
  Repeat,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  Download,
  Filter,
  RefreshCw,
  Eye,
  Phone,
  MessageSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { DashboardHeader } from "../../_components/dashboard-header";
import { PeriodFilter, DateRangePicker } from "../../_components";
import { CurrencyFilter } from "../../_components/currency-filter";
import type { TimePeriod } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SourceIcon, sourceNames } from "../../orders/_components/orders-table";
import {
  exportToCSV,
  generateFilename,
  formatCurrencyForExport,
} from "@/lib/export-utils";

interface Customer {
  name: string;
  phone: string;
  whatsapp: string;
  totalOrders: number;
  successfulOrders: number;
  cancelledOrders: number;
  totalSpent: number;
  reliability: "high" | "average" | "low";
  reliabilityRate: number;
  location?: string | null;
  preferredSource?: string | null;
}

interface CustomersPageProps {
  customers: Customer[];
  stats: {
    totalCustomers: number;
    activeCustomers: number;
    returningRate: number;
    avgLifetimeValue: number;
    trends: {
      totalCustomers: number | null;
      activeCustomers: number | null;
      returningRate: number | null;
      avgLifetimeValue: number | null;
    };
  };
  currentPeriod: TimePeriod;
  currency?: Currency;
}

const reliabilityConfig = {
  high: {
    label: "High Reliability",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  average: {
    label: "Average",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  low: {
    label: "Low Reliability",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
  },
};

export default function CustomersClient({
  customers,
  stats,
  currentPeriod,
  currency,
}: CustomersPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const itemsPerPage = 10;
  const router = useRouter();

  // Filter customers by search query and source
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.whatsapp.includes(searchQuery);

    const matchesSource =
      sourceFilter === "all" ||
      customer.preferredSource === sourceFilter ||
      (!customer.preferredSource && sourceFilter === "unknown");

    return matchesSearch && matchesSource;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleExportData = () => {
    try {
      // Export filtered customers to CSV
      const headers = [
        "Name",
        "Phone",
        "WhatsApp",
        "Location",
        "Total Orders",
        "Successful Orders",
        "Cancelled Orders",
        "Total Spent",
        "Reliability",
        "Reliability Rate",
        "Preferred Source",
      ];

      const rows = filteredCustomers.map((customer) => [
        customer.name,
        customer.phone,
        customer.whatsapp,
        customer.location || "Not specified",
        customer.totalOrders.toString(),
        customer.successfulOrders.toString(),
        customer.cancelledOrders.toString(),
        formatCurrencyForExport(customer.totalSpent),
        reliabilityConfig[customer.reliability].label,
        `${customer.reliabilityRate.toFixed(1)}%`,
        customer.preferredSource
          ? sourceNames[customer.preferredSource as keyof typeof sourceNames] ||
            customer.preferredSource
          : "Unknown",
      ]);

      const filename = generateFilename("customers");
      exportToCSV(headers, rows, filename);

      toast.success(`Exported ${filteredCustomers.length} customers successfully!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export customers");
    }
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const message = encodeURIComponent(`Hello ${name}! 👋`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-primary/10 text-primary",
      "bg-orange-100 text-orange-600",
      "bg-purple-100 text-purple-600",
      "bg-red-100 text-red-600",
      "bg-green-100 text-green-600",
      "bg-blue-100 text-blue-600",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Dashboard Header */}
      <DashboardHeader
        heading="Customer Directory"
        text="Manage your customer relationships and track lifetime value performance"
      />

      {/* Period and Currency Filters with Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <PeriodFilter currentPeriod={currentPeriod} />
          <DateRangePicker />
          <CurrencyFilter />
        </div>
        <Button onClick={handleExportData} className="w-full sm:w-auto">
          <Download className="size-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Currency Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs font-medium">
          Currency: {getCurrencyName(currency || "NGN")}
        </Badge>
        <span className="text-xs text-muted-foreground">
          All amounts shown in this currency only
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Customers
              </span>
              <Users className="size-5 text-primary" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-extrabold">
                {stats.totalCustomers.toLocaleString()}
              </span>
              {stats.trends.totalCustomers !== null && (
                <span
                  className={`text-xs font-bold flex items-center mb-1 ${
                    stats.trends.totalCustomers >= 0
                      ? "text-emerald-500"
                      : "text-rose-500"
                  }`}
                >
                  {stats.trends.totalCustomers >= 0 ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  {Math.abs(stats.trends.totalCustomers)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Customers
              </span>
              <UserCheck className="size-5 text-emerald-500" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-extrabold">
                {stats.activeCustomers.toLocaleString()}
              </span>
              {stats.trends.activeCustomers !== null && (
                <span
                  className={`text-xs font-bold flex items-center mb-1 ${
                    stats.trends.activeCustomers >= 0
                      ? "text-emerald-500"
                      : "text-rose-500"
                  }`}
                >
                  {stats.trends.activeCustomers >= 0 ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  {Math.abs(stats.trends.activeCustomers)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Returning Rate
              </span>
              <Repeat className="size-5 text-primary" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-extrabold">
                {stats.returningRate.toFixed(1)}%
              </span>
              {stats.trends.returningRate !== null && (
                <span
                  className={`text-xs font-bold flex items-center mb-1 ${
                    stats.trends.returningRate >= 0
                      ? "text-emerald-500"
                      : "text-rose-500"
                  }`}
                >
                  {stats.trends.returningRate >= 0 ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  {Math.abs(stats.trends.returningRate)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Avg. Lifetime Value
              </span>
              <DollarSign className="size-5 text-primary" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-extrabold">
                {formatCurrency(stats.avgLifetimeValue, currency || "NGN")}
              </span>
              {stats.trends.avgLifetimeValue !== null && (
                <span
                  className={`text-xs font-bold flex items-center mb-1 ${
                    stats.trends.avgLifetimeValue >= 0
                      ? "text-emerald-500"
                      : "text-rose-500"
                  }`}
                >
                  {stats.trends.avgLifetimeValue >= 0 ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  {Math.abs(stats.trends.avgLifetimeValue)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Filter className="size-4 mr-2" />
                    Source:{" "}
                    {sourceFilter === "all"
                      ? "All"
                      : sourceFilter === "unknown"
                        ? "Unknown"
                        : sourceFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSourceFilter("all")}>
                    All Sources
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSourceFilter("FACEBOOK")}>
                    Facebook
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSourceFilter("TIKTOK")}>
                    TikTok
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSourceFilter("WHATSAPP")}>
                    WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSourceFilter("WEBSITE")}>
                    Website
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSourceFilter("unknown")}>
                    Unknown
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.refresh()}
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact Details</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead className="text-center">Source</TableHead>
                <TableHead className="text-center">Successful</TableHead>
                <TableHead className="text-center">Cancelled</TableHead>
                <TableHead>Total Spend</TableHead>
                <TableHead>Reliability</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer) => (
                  <TableRow key={customer.phone}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10">
                          <AvatarFallback
                            className={`font-bold ${getAvatarColor(customer.name)}`}
                          >
                            {getInitials(customer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-sm">
                          {customer.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {customer.phone}
                        </span>
                        {customer.location && (
                          <span className="text-xs text-muted-foreground">
                            {customer.location}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {customer.totalOrders}
                    </TableCell>
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-pointer">
                              <SourceIcon
                                source={customer?.preferredSource || "UNKNOWN"}
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {
                                sourceNames[
                                  (customer.preferredSource ||
                                    "UNKNOWN") as keyof typeof sourceNames
                                ]
                              }
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-center text-emerald-600 font-bold">
                      {customer.successfulOrders}
                    </TableCell>
                    <TableCell className="text-center text-rose-600 font-bold">
                      {customer.cancelledOrders}
                    </TableCell>
                    <TableCell className="font-bold">
                      {formatCurrency(customer.totalSpent, currency || "NGN")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          reliabilityConfig[customer.reliability].color
                        }
                      >
                        {reliabilityConfig[customer.reliability].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                className="bg-green-500 hover:bg-green-600 text-white"
                                onClick={() =>
                                  handleWhatsApp(
                                    customer.whatsapp,
                                    customer.name,
                                  )
                                }
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 640 640"
                                  className="w-4 h-4"
                                  fill="currentColor"
                                >
                                  <path d="M476.9 161.1C435 119.1 379.2 96 319.9 96C197.5 96 97.9 195.6 97.9 318C97.9 357.1 108.1 395.3 127.5 429L96 544L213.7 513.1C246.1 530.8 282.6 540.1 319.8 540.1L319.9 540.1C442.2 540.1 544 440.5 544 318.1C544 258.8 518.8 203.1 476.9 161.1zM319.9 502.7C286.7 502.7 254.2 493.8 225.9 477L219.2 473L149.4 491.3L168 423.2L163.6 416.2C145.1 386.8 135.4 352.9 135.4 318C135.4 216.3 218.2 133.5 320 133.5C369.3 133.5 415.6 152.7 450.4 187.6C485.2 222.5 506.6 268.8 506.5 318.1C506.5 419.9 421.6 502.7 319.9 502.7zM421.1 364.5C415.6 361.7 388.3 348.3 383.2 346.5C378.1 344.6 374.4 343.7 370.7 349.3C367 354.9 356.4 367.3 353.1 371.1C349.9 374.8 346.6 375.3 341.1 372.5C308.5 356.2 287.1 343.4 265.6 306.5C259.9 296.7 271.3 297.4 281.9 276.2C283.7 272.5 282.8 269.3 281.4 266.5C280 263.7 268.9 236.4 264.3 225.3C259.8 214.5 255.2 216 251.8 215.8C248.6 215.6 244.9 215.6 241.2 215.6C237.5 215.6 231.5 217 226.4 222.5C221.3 228.1 207 241.5 207 268.8C207 296.1 226.9 322.5 229.6 326.2C232.4 329.9 268.7 385.9 324.4 410C359.6 425.2 373.4 426.5 391 423.9C401.7 422.3 423.8 410.5 428.4 397.5C433 384.5 433 373.4 431.6 371.1C430.3 368.6 426.6 367.2 421.1 364.5z" />
                                </svg>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Chat on WhatsApp</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCall(customer.phone)}
                          title="Call"
                        >
                          <Phone className="size-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          title="View Details"
                        >
                          <Link
                            href={`/dashboard/admin/customers/${encodeURIComponent(customer.phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of{" "}
            {filteredCustomers.length} customers
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

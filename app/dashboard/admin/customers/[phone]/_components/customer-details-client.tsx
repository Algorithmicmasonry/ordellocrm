"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Calendar,
  Phone,
  MessageSquare,
  Download,
  Star,
  Repeat,
  AlertTriangle,
  Trophy,
  XCircle,
  MapPin,
  Package,
  CheckCircle,
  ArrowLeft,
  Eye,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { OrderStatus } from "@prisma/client";
import { DateRangePicker } from "../../../_components";
import { getCurrencySymbol } from "@/lib/currency";
import {
  OrderDetailsModal,
  type OrderWithRelations,
} from "../../../orders/_components/orders-table";
import {
  exportToCSV,
  generateFilename,
  formatCurrencyForExport,
  formatDateOnlyForExport,
} from "@/lib/export-utils";

interface CustomerDetailsClientProps {
  data: {
    customer: {
      name: string;
      phone: string;
      whatsapp: string;
      firstOrderDate: Date;
      lastOrderDate: Date;
      location: string | null;
      isActive: boolean;
    };
    stats: {
      totalOrders: number;
      deliveredOrders: number;
      cancelledOrders: number;
      pendingOrders: number;
      totalSpent: number;
      avgOrderValue: number;
      conversionRate: number;
      daysSinceLastOrder: number;
    };
    insights: {
      purchaseFrequency: number;
      topProducts: Array<{ name: string; count: number; spent: number }>;
      preferredSource: string;
      badges: {
        isVIP: boolean;
        isRepeat: boolean;
        isAtRisk: boolean;
        isHighValue: boolean;
        isProblematic: boolean;
      };
    };
    charts: {
      ordersByMonth: Record<string, number>;
      statusDistribution: Record<string, number>;
      sourceDistribution: Record<string, number>;
    };
    orders: any[];
  };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  NEW: {
    label: "New",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  },
  DISPATCHED: {
    label: "Dispatched",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  DELIVERED: {
    label: "Delivered",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  POSTPONED: {
    label: "Postponed",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  NOT_REACHABLE: {
    label: "Not Reachable",
    color: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  },
  NOT_PICKING_CALLS: {
    label: "Not Picking Calls",
    color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  },
};

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export default function CustomerDetailsClient({
  data,
}: CustomerDetailsClientProps) {
  const { customer, stats, insights, charts, orders } = data;
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(
    null
  );
  const itemsPerPage = 10;

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

  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const message = encodeURIComponent(`Hello ${name}! 👋`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleExport = () => {
    try {
      // Create comprehensive customer report
      const headers = ["Metric", "Value"];
      const rows = [
        ["CUSTOMER PROFILE", ""],
        ["Name", customer.name],
        ["Phone", customer.phone],
        ["WhatsApp", customer.whatsapp],
        ["Location", customer.location || "Not specified"],
        ["Status", customer.isActive ? "Active" : "Inactive"],
        ["First Order", formatDateOnlyForExport(customer.firstOrderDate)],
        ["Last Order", formatDateOnlyForExport(customer.lastOrderDate)],
        ["Days Since Last Order", stats.daysSinceLastOrder.toString()],
        ["", ""], // Empty row for spacing
        ["STATISTICS", ""],
        ["Total Orders", stats.totalOrders.toString()],
        ["Delivered Orders", stats.deliveredOrders.toString()],
        ["Cancelled Orders", stats.cancelledOrders.toString()],
        ["Pending Orders", stats.pendingOrders.toString()],
        ["Total Spent", formatCurrencyForExport(stats.totalSpent)],
        ["Average Order Value", formatCurrencyForExport(stats.avgOrderValue)],
        ["Conversion Rate", `${stats.conversionRate.toFixed(1)}%`],
        ["", ""], // Empty row for spacing
        ["INSIGHTS", ""],
        [
          "Purchase Frequency",
          `${insights.purchaseFrequency.toFixed(1)} orders/month`,
        ],
        ["Preferred Source", insights.preferredSource],
        ["VIP Customer", insights.badges.isVIP ? "Yes" : "No"],
        ["Repeat Customer", insights.badges.isRepeat ? "Yes" : "No"],
        ["At Risk", insights.badges.isAtRisk ? "Yes" : "No"],
        ["High Value", insights.badges.isHighValue ? "Yes" : "No"],
        ["Problematic", insights.badges.isProblematic ? "Yes" : "No"],
        ["", ""], // Empty row for spacing
        ["TOP PRODUCTS", ""],
        ["Product", "Orders", "Total Spent"],
        ...insights.topProducts.map((product) => [
          product.name,
          product.count.toString(),
          formatCurrencyForExport(product.spent),
        ]),
        ["", ""], // Empty row for spacing
        ["ORDER HISTORY", ""],
        [
          "Order Number",
          "Date",
          "Status",
          "Source",
          "Items",
          "Total",
          "Sales Rep",
        ],
        ...orders.map((order: any) => [
          order.orderNumber,
          formatDateOnlyForExport(order.createdAt),
          order.status,
          order.source,
          order._count?.items?.toString() || "0",
          formatCurrencyForExport(order.totalAmount, order.currency),
          order.assignedTo?.name || "Unassigned",
        ]),
      ];

      const filename = generateFilename(`customer_${customer.phone.replace(/\D/g, "")}`);
      exportToCSV(headers, rows, filename);

      toast.success("Customer report exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export customer report");
    }
  };

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order as OrderWithRelations);
  };

  // Prepare chart data
  const monthlyOrdersData = Object.entries(charts.ordersByMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({
      month: new Date(month + "-01").toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      orders: count,
    }));

  const statusChartData = Object.entries(charts.statusDistribution).map(
    ([status, count]) => {
      const orderStatus = status as OrderStatus;
      const statusInfo = statusConfig[orderStatus];
      return {
        name: statusInfo?.label || status,
        value: count,
      };
    },
  );

  const sourceChartData = Object.entries(charts.sourceDistribution).map(
    ([source, count]) => ({
      name: source,
      value: count,
    }),
  );

  // Pagination
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const paginatedOrders = orders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/dashboard/admin/customers"
            className="text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            <ArrowLeft className="size-4" />
            Customers
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold">{customer.name} Performance</span>
        </div>
        <DateRangePicker />
      </div>
      {/* Customer Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <Avatar className="size-20">
                <AvatarFallback
                  className={`font-bold text-2xl ${getAvatarColor(customer.name)}`}
                >
                  {getInitials(customer.name)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-black">{customer.name}</h1>
                  <Badge
                    variant="outline"
                    className={
                      customer.isActive
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-gray-500/10 text-gray-600 border-gray-500/20"
                    }
                  >
                    {customer.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Phone className="size-4" />
                    <span>{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4" />
                    <span>{customer.whatsapp}</span>
                  </div>
                  {customer.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4" />
                      <span>{customer.location}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>
                    Customer Since:{" "}
                    {customer.firstOrderDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span>•</span>
                  <span>
                    Last Order:{" "}
                    {customer.lastOrderDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleWhatsApp(customer.whatsapp, customer.name)}
              >
                <MessageSquare className="size-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCall(customer.phone)}
              >
                <Phone className="size-4 mr-2" />
                Call
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="size-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Customer Badges */}
          {(insights.badges.isVIP ||
            insights.badges.isRepeat ||
            insights.badges.isAtRisk ||
            insights.badges.isHighValue ||
            insights.badges.isProblematic) && (
            <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t">
              {insights.badges.isVIP && (
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <Star className="size-3 mr-1" />
                  VIP Customer
                </Badge>
              )}
              {insights.badges.isRepeat && (
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                  <Repeat className="size-3 mr-1" />
                  Repeat Customer
                </Badge>
              )}
              {insights.badges.isHighValue && (
                <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                  <Trophy className="size-3 mr-1" />
                  High Value
                </Badge>
              )}
              {insights.badges.isAtRisk && (
                <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                  <AlertTriangle className="size-3 mr-1" />
                  At Risk
                </Badge>
              )}
              {insights.badges.isProblematic && (
                <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                  <XCircle className="size-3 mr-1" />
                  Problematic
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Orders
              </span>
              <ShoppingCart className="size-5 text-primary" />
            </div>
            <span className="text-3xl font-extrabold">{stats.totalOrders}</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Spent
              </span>
              <DollarSign className="size-5 text-emerald-500" />
            </div>
            <span className="text-3xl font-extrabold">
              ₦{Math.round(stats.totalSpent).toLocaleString()}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Avg Order Value
              </span>
              <TrendingUp className="size-5 text-blue-500" />
            </div>
            <span className="text-3xl font-extrabold">
              ₦{Math.round(stats.avgOrderValue).toLocaleString()}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Conversion Rate
              </span>
              <CheckCircle className="size-5 text-emerald-500" />
            </div>
            <span className="text-3xl font-extrabold">
              {stats.conversionRate.toFixed(1)}%
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Days Since Last Order
              </span>
              <Calendar className="size-5 text-primary" />
            </div>
            <span
              className={`text-3xl font-extrabold ${
                stats.daysSinceLastOrder > 30
                  ? "text-orange-500"
                  : "text-foreground"
              }`}
            >
              {stats.daysSinceLastOrder}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Customer Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-bold text-muted-foreground mb-1">
                Purchase Frequency
              </p>
              <p className="text-lg font-bold">
                {insights.purchaseFrequency > 0
                  ? `Orders every ${Math.round(insights.purchaseFrequency)} days`
                  : "First-time customer"}
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground mb-1">
                Preferred Channel
              </p>
              <p className="text-lg font-bold">{insights.preferredSource}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground mb-1">
                Delivery Success Rate
              </p>
              <p className="text-lg font-bold">
                {stats.conversionRate.toFixed(1)}%
              </p>
            </div>
          </div>

          {insights.topProducts.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm font-bold text-muted-foreground mb-3">
                Top Products Purchased
              </p>
              <div className="space-y-2">
                {insights.topProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="size-4 text-muted-foreground" />
                      <span className="font-semibold">{product.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Qty: {product.count}
                      </span>
                      <span className="font-bold">
                        ₦{product.spent.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Orders Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Orders Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyOrdersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Source Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Preferred Order Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sourceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Order History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Order History</CardTitle>
            <p className="text-sm text-muted-foreground">
              {orders.length} total orders
            </p>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Sales Rep</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order) => {
                const orderStatus = order.status as OrderStatus;
                const statusInfo = statusConfig[orderStatus] || {
                  label: order.status,
                  color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
                };

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">
                      #{order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {order.items.length}
                    </TableCell>
                    <TableCell className="font-bold">
                      {getCurrencySymbol(order.currency)}{order.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.source || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.assignedTo?.name || "Unassigned"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleViewDetails(order)}
                      >
                        <Eye className="size-4 mr-2" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, orders.length)} of{" "}
            {orders.length} orders
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

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}

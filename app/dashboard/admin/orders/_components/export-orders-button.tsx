"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  exportToCSV,
  generateFilename,
  formatCurrencyForExport,
  formatDateForExport,
} from "@/lib/export-utils";
import toast from "react-hot-toast";
import type { Currency } from "@prisma/client";

interface Order {
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  city: string;
  state: string;
  status: string;
  source: string;
  totalAmount: number;
  currency: Currency;
  createdAt: Date;
  deliveredAt: Date | null;
  assignedTo: { name: string } | null;
  agent: { name: string } | null;
}

interface Props {
  orders: Order[];
  currency?: Currency;
}

export function ExportOrdersButton({ orders, currency }: Props) {
  const handleExport = () => {
    try {
      const headers = [
        "Order Number",
        "Customer Name",
        "Phone",
        "Address",
        "City",
        "State",
        "Status",
        "Source",
        "Total Amount",
        "Currency",
        "Assigned To",
        "Agent",
        "Created At",
        "Delivered At",
      ];

      const rows = orders.map((order) => [
        order.orderNumber,
        order.customerName,
        order.customerPhone,
        order.deliveryAddress,
        order.city,
        order.state,
        order.status,
        order.source,
        formatCurrencyForExport(order.totalAmount, order.currency),
        order.currency,
        order.assignedTo?.name || "Unassigned",
        order.agent?.name || "Not assigned",
        formatDateForExport(order.createdAt),
        order.deliveredAt ? formatDateForExport(order.deliveredAt) : "N/A",
      ]);

      const currencySuffix = currency ? `_${currency}` : "";
      const filename = generateFilename(`orders${currencySuffix}`);
      exportToCSV(headers, rows, filename);
      toast.success(`Exported ${orders.length} orders successfully!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export orders");
    }
  };

  return (
    <Button onClick={handleExport}>
      <Download className="size-4 mr-2" />
      Export CSV
    </Button>
  );
}

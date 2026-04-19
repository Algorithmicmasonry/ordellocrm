"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  exportToCSV,
  generateFilename,
  formatCurrencyForExport,
} from "@/lib/export-utils";
import toast from "react-hot-toast";

interface Agent {
  id: string;
  name: string;
  phone: string;
  location: string;
  address: string | null;
  isActive: boolean;
  stockValue: number;
  successRate: number;
  status: string;
  totalOrders: number;
  deliveredOrders: number;
}

interface ExportAgentsButtonProps {
  agents: Agent[];
}

export function ExportAgentsButton({ agents }: ExportAgentsButtonProps) {
  const handleExport = () => {
    try {
      const headers = [
        "Name",
        "Phone",
        "Location",
        "Address",
        "Status",
        "Active",
        "Stock Value",
        "Success Rate",
        "Total Orders",
        "Delivered Orders",
      ];

      const rows = agents.map((agent) => [
        agent.name,
        agent.phone,
        agent.location,
        agent.address || "N/A",
        agent.status.replace("-", " ").toUpperCase(),
        agent.isActive ? "Yes" : "No",
        formatCurrencyForExport(agent.stockValue),
        `${agent.successRate.toFixed(1)}%`,
        agent.totalOrders.toString(),
        agent.deliveredOrders.toString(),
      ]);

      const filename = generateFilename("agents");
      exportToCSV(headers, rows, filename);

      toast.success(`Exported ${agents.length} agents successfully!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export agents");
    }
  };

  return (
    <Button onClick={handleExport}>
      <Download className="size-4 mr-2" />
      Export CSV
    </Button>
  );
}

"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getInitials } from "@/lib/utils";
import { Agent as PrismaAgent } from "@prisma/client";
import { ChevronDown, Circle, MoreVertical, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { createSettlement } from "@/app/actions/agents";
import { toggleAgentStatus } from "../actions";
import { AddAgentModal } from "./add-agent-modal";
import { AssignStockModal } from "./assign-stock-modal";
import { DeleteAgentDialog } from "./delete-agent-dialog";
import { EditAgentModal } from "./edit-agent-modal";
import { SettlementDialog } from "./settlement-dialog";

type AgentStatus = "active" | "order-in-progress" | "inactive";

interface Agent {
  id: string;
  name: string;
  phone: string;
  location: string;
  address: string | null;
  isActive: boolean;
  stockValue: number;
  successRate: number;
  status: AgentStatus;
  totalOrders: number;
  deliveredOrders: number;
}

interface AgentsTableProps {
  agents: Agent[];
  zones: string[];
  basePath?: string; // e.g., "/dashboard/admin" or "/dashboard/inventory"
}

const getStatusBadge = (status: AgentStatus) => {
  const statusConfig = {
    active: {
      label: "Active",
      variant: "default" as const,
      className:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    inactive: {
      label: "Inactive",
      variant: "secondary" as const,
      className: "",
    },
    "order-in-progress": {
      label: "Order in Progress",
      variant: "default" as const,
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
  };

  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={config.className}>
      <Circle className="w-2 h-2 mr-1.5 fill-current" />
      {config.label}
    </Badge>
  );
};

const getProgressTextColor = (rate: number) => {
  if (rate >= 90) return "text-foreground";
  if (rate >= 80) return "text-amber-600";
  return "text-red-600";
};

// Helper to convert Agent to PrismaAgent for modals
// Note: createdAt/updatedAt are mock values - modals don't actually use these fields
const toPrismaAgent = (agent: Agent | null): PrismaAgent | null => {
  if (!agent) return null;
  return {
    id: agent.id,
    organizationId: "",
    name: agent.name,
    phone: agent.phone,
    location: agent.location,
    address: agent.address,
    isActive: agent.isActive,
    whatsappGroupId: null,
    coverageAreas: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export function AgentsTable({ agents, zones, basePath = "/dashboard/admin" }: AgentsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const router = useRouter();

  // Filter agents
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.phone.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesZone =
      selectedZone === "all" ||
      agent.location.toLowerCase().includes(selectedZone.toLowerCase());

    const matchesStatus =
      selectedStatus === "all" || agent.status === selectedStatus;

    return matchesSearch && matchesZone && matchesStatus;
  });

  const handleToggleStatus = async (agentId: string) => {
    try {
      const result = await toggleAgentStatus(agentId);
      if (result.success) {
        toast.success("Agent status updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update agent status");
      }
    } catch (error) {
      toast.error("An error occurred while updating agent status");
    }
  };

  const handleSettlementSubmit = async (data: {
    agentId: string;
    stockValue: number;
    cashCollected: number;
    cashReturned: number;
    adjustments: number;
    notes?: string;
    settledBy: string;
  }) => {
    return await createSettlement(data);
  };

  // Calculate pending deliveries for an agent
  const getPendingDeliveries = (agent: Agent) => {
    // This would need to be calculated from the agent's orders
    // For now, returning 0 as a placeholder
    // TODO: Pass this data from the parent component or fetch it
    return 0;
  };

  return (
    <div className="space-y-4">
      {/* Action Bar & Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name or phone..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Zone:{" "}
                      {selectedZone === "all"
                        ? "All"
                        : zones.find((z) => z === selectedZone) || "All"}
                      <ChevronDown className="ml-2 w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSelectedZone("all")}>
                      All Zones
                    </DropdownMenuItem>
                    {zones.map((zone) => (
                      <DropdownMenuItem
                        key={zone}
                        onClick={() => setSelectedZone(zone)}
                      >
                        {zone}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Status:{" "}
                      {selectedStatus === "all"
                        ? "All"
                        : selectedStatus
                            .split("-")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1),
                            )
                            .join(" ")}
                      <ChevronDown className="ml-2 w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSelectedStatus("all")}>
                      All Status
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedStatus("active")}
                    >
                      Active
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedStatus("order-in-progress")}
                    >
                      Order in Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedStatus("inactive")}
                    >
                      Inactive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Agent
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent Details</TableHead>
              <TableHead>Primary Zone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Success Rate</TableHead>
              <TableHead>Stock Value</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAgents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">No agents found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredAgents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(agent.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p
                          className="font-bold cursor-pointer hover:text-primary transition-colors"
                          onClick={() =>
                            router.push(`${basePath}/agents/${agent.id}`)
                          }
                        >
                          {agent.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {agent.phone}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {agent.location}
                  </TableCell>
                  <TableCell>{getStatusBadge(agent.status)}</TableCell>
                  <TableCell>
                    <div className="w-full max-w-[120px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${getProgressTextColor(
                            agent.successRate,
                          )}`}
                        >
                          {agent.successRate}%
                        </span>
                      </div>
                      <Progress value={agent.successRate} className="h-1.5" />
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    ₦{agent.stockValue.toLocaleString()} <span className="text-xs text-muted-foreground">(NGN)</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`${basePath}/agents/${agent.id}`)
                          }
                        >
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedAgent(agent);
                            setShowStockModal(true);
                          }}
                        >
                          Assign Stock
                        </DropdownMenuItem>
                        {agent.stockValue > 0 && (
                          <DropdownMenuItem
                            onClick={() => {
                              // Navigate to agent detail page for stock reconciliation
                              // ReconcileStockModal requires full stock details with products
                              router.push(
                                `${basePath}/agents/${agent.id}?tab=stock`,
                              );
                            }}
                          >
                            Reconcile Stock
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedAgent(agent);
                            setShowEditModal(true);
                          }}
                        >
                          Edit Agent
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className={
                            agent.isActive ? "text-red-600" : "text-green-600"
                          }
                          onClick={() => handleToggleStatus(agent.id)}
                        >
                          {agent.isActive ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setSelectedAgent(agent);
                            setShowDeleteDialog(true);
                          }}
                        >
                          Delete Agent
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Results Summary */}
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <p className="text-sm text-muted-foreground font-medium">
            Showing {filteredAgents.length} of {agents.length} agents
          </p>
        </div>
      </Card>

      {/* Modals */}
      <AddAgentModal open={showAddModal} onOpenChange={setShowAddModal} />
      <EditAgentModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        agent={toPrismaAgent(selectedAgent)}
      />
      <DeleteAgentDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        agent={toPrismaAgent(selectedAgent)}
      />
      <AssignStockModal
        open={showStockModal}
        onOpenChange={setShowStockModal}
        agent={toPrismaAgent(selectedAgent)}
      />
      <SettlementDialog
        open={showSettlementDialog}
        onOpenChange={setShowSettlementDialog}
        agent={toPrismaAgent(selectedAgent)}
        stockValue={selectedAgent?.stockValue || 0}
        pendingDeliveries={
          selectedAgent ? getPendingDeliveries(selectedAgent) : 0
        }
        onSubmit={handleSettlementSubmit}
      />
    </div>
  );
}

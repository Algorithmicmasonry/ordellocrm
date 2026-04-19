"use client";

import { Agent } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  Package,
  Edit,
} from "lucide-react";
import Link from "next/link";
import { getInitials } from "@/lib/utils";
import { PeriodFilter } from "@/app/dashboard/admin/_components/period-filter";
import { CurrencyFilter } from "@/app/dashboard/admin/_components/currency-filter";
import { useRouter } from "next/navigation";

type TimePeriod = "week" | "month" | "year";

interface AgentProfileHeaderProps {
  agent: Agent;
  period: TimePeriod;
  onAssignStock?: () => void;
  onEdit?: () => void;
}

export function AgentProfileHeader({
  agent,
  period,
  onAssignStock,
  onEdit,
}: AgentProfileHeaderProps) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      {/* Back Button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()} // Triggers browser back navigation
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Agents
        </Button>
      </div>

      {/* Profile Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">
              {getInitials(agent.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              <Badge
                variant={agent.isActive ? "default" : "secondary"}
                className={
                  agent.isActive
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : ""
                }
              >
                {agent.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
                <span>{agent.phone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>{agent.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>
                  Joined {new Date(agent.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <PeriodFilter currentPeriod={period} />
          <CurrencyFilter />
          <Button variant="outline" size="sm" onClick={onAssignStock}>
            <Package className="w-4 h-4 mr-2" />
            Assign Stock
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

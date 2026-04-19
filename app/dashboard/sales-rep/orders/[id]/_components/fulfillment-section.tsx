"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCheck, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect, useTransition } from "react";
import { getAvailableAgents, assignAgent, updateDeliverySlot } from "../actions";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { Order, Agent } from "@prisma/client";

interface FulfillmentSectionProps {
  order: Order & { agent: Agent | null };
}

export function FulfillmentSection({ order }: FulfillmentSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [agents, setAgents] = useState<{ id: string; name: string; location: string }[]>([]);
  const [matchingCount, setMatchingCount] = useState(0);
  const [selectedAgentId, setSelectedAgentId] = useState(order.agentId || "");
  const [selectedDeliverySlot, setSelectedDeliverySlot] = useState(
    order.deliverySlot || "immediate"
  );
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoadingAgents(true);
      const result = await getAvailableAgents(order.city);
      if (result.success && result.data) {
        setAgents(result.data.agents);
        setMatchingCount(result.data.matchingCount);
      }
      setIsLoadingAgents(false);
    };

    fetchAgents();
  }, [order.city]);

  const handleAssignAgent = () => {
    if (!selectedAgentId) {
      toast.error("Please select an agent");
      return;
    }

    startTransition(async () => {
      const result = await assignAgent(
        order.id,
        selectedAgentId,
        selectedDeliverySlot
      );

      if (result.success) {
        toast.success("Agent assigned successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to assign agent");
      }
    });
  };

  const handleDeliverySlotChange = (slot: string) => {
    setSelectedDeliverySlot(slot);

    // If agent is already assigned, update delivery slot immediately
    if (order.agentId) {
      startTransition(async () => {
        const result = await updateDeliverySlot(order.id, slot);
        if (result.success) {
          toast.success("Delivery slot updated");
          router.refresh();
        } else {
          toast.error(result.error || "Failed to update delivery slot");
        }
      });
    }
  };

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="size-5 text-primary" />
          <h3 className="font-bold">Fulfillment Assignment</h3>
        </div>

        {/* Warning if no agents in area */}
        {!isLoadingAgents && matchingCount === 0 && agents.length > 0 && (
          <Alert className="mb-4 border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
            <AlertCircle className="size-4 text-amber-500" />
            <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
              No agents found in {order.city}. Showing all available agents.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Agent Selection */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agent" className="text-xs font-bold uppercase">
              Assign Agent
            </Label>
            <Select
              value={selectedAgentId}
              onValueChange={setSelectedAgentId}
              disabled={isPending || isLoadingAgents}
            >
              <SelectTrigger id="agent">
                <SelectValue
                  placeholder={
                    isLoadingAgents
                      ? "Loading agents..."
                      : "Select available agent..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {agents.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No agents available
                  </SelectItem>
                ) : (
                  agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name} - {agent.location}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground font-medium">
              {matchingCount > 0
                ? `${matchingCount} agent${matchingCount > 1 ? "s" : ""} in ${order.city}`
                : `Showing all ${agents.length} agents`}
            </p>
          </div>

          {/* Delivery Slot */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delivery-slot" className="text-xs font-bold uppercase">
              Delivery Slot
            </Label>
            <Select
              value={selectedDeliverySlot}
              onValueChange={handleDeliverySlotChange}
              disabled={isPending}
            >
              <SelectTrigger id="delivery-slot">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate / ASAP</SelectItem>
                <SelectItem value="morning">Morning (8AM - 12PM)</SelectItem>
                <SelectItem value="afternoon">Afternoon (1PM - 5PM)</SelectItem>
                <SelectItem value="evening">Evening (6PM - 9PM)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Current Assignment */}
        {order.agent && (
          <div className="mt-4 p-3 bg-background rounded-lg border">
            <p className="text-xs text-muted-foreground font-bold uppercase mb-1">
              Currently Assigned
            </p>
            <p className="text-sm font-semibold">
              {order.agent.name} - {order.agent.location}
            </p>
          </div>
        )}

        {/* Assign Button */}
        {selectedAgentId !== order.agentId && (
          <Button
            onClick={handleAssignAgent}
            disabled={isPending || !selectedAgentId}
            className="w-full mt-4"
          >
            {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
            {order.agentId ? "Reassign Agent" : "Assign Agent"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

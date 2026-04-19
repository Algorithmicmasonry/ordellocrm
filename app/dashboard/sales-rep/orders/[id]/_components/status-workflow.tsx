"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, Package, Truck, Home, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { Order, OrderStatus } from "@prisma/client";

interface StatusWorkflowProps {
  order: Order;
}

const statusConfig = {
  NEW: { label: "New Order", icon: Package, step: 0 },
  CONFIRMED: { label: "Confirmed", icon: Check, step: 1 },
  DISPATCHED: { label: "Dispatched", icon: Truck, step: 2 },
  DELIVERED: { label: "Delivered", icon: Home, step: 3 },
};

export function StatusWorkflow({ order }: StatusWorkflowProps) {
  const currentStep = statusConfig[order.status as keyof typeof statusConfig]?.step ?? 0;
  const steps = [
    {
      status: "CONFIRMED",
      label: "Confirmed",
      icon: Check,
      date: order.confirmedAt,
    },
    {
      status: "PROCESSING",
      label: "In Process",
      icon: Loader2,
      date: order.confirmedAt, // Use confirmed date as processing start
      isProcessing: order.status === "CONFIRMED",
    },
    {
      status: "DISPATCHED",
      label: "Dispatched",
      icon: Truck,
      date: order.dispatchedAt,
    },
    {
      status: "DELIVERED",
      label: "Delivered",
      icon: Home,
      date: order.deliveredAt,
    },
  ];

  const getStepStatus = (stepIndex: number) => {
    if (order.status === "CANCELLED" || order.status === "POSTPONED") {
      return stepIndex === 0 ? "completed" : "pending";
    }

    if (order.status === "CONFIRMED") {
      if (stepIndex === 0) return "completed";
      if (stepIndex === 1) return "active";
      return "pending";
    }

    if (order.status === "DISPATCHED") {
      if (stepIndex <= 2) return "completed";
      return "pending";
    }

    if (order.status === "DELIVERED") {
      return "completed";
    }

    return "pending";
  };

  // Calculate progress percentage
  const progressPercentage =
    order.status === "DELIVERED"
      ? 100
      : order.status === "DISPATCHED"
      ? 66
      : order.status === "CONFIRMED"
      ? 25
      : 0;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <h3 className="font-bold mb-8">Status Workflow</h3>

        <div className="relative flex justify-between items-start">
          {/* Progress Line Background */}
          <div className="absolute top-5 left-0 w-full h-0.5 bg-muted z-0"></div>
          {/* Progress Line Filled */}
          <div
            className="absolute top-5 left-0 h-0.5 bg-primary z-0 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>

          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const Icon = step.icon;

            return (
              <div
                key={step.status}
                className="relative z-10 flex flex-col items-center gap-2 flex-1"
              >
                {/* Step Icon */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                    status === "completed" &&
                      "bg-primary text-white shadow-lg shadow-primary/30",
                    status === "active" &&
                      "bg-primary/20 border-2 border-primary text-primary",
                    status === "pending" &&
                      "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-5",
                      step.isProcessing && status === "active" && "animate-spin"
                    )}
                  />
                </div>

                {/* Step Label */}
                <div className="text-center">
                  <p
                    className={cn(
                      "text-sm font-bold",
                      status === "completed" && "text-foreground",
                      status === "active" && "text-primary",
                      status === "pending" && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {step.date
                      ? format(new Date(step.date), "MMM dd, h:mm a")
                      : status === "active"
                      ? "In Progress"
                      : "Pending"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

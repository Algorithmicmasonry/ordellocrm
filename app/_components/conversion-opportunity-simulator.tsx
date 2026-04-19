"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Currency } from "@prisma/client";
import { formatCurrency } from "@/lib/currency";

interface ConversionOpportunitySimulatorProps {
  title: string;
  description: string;
  valueLabel: "Revenue" | "Commission";
  audienceLabel: "The business" | "You";
  currency: Currency;
  totalOrders: number;
  currentConversionRate: number;
  currentDeliveredOrders: number;
  currentValue: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ConversionOpportunitySimulator({
  title,
  description,
  valueLabel,
  audienceLabel,
  currency,
  totalOrders,
  currentConversionRate,
  currentDeliveredOrders,
  currentValue,
}: ConversionOpportunitySimulatorProps) {
  const normalizedOrders = Math.max(0, totalOrders);
  const normalizedRate = clamp(currentConversionRate, 0, 100);
  const normalizedDelivered = clamp(currentDeliveredOrders, 0, normalizedOrders);

  const minTarget = Math.ceil(normalizedRate);
  const [targetRate, setTargetRate] = useState(minTarget);

  const averagePerDelivered = useMemo(() => {
    if (normalizedDelivered > 0) {
      return currentValue / normalizedDelivered;
    }

    if (normalizedOrders > 0) {
      return currentValue / normalizedOrders;
    }

    return 0;
  }, [currentValue, normalizedDelivered, normalizedOrders]);

  const projectedDelivered = Math.round((targetRate / 100) * normalizedOrders);
  const projectedValue = projectedDelivered * averagePerDelivered;
  const uplift = Math.max(0, projectedValue - currentValue);
  const additionalDelivered = Math.max(0, projectedDelivered - normalizedDelivered);
  const deltaRate = Math.max(0, targetRate - normalizedRate);

  const presetRates = useMemo(() => {
    const increments = [10, 20, 30];
    const generated = increments.map((inc) =>
      clamp(Math.round(normalizedRate + inc), minTarget, 100)
    );
    const all = Array.from(new Set([...generated, 100]));
    return all.filter((rate) => rate >= minTarget);
  }, [normalizedRate, minTarget]);

  const cannotProject = normalizedOrders === 0;

  return (
    <Card className="border-primary/20">
      <CardHeader className="space-y-2">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Current Conversion
            </p>
            <p className="mt-1 text-2xl font-bold">{normalizedRate.toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Current {valueLabel}
            </p>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(currentValue, currency)}
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Target conversion rate</p>
            <Badge variant="secondary">{targetRate}%</Badge>
          </div>

          <Slider
            min={minTarget}
            max={100}
            step={1}
            value={[targetRate]}
            onValueChange={(value) => setTargetRate(value[0] ?? minTarget)}
            disabled={cannotProject}
          />

          <div className="flex flex-wrap gap-2">
            {presetRates.map((rate) => (
              <Button
                key={rate}
                type="button"
                size="sm"
                variant={rate === targetRate ? "default" : "outline"}
                onClick={() => setTargetRate(rate)}
                disabled={cannotProject}
              >
                {rate === 100 ? "100%" : `+${Math.max(0, rate - normalizedRate).toFixed(0)}pp`}
              </Button>
            ))}
          </div>
        </div>

        {cannotProject ? (
          <p className="text-sm text-muted-foreground">
            Opportunity projection appears when there are orders in the selected period.
          </p>
        ) : (
          <div className="space-y-2 rounded-lg bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary">
              {audienceLabel} is leaving {formatCurrency(uplift, currency)} in {valueLabel.toLowerCase()} on the table this period.
            </p>
            <p className="text-sm text-muted-foreground">
              You would have made {formatCurrency(projectedValue, currency)} total if you had closed {additionalDelivered} more orders ({deltaRate.toFixed(1)} percentage points higher conversion).
            </p>
            <p className="text-xs text-muted-foreground">
              Projection: {projectedDelivered} delivered out of {normalizedOrders} total orders at {targetRate}% conversion.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

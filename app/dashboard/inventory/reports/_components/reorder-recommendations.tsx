"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Clock,
  Package,
  ShoppingCart,
  CheckCircle,
} from "lucide-react";

interface Recommendation {
  productId: string;
  productName: string;
  sku: string | null;
  currentStock: number;
  reorderPoint: number;
  recommendedOrderQty: number;
  estimatedCost: number;
  daysUntilStockout: number;
  urgency: "critical" | "high" | "medium";
}

interface ReorderRecommendationsProps {
  recommendations: Recommendation[];
}

export function ReorderRecommendations({
  recommendations,
}: ReorderRecommendationsProps) {
  const criticalItems = recommendations.filter((r) => r.urgency === "critical");
  const highUrgency = recommendations.filter((r) => r.urgency === "high");
  const mediumUrgency = recommendations.filter((r) => r.urgency === "medium");

  const totalReorderCost = recommendations.reduce(
    (sum, rec) => sum + rec.estimatedCost,
    0,
  );

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-500";
      case "high":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-500";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-500";
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return <AlertTriangle className="size-5 text-red-600" />;
      case "high":
        return <Clock className="size-5 text-amber-600" />;
      default:
        return <Package className="size-5 text-blue-600" />;
    }
  };

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="size-12 text-green-600 mb-3" />
          <p className="text-lg font-semibold">All Stock Levels Optimal</p>
          <p className="text-sm text-muted-foreground mt-1">
            No reorder recommendations at this time
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Total Recommendations
              </p>
              <ShoppingCart className="size-5 text-primary" />
            </div>
            <p className="text-3xl font-bold">{recommendations.length}</p>
          </CardContent>
        </Card>

        <Card className="border-red-500/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Critical (Out of Stock)
              </p>
              <AlertTriangle className="size-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600">
              {criticalItems.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                High Urgency
              </p>
              <Clock className="size-5 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {highUrgency.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Estimated Cost
              </p>
              <Package className="size-5 text-primary" />
            </div>
            <p className="text-3xl font-bold">
              ₦{totalReorderCost.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {recommendations.map((rec) => (
          <Card
            key={rec.productId}
            className={`border-l-4 ${getUrgencyColor(rec.urgency)}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getUrgencyIcon(rec.urgency)}
                  <div className="flex-1">
                    <CardTitle className="text-lg">{rec.productName}</CardTitle>
                    {rec.sku && (
                      <p className="text-sm text-muted-foreground mt-1">
                        SKU: {rec.sku}
                      </p>
                    )}
                  </div>
                </div>
                <Badge
                  className={
                    rec.urgency === "critical"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      : rec.urgency === "high"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  }
                >
                  {rec.urgency.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Current Stock
                  </p>
                  <p className="text-lg font-bold">{rec.currentStock}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Reorder Point
                  </p>
                  <p className="text-lg font-bold">{rec.reorderPoint}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Recommended Qty
                  </p>
                  <p className="text-lg font-bold text-primary">
                    {rec.recommendedOrderQty}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Estimated Cost
                  </p>
                  <p className="text-lg font-bold">
                    ₦{rec.estimatedCost.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Days Until Stockout
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      rec.daysUntilStockout === 0
                        ? "text-red-600"
                        : rec.daysUntilStockout < 7
                          ? "text-amber-600"
                          : "text-green-600"
                    }`}
                  >
                    {rec.daysUntilStockout === 0
                      ? "OUT"
                      : `${rec.daysUntilStockout} days`}
                  </p>
                </div>
              </div>
              <Button className="w-full" size="sm">
                Create Purchase Order
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

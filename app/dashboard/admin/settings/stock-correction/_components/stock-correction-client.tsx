"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Wrench,
  PackageCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  applyStockCorrections,
  type StockCorrection,
} from "@/app/actions/stock-correction";

interface StockCorrectionClientProps {
  preview: {
    success: boolean;
    error?: string;
    data?: {
      corrections: StockCorrection[];
      totalOrders: number;
      affectedProducts: number;
    };
  };
}

export function StockCorrectionClient({
  preview,
}: StockCorrectionClientProps) {
  const [isPending, startTransition] = useTransition();
  const [applied, setApplied] = useState(false);
  const [results, setResults] = useState<
    { productName: string; before: number; after: number }[] | null
  >(null);

  if (!preview.success || !preview.data) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6">
          <p className="text-destructive">
            {preview.error || "Failed to load correction preview."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { corrections, totalOrders, affectedProducts } = preview.data;

  const handleApply = () => {
    startTransition(async () => {
      const result = await applyStockCorrections();

      if (result.success && result.data) {
        setApplied(true);
        setResults(result.data.results);
        toast.success(
          `Successfully corrected ${result.data.correctedProducts} product(s)`,
        );
      } else {
        toast.error(result.error || "Failed to apply corrections");
      }
    });
  };

  // Already applied
  if (applied && results) {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-5" />
            Corrections Applied Successfully
          </CardTitle>
          <CardDescription>
            The following products have been corrected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Before</TableHead>
                <TableHead className="text-center" />
                <TableHead className="text-right">After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r.productName}>
                  <TableCell className="font-medium">
                    {r.productName}
                  </TableCell>
                  <TableCell className="text-right text-destructive font-mono">
                    {r.before}
                  </TableCell>
                  <TableCell className="text-center">
                    <ArrowRight className="size-4 mx-auto text-muted-foreground" />
                  </TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-400 font-mono font-semibold">
                    {r.after}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground mt-4">
            Inventory levels have been corrected. You can verify in the{" "}
            <a
              href="/dashboard/admin/inventory"
              className="text-primary underline"
            >
              Inventory page
            </a>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  // No corrections needed
  if (corrections.length === 0) {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <PackageCheck className="size-5" />
            No Corrections Needed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No products with negative warehouse stock were found.
            {totalOrders > 0 && (
              <span>
                {" "}
                ({totalOrders} delivered agent order(s) were checked.)
              </span>
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Preview with apply button
  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-5" />
            {affectedProducts} Product(s) Need Correction
          </CardTitle>
          <CardDescription>
            Found {totalOrders} delivered agent order(s) that caused
            double-deductions. The following products have negative warehouse
            stock and need to be corrected.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Correction Details */}
      <Card>
        <CardHeader>
          <CardTitle>Correction Preview</CardTitle>
          <CardDescription>
            Review the changes below before applying. This will add back the
            incorrectly deducted quantities to each product&apos;s warehouse stock.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Adjustment</TableHead>
                <TableHead className="text-right">Corrected Stock</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {corrections.map((c) => (
                <TableRow key={c.productId}>
                  <TableCell className="font-medium">
                    {c.productName}
                  </TableCell>
                  <TableCell className="text-right text-destructive font-mono font-semibold">
                    {c.currentStockBefore}
                  </TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-400 font-mono">
                    +{c.adjustment}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {c.correctedStock}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px]">
                    {c.details}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Apply Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleApply}
          disabled={isPending}
        >
          <Wrench className="size-4 mr-2" />
          {isPending ? "Applying Corrections..." : "Apply Corrections"}
        </Button>
      </div>
    </div>
  );
}

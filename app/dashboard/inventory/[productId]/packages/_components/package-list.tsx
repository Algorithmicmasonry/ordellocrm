"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deletePackage,
  togglePackageStatus,
} from "@/app/actions/packages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrencySymbol } from "@/lib/currency";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { EditPackageDialog } from "./edit-package-dialog";
import type { ProductPackage } from "@prisma/client";

interface PackageListProps {
  packages: ProductPackage[];
  productId: string;
}

export function PackageList({ packages, productId }: PackageListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleToggleStatus(packageId: string) {
    setTogglingId(packageId);
    const result = await togglePackageStatus(packageId);

    if (result.success) {
      toast.success(
        `Package ${result.data?.isActive ? "activated" : "deactivated"}`,
      );
      router.refresh();
    } else {
      toast.error(result.error || "Failed to toggle package status");
    }

    setTogglingId(null);
  }

  async function handleDelete(packageId: string) {
    const result = await deletePackage(packageId);

    if (result.success) {
      toast.success("Package deleted successfully");
      router.refresh();
      setDeletingId(null);
    } else {
      toast.error(result.error || "Failed to delete package");
    }
  }

  if (packages.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {packages.map((pkg) => (
            <TableRow key={pkg.id}>
              <TableCell className="font-mono text-muted-foreground">
                {pkg.displayOrder}
              </TableCell>
              <TableCell className="font-medium">{pkg.name}</TableCell>
              <TableCell className="max-w-xs">
                {pkg.description ? (
                  <span className="text-sm text-muted-foreground line-clamp-2">
                    {pkg.description}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground italic">
                    No description
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">{pkg.quantity}</TableCell>
              <TableCell className="text-right font-medium">
                {getCurrencySymbol(pkg.currency)}
                {pkg.price.toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono">
                  {pkg.currency}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={pkg.isActive ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => handleToggleStatus(pkg.id)}
                >
                  {togglingId === pkg.id
                    ? "..."
                    : pkg.isActive
                      ? "Active"
                      : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <EditPackageDialog package={pkg} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeletingId(pkg.id)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={() => setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this package? This action cannot
              be undone. Orders that have already been placed with this package
              will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

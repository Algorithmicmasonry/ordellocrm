"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { getPackagesForProducts, updateOrderItems } from "../[id]/actions";
import type { OrderWithRelations } from "./orders-table";
import { getCurrencySymbol } from "@/lib/currency";
import type { ProductPackage } from "@prisma/client";

const NON_EDITABLE = ["DELIVERED", "CANCELLED"];

interface EditOrderItemsModalProps {
  order: OrderWithRelations | null;
  open: boolean;
  onClose: () => void;
}

export function EditOrderItemsModal({
  order,
  open,
  onClose,
}: EditOrderItemsModalProps) {
  const router = useRouter();
  const [packagesByProduct, setPackagesByProduct] = useState<
    Record<string, ProductPackage[]>
  >({});
  const [selectedPackages, setSelectedPackages] = useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !order) return;

    const productIds = order.items.map((i) => i.productId);
    if (productIds.length === 0) return;

    setIsLoading(true);
    getPackagesForProducts(productIds).then((result) => {
      if (result.success) {
        setPackagesByProduct(result.data);

        // Pre-select the current package per item by matching quantity and price
        const initial: Record<string, string> = {};
        for (const item of order.items) {
          const pkgs = result.data[item.productId] ?? [];
          const currentPackagePrice = item.price * item.quantity;
          const matched = pkgs.find(
            (p) =>
              p.quantity === item.quantity &&
              Math.abs(p.price - currentPackagePrice) < 0.01
          );
          if (matched) initial[item.id] = matched.id;
        }
        setSelectedPackages(initial);
      } else {
        toast.error(result.error || "Failed to load packages");
      }
      setIsLoading(false);
    });
  }, [open, order]);

  const handleClose = () => {
    setPackagesByProduct({});
    setSelectedPackages({});
    onClose();
  };

  const newTotal =
    order?.items.reduce((sum, item) => {
      const pkgId = selectedPackages[item.id];
      const pkgs = packagesByProduct[item.productId] ?? [];
      const pkg = pkgs.find((p) => p.id === pkgId);
      return sum + (pkg ? pkg.price : item.price * item.quantity);
    }, 0) ?? 0;

  const handleSave = async () => {
    if (!order) return;

    const changes = Object.entries(selectedPackages).map(
      ([itemId, packageId]) => ({ itemId, packageId })
    );

    if (changes.length === 0) {
      toast.error("Select at least one package to change");
      return;
    }

    setIsSaving(true);
    const result = await updateOrderItems(order.id, changes);
    setIsSaving(false);

    if (result.success) {
      toast.success("Order updated");
      handleClose();
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update order");
    }
  };

  if (!order) return null;

  const currencySymbol = getCurrencySymbol(order.currency);
  const canEdit = !NON_EDITABLE.includes(order.status);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }} modal={false}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Items — Order #{order.orderNumber}</DialogTitle>
        </DialogHeader>

        {!canEdit ? (
          <p className="text-sm text-muted-foreground py-4">
            This order is <span className="capitalize">{order.status.toLowerCase()}</span> and cannot be edited.
          </p>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Loading packages...</span>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {order.items.map((item) => {
              const pkgs = packagesByProduct[item.productId] ?? [];
              const currentPackagePrice = item.price * item.quantity;

              return (
                <div key={item.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Current: {currencySymbol}
                      {currentPackagePrice.toLocaleString()}
                    </p>
                  </div>

                  {pkgs.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No packages configured — cannot change this item.
                    </p>
                  ) : (
                    <Select
                      value={selectedPackages[item.id] ?? ""}
                      onValueChange={(val) =>
                        setSelectedPackages((prev) => ({
                          ...prev,
                          [item.id]: val,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a package" />
                      </SelectTrigger>
                      <SelectContent>
                        {pkgs.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.name} — {currencySymbol}
                            {pkg.price.toLocaleString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })}

            <div className="rounded-lg bg-muted/50 border p-4 flex items-center justify-between">
              <p className="text-sm font-medium">New Order Total</p>
              <p className="text-lg font-bold">
                {currencySymbol}{newTotal.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          {canEdit && !isLoading && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

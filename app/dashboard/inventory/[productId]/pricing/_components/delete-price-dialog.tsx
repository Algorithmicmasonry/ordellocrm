"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { deleteProductPrice } from "@/app/actions/product-prices";
import { getCurrencyName } from "@/lib/currency";
import type { ProductPrice } from "@prisma/client";

interface DeletePriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  price: ProductPrice;
}

export function DeletePriceDialog({
  open,
  onOpenChange,
  productId,
  productName,
  price,
}: DeletePriceDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteProductPrice(productId, price.currency);

      if (result.success) {
        toast.success(`${price.currency} pricing deleted successfully!`);
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to delete pricing");
      }
    } catch (error) {
      console.error("Error deleting price:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {getCurrencyName(price.currency)} Pricing</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the {getCurrencyName(price.currency)} pricing for{" "}
            {productName}?
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            This action cannot be undone. Deleting this pricing will prevent:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Creating new {price.currency} packages</li>
              <li>Showing this product in {price.currency} order forms</li>
            </ul>
            <p className="mt-2 font-semibold">
              Any existing {price.currency} packages will need to be deleted first.
            </p>
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="size-4 mr-2 animate-spin" />}
            Delete Pricing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PackageForm } from "./package-form";
import type { ProductPackage, ProductPackageComponent, Product, Currency } from "@prisma/client";

type PackageWithComponents = ProductPackage & {
  components: Array<
    ProductPackageComponent & {
      product: Pick<Product, "id" | "name" | "isActive" | "isDeleted">;
    }
  >;
};

interface EditPackageDialogProps {
  package: PackageWithComponents;
  companionProducts: Array<{ id: string; name: string; currency: Currency }>;
}

export function EditPackageDialog({ package: pkg, companionProducts }: EditPackageDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Pencil className="size-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Package</DialogTitle>
          <DialogDescription>
            Update the package details and pricing.
          </DialogDescription>
        </DialogHeader>
        <PackageForm
          productId={pkg.productId}
          package={pkg}
          companionProducts={companionProducts}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

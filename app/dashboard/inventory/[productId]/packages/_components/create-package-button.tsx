"use client";

import { useState } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PackageForm } from "./package-form";
import type { Currency } from "@prisma/client";
import Link from "next/link";

interface CreatePackageButtonProps {
  productId: string;
  availableCurrencies: Currency[];
}

export function CreatePackageButton({
  productId,
  availableCurrencies,
}: CreatePackageButtonProps) {
  const [open, setOpen] = useState(false);
  const hasPricing = availableCurrencies.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" disabled={!hasPricing}>
          <Plus className="size-4" />
          Create Package
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Package</DialogTitle>
          <DialogDescription>
            Create a new package option for customers to select during checkout.
          </DialogDescription>
        </DialogHeader>

        {!hasPricing ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">No Pricing Configured</p>
              <p className="text-sm mb-3">
                You must add pricing in at least one currency before creating packages.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/admin/inventory/${productId}/pricing`}>
                  Add Pricing First
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <PackageForm
            productId={productId}
            availableCurrencies={availableCurrencies}
            onSuccess={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

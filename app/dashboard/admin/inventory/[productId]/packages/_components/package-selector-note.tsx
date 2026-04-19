"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updatePackageSelectorNote } from "@/app/actions/products";

interface PackageSelectorNoteProps {
  productId: string;
  currentNote: string | null;
}

export function PackageSelectorNote({ productId, currentNote }: PackageSelectorNoteProps) {
  const router = useRouter();
  const [note, setNote] = useState(currentNote || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave() {
    setIsSubmitting(true);

    const result = await updatePackageSelectorNote(productId, note || null);

    if (result.success) {
      toast.success("Package selector note updated successfully");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update note");
    }

    setIsSubmitting(false);
  }

  const hasChanged = note !== (currentNote || "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="size-5 text-primary" />
          General Package Description
        </CardTitle>
        <CardDescription>
          This description will appear above all package options on the order form.
          Use it to provide important information that applies to all packages
          (e.g., "NOTE: ONE BOX CONTAINS 10PCS INSIDE").
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Enter a general description or note for package selection..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSubmitting || !hasChanged}
          >
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isSubmitting ? "Saving..." : "Save Description"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

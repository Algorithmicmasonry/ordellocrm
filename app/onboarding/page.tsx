"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrganization } from "./actions";
import { Building2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await createOrganization(businessName);

    if (!result.success) {
      setError(result.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    // Go straight to dashboard
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <div className="max-w-md w-full">
        <div className="rounded-xl border bg-card shadow-lg p-8">

          {/* Icon + heading */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Set up your business</h1>
            <p className="text-muted-foreground text-sm">
              Your 14-day free trial starts now. No credit card needed.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="block text-sm font-medium mb-1">Business Name</Label>
              <Input
                type="text"
                required
                autoFocus
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Kolor Naturals"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This is the name your team and customers will see.
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading || businessName.trim().length < 2}
            >
              {loading ? "Setting up..." : "Launch My Dashboard →"}
            </Button>
          </form>

          {/* Trial reminder */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">
              Full access for 14 days — then choose a plan to continue.
              <br />
              The Ad Tracker is always free.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

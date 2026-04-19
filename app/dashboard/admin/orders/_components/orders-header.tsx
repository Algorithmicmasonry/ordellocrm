"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download } from "lucide-react";

export function OrdersHeader() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-4xl font-black tracking-tight">Orders Management</h1>
        <p className="text-muted-foreground mt-2">
          Track and manage your assigned customer orders in real-time
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            className="pl-10"
          />
        </div>
        
        <Button>
          <Download className="size-4 mr-2" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}
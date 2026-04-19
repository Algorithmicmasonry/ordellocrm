"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  RotateCcw,
  Search,
  Info,
  SkipForward,
  Eye,
} from "lucide-react";
import { User } from "@prisma/client";
import { getInitials } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";
import { skipCurrentRep, toggleRepInclusion } from "@/app/actions/round-robin";
import { ResetModal } from "./reset-modal";

interface SalesRepWithStats extends User {
  totalOrders: number;
  deliveredOrders: number;
  isOnline: boolean;
}

interface RoundRobinClientProps {
  salesReps: SalesRepWithStats[];
  activeSalesReps: SalesRepWithStats[];
  excludedSalesReps: SalesRepWithStats[];
  currentIndex: number;
  nextRep: SalesRepWithStats | null;
  totalActive: number;
  totalExcluded: number;
}

type TabType = "active" | "excluded" | "inactive";

export default function RoundRobinClient({
  salesReps,
  activeSalesReps,
  excludedSalesReps,
  currentIndex,
  nextRep,
  totalActive,
  totalExcluded,
}: RoundRobinClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const handleSkipRep = async () => {
    const result = await skipCurrentRep();
    if (result.success) {
      toast.success(result.message || "Skipped to next rep");
    } else {
      toast.error(result.error || "Failed to skip rep");
    }
  };

  const handleToggleInclusion = async (
    userId: string,
    currentStatus: boolean,
  ) => {
    const result = await toggleRepInclusion(userId, !currentStatus);
    if (result.success) {
      toast.success(result.message || "Updated successfully");
    } else {
      toast.error(result.error || "Failed to update");
    }
  };

  // Get reps for current tab
  const getCurrentReps = () => {
    let reps: SalesRepWithStats[] = [];
    if (activeTab === "active") {
      reps = activeSalesReps;
    } else if (activeTab === "excluded") {
      reps = excludedSalesReps;
    }

    // Apply search filter
    if (searchQuery) {
      reps = reps.filter(
        (rep) =>
          rep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rep.email.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    return reps;
  };

  const currentReps = getCurrentReps();

  return (
    <div className="flex flex-1 justify-center py-4 sm:py-8">
      <div className="flex flex-col max-w-[960px] flex-1 px-4">
        {/* Page Heading */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 pb-4 sm:pb-6">
          <div className="flex min-w-72 flex-col gap-1">
            <h1 className="text-4xl font-black tracking-tight">
              Round-Robin Management
            </h1>
            <p className="text-muted-foreground">
              Configure the lead distribution sequence for your sales team.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto"
              onClick={() => setResetModalOpen(true)}
            >
              <RotateCcw className="size-4 mr-2" />
              Reset Sequence
            </Button>
          </div>
        </div>

        {/* Next in Line Card */}
        {nextRep && (
          <Card className="mb-6 border-primary/20 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-[2_2_0px] flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                    <h2 className="text-lg font-bold">
                      Next in Line: {nextRep.name}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The next incoming lead or order will be automatically
                    assigned to {nextRep.name} based on the current sequence.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-primary/10 text-primary hover:bg-primary/20"
                      onClick={handleSkipRep}
                    >
                      <SkipForward className="size-4 mr-2" />
                      Skip Rep
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/admin/sales-reps/${nextRep.id}`}>
                        <Eye className="size-4 mr-2" />
                        View Performance
                      </Link>
                    </Button>
                  </div>
                </div>
                <Avatar className="hidden md:block size-32">
                  <AvatarImage src={nextRep.image || undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials(nextRep.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="pb-6">
          <div className="flex border-b border-border px-4 gap-8">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 ${
                activeTab === "active"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <p className="text-sm font-bold tracking-[0.015em]">
                Active Sequence ({totalActive})
              </p>
            </button>
            <button
              onClick={() => setActiveTab("excluded")}
              className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 ${
                activeTab === "excluded"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <p className="text-sm font-bold tracking-[0.015em]">
                Temporarily Excluded ({totalExcluded})
              </p>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-0 sm:px-4 pb-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search reps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between px-4 pb-4">
          <h2 className="text-xl font-bold">Assignment Sequence</h2>
        </div>

        {/* Rep List */}
        <div className="flex flex-col gap-3 px-4">
          {currentReps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No sales representatives found
            </div>
          ) : (
            currentReps.map((rep, index) => {
              const isNext = nextRep?.id === rep.id;
              const position = activeTab === "active" ? index + 1 : "--";

              return (
                <div
                  key={rep.id}
                  className={`flex items-center gap-4 p-4 rounded-xl shadow-sm transition-colors ${
                    isNext
                      ? "bg-card border-2 border-primary"
                      : rep.isActive
                        ? "bg-card border border-border"
                        : "bg-muted/30 border border-dashed border-border opacity-60"
                  }`}
                >
                  {/* Position Badge */}
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      isNext
                        ? "bg-primary/10 text-primary"
                        : rep.isActive
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {position}
                  </div>

                  {/* Rep Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="size-10">
                      <AvatarImage src={rep.image || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(rep.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold">{rep.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {rep.email}
                      </p>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-6">
                    {/* Availability Status */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full ${rep.isOnline ? "bg-green-500" : "bg-amber-500"}`}
                      />
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        {rep.isOnline ? "Available" : "On Break"}
                      </span>
                    </div>

                    {/* Inclusion Toggle */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium ${rep.isActive ? "text-muted-foreground" : "text-amber-600 font-bold"}`}
                      >
                        {rep.isActive ? "Included" : "Excluded"}
                      </span>
                      <Switch
                        checked={rep.isActive}
                        onCheckedChange={() =>
                          handleToggleInclusion(rep.id, rep.isActive)
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10">
          <div className="flex gap-3">
            <Info className="size-5 text-primary shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold">How Round-Robin Works</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Incoming orders are assigned to the representative at position
                #1. Once assigned, that rep moves to the end of the active
                sequence. Excluded reps are skipped entirely until re-enabled.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Modal */}
      <ResetModal open={resetModalOpen} onOpenChange={setResetModalOpen} />
    </div>
  );
}

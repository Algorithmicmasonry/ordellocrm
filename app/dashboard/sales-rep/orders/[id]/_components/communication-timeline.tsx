"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useState, useTransition } from "react";
import { addOrderNote } from "../actions";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import type { Order, OrderNote } from "@prisma/client";

interface CommunicationTimelineProps {
  order: Order & { notes: OrderNote[] };
}

export function CommunicationTimeline({ order }: CommunicationTimelineProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [noteText, setNoteText] = useState("");
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");

  const handleSubmit = async () => {
    if (!noteText.trim()) {
      toast.error("Please enter a note");
      return;
    }

    startTransition(async () => {
      let parsedFollowUpDate: Date | undefined;
      if (scheduleFollowUp && followUpDate) {
        // Parse as local midnight (not UTC midnight) so the follow-up appears
        // at the start of the selected day in the sales rep's local timezone
        const [year, month, day] = followUpDate.split("-").map(Number);
        parsedFollowUpDate = new Date(year, month - 1, day);
      }

      const result = await addOrderNote(
        order.id,
        noteText,
        parsedFollowUpDate
      );

      if (result.success) {
        toast.success("Note added successfully");
        setNoteText("");
        setScheduleFollowUp(false);
        setFollowUpDate("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to add note");
      }
    });
  };

  return (
    <Card className="shadow-sm flex flex-col h-[700px]">
      <CardHeader className="px-5 py-4 border-b">
        <h3 className="font-bold">Communication Timeline</h3>
      </CardHeader>

      {/* Timeline Feed */}
      <CardContent className="flex-1 overflow-y-auto p-5 space-y-6">
        {order.notes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No notes yet</p>
          </div>
        ) : (
          order.notes.map((note, index) => (
            <div
              key={note.id}
              className="relative pl-6 border-l-2 border-muted"
            >
              <div
                className={cn(
                  "absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2",
                  index === 0
                    ? "border-primary"
                    : "border-muted"
                )}
              ></div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold">
                    {note.isFollowUp ? "Follow-up Note" : "Note"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(note.createdAt), "MMM dd, h:mm a")}
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg text-sm">
                  {note.note}
                </div>
                {note.followUpDate && (
                  <p className="text-[10px] text-primary font-medium mt-1">
                    Follow-up: {format(new Date(note.followUpDate), "MMM dd, yyyy")}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>

      {/* Add Note Form */}
      <div className="p-4 border-t bg-muted/20">
        <Textarea
          placeholder="Add a new note..."
          rows={3}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          disabled={isPending}
          className="mb-3"
        />
        <div className="flex flex-col gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="follow-up"
              checked={scheduleFollowUp}
              onCheckedChange={(checked) => setScheduleFollowUp(checked as boolean)}
              disabled={isPending}
            />
            <Label
              htmlFor="follow-up"
              className="text-sm font-medium cursor-pointer"
            >
              Schedule Follow-up
            </Label>
          </div>
          {scheduleFollowUp && (
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              disabled={isPending}
              className="text-sm"
              min={format(new Date(), "yyyy-MM-dd")}
            />
          )}
          <Button
            onClick={handleSubmit}
            disabled={isPending || !noteText.trim()}
            className="w-full"
          >
            {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
            Post Note
          </Button>
        </div>
      </div>
    </Card>
  );
}

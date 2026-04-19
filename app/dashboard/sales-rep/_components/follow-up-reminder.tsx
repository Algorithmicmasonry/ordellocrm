import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import Link from "next/link";

interface FollowUpReminderProps {
  count: number;
}

export function FollowUpReminder({ count }: FollowUpReminderProps) {
  return (
    <Card className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-4 items-center">
            <div className="bg-primary text-white p-2 rounded-lg flex items-center justify-center shrink-0">
              <Phone className="size-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-base font-bold leading-tight">
                Follow-up Reminders
              </p>
              <p className="text-sm text-muted-foreground">
                You have {count} order{count !== 1 ? "s" : ""} requiring calls
                today. Ensure high-priority customers are contacted first.
              </p>
            </div>
          </div>
          <Button
            asChild
            className="w-full sm:w-auto whitespace-nowrap shadow-md shadow-primary/20"
          >
            <Link href="/dashboard/sales-rep/orders?status=FOLLOW_UP">
              View All Follow-ups
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

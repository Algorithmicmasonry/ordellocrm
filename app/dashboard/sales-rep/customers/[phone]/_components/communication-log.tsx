import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MessageSquare, StickyNote, Info } from "lucide-react";
import { format } from "date-fns";
import type { OrderNote } from "@prisma/client";

interface CommunicationLogNote extends OrderNote {
  orderNumber: number;
  orderId: string;
}

interface CommunicationLogProps {
  logs: CommunicationLogNote[];
}

export function CommunicationLog({ logs }: CommunicationLogProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare className="size-5" />
            Communication Log
          </h3>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Info className="size-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No communication logs yet
            </p>
          </div>
        ) : (
          <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {logs.map((log) => (
              <div
                key={log.id}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-muted text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <StickyNote className="size-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[45%] p-4 rounded-xl border bg-muted/40">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-sm">
                      Order Note: {log.orderNumber}
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), "MMM dd, h:mm a")}
                    </time>
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                    "{log.note}"
                  </p>
                  {log.isFollowUp && log.followUpDate && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                      Follow-up: {format(new Date(log.followUpDate), "MMM dd, yyyy")}
                    </p>
                  )}
                  <div className="mt-2 text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                    Added by Sales Rep
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

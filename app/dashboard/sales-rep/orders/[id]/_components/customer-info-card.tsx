"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Phone, MapPin, User } from "lucide-react";
import type { Order } from "@prisma/client";

interface CustomerInfoCardProps {
  order: Order;
}

export function CustomerInfoCard({ order }: CustomerInfoCardProps) {

  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex flex-col gap-5">
          {/* Customer Header */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User className="size-8" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                Customer Info
              </p>
              <p className="text-xl font-bold leading-tight">
                {order.customerName}
              </p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-3">
              <Phone className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">{order.customerPhone}</span>
            </div>
            {order.customerWhatsapp && order.customerWhatsapp !== order.customerPhone && (
              <div className="flex items-center gap-3">
                <Phone className="size-5 text-muted-foreground" />
                <span className="text-sm font-medium">{order.customerWhatsapp}</span>
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-2">
                Shipping Address
              </p>
              <div className="text-sm space-y-1">
                <p>{order.deliveryAddress}</p>
                <p>
                  {order.city}, {order.state}
                </p>
              </div>
            </div>

            {/* Location Badge */}
            <div className="w-full aspect-square rounded-lg bg-muted overflow-hidden relative flex items-center justify-center border">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/20"></div>
              <div className="relative z-10 text-center">
                <MapPin className="size-12 text-primary mx-auto mb-2" />
                <p className="text-xs font-bold text-muted-foreground">
                  {order.city}, {order.state}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { format } from "date-fns";

interface Customer {
  customerName: string;
  customerPhone: string;
  customerWhatsapp: string | null;
  city: string;
  state: string;
  deliveryAddress: string;
}

interface Stats {
  customerSince: Date;
}

interface CustomerProfileProps {
  customer: Customer;
  stats: Stats;
}

export function CustomerProfile({ customer, stats }: CustomerProfileProps) {
  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(
      `Hi ${customer.customerName}, this is regarding your orders with us. How can I assist you today?`
    );
    const whatsappUrl = `https://wa.me/${(customer.customerWhatsapp || customer.customerPhone).replace(/\D/g, "")}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleCallClick = () => {
    window.location.href = `tel:${customer.customerPhone}`;
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
          <div className="flex gap-6 items-center">
            <Avatar className="size-24 border-4 border-muted">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {getInitials(customer.customerName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold leading-tight tracking-tight">
                  {customer.customerName}
                </h1>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Active
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="size-4" />
                {customer.deliveryAddress}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Customer since {format(new Date(stats.customerSince), "MMM dd, yyyy")}
              </p>
            </div>
          </div>
          <div className="flex w-full sm:w-auto gap-3">
            <Button
              onClick={handleWhatsAppClick}
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white flex-1 sm:flex-none"
            >
              <MessageCircle className="size-4 mr-2" />
              WhatsApp
            </Button>
            <Button
              onClick={handleCallClick}
              className="flex-1 sm:flex-none"
            >
              <Phone className="size-4 mr-2" />
              Call Now
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

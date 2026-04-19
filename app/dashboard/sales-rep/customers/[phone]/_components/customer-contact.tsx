import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface Customer {
  customerName: string;
  customerPhone: string;
  customerWhatsapp: string | null;
  city: string;
  state: string;
  deliveryAddress: string;
}

interface CustomerContactProps {
  customer: Customer;
}

export function CustomerContact({ customer }: CustomerContactProps) {
  return (
    <>
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/50 px-6 py-3 border-b">
          <h4 className="text-xs font-bold uppercase tracking-wider">
            Contact Details
          </h4>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">
              Phone
            </p>
            <p className="text-sm font-medium">
              {customer.customerPhone}
            </p>
          </div>
          {customer.customerWhatsapp && (
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">
                WhatsApp
              </p>
              <p className="text-sm font-medium">
                {customer.customerWhatsapp}
              </p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">
              Delivery Address
            </p>
            <p className="text-sm font-medium">
              {customer.deliveryAddress}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm overflow-hidden">
        <div className="h-32 bg-muted relative flex items-center justify-center">
          <div className="bg-background p-2 rounded-full shadow-lg">
            <MapPin className="size-8 text-primary" />
          </div>
        </div>
        <div className="p-4 bg-muted/20 text-center border-t">
          <p className="text-xs font-medium text-muted-foreground">
            {customer.city}, {customer.state}
          </p>
        </div>
      </Card>
    </>
  );
}

"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageCircle, Copy, Check } from "lucide-react";
import type { Order, OrderItem, Product, Agent } from "@prisma/client";
import { getCurrencySymbol } from "@/lib/currency";

interface SendToAgentButtonProps {
  order: Order & {
    items: (OrderItem & { product: Product })[];
    agent?: Agent | null;
  };
}

export function SendToAgentButton({ order }: SendToAgentButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  if (!order.agent) {
    return null;
  }

  // Calculate total
  const totalAmount = order.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );

  // Format items list
  const itemsList = order.items
    .map((item) => `${item.quantity}x ${item.product.name}`)
    .join(", ");

  // Strip country code prefix (+234, +233, +44, etc.) from phone number and adds the 0 at the beginning
  function normalizePhone(phone?: string) {
    const stripped = (phone ?? "")
      .replace(/^\+\d{1,3}/, "") // remove +country code
      .trim();

    return stripped.startsWith("0") ? stripped : `0${stripped}`;
  }

  const barePhone = normalizePhone(order.customerPhone);
  const bareWhatsapp = normalizePhone(order.customerWhatsapp ?? "");

  const message = `🚚 *DELIVERY ASSIGNMENT*

*Order:* ${order.orderNumber}

*Full Name:* ${order.customerName}
*Phone:* ${barePhone}
*Whatsapp Number:* ${bareWhatsapp}

*Address:* ${order.deliveryAddress}, ${order.city}, ${order.state}

*Items:* ${itemsList}

*Total:* ${getCurrencySymbol(order.currency)}${totalAmount.toLocaleString()}

Please proceed with delivery. Thank you!`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = message;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        setCopied(false);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-700 dark:text-green-400"
        >
          <MessageCircle className="size-4 mr-2" />
          Send to Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delivery Information</DialogTitle>
          <DialogDescription>
            Copy the delivery details below and send to the agent via your
            preferred channel.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap font-mono">
          {message}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleCopy} className="gap-2">
            {copied ? (
              <>
                <Check className="size-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copy to Clipboard
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

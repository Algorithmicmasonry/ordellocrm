"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function NotificationListener() {
  const router = useRouter();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "SHOW_TOAST") {
          const data = event.data.data;

          // Shopify-style toast notification
          toast.success(data.title, {
            description: data.body,
            action: data.url
              ? {
                  label: "View Order",
                  onClick: () => router.push(data.url),
                }
              : undefined,
            duration: 10000,
            position: "top-right",
          });
        }
      });
    }
  }, [router]);

  return null; // No UI rendered
}

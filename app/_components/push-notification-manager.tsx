"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff, AlertCircle } from "lucide-react";
import {
  subscribeUser,
  unsubscribeUser,
} from "@/app/actions/push-notifications";
import toast from "react-hot-toast";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [needsRenewal, setNeedsRenewal] = useState(false);

  useEffect(() => {
    console.log("🔔 Push Notification Manager - Initial Check");

    // Check if iOS
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Check if running as standalone (installed PWA)
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);

    console.log("Is iOS:", iOS);
    console.log("Is Standalone:", standalone);
    console.log("Service Worker support:", "serviceWorker" in navigator);
    console.log("Push Manager support:", "PushManager" in window);

    // iOS Safari only supports push in standalone mode (installed PWA)
    if (iOS && !standalone) {
      console.log(
        "⚠️ iOS detected but not in standalone mode. Push not supported.",
      );
      setIsSupported(false);
      return;
    }

    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      registerServiceWorker();

      // Check subscription health periodically
      const checkInterval = setInterval(checkSubscriptionHealth, 3600000); // Every hour

      return () => clearInterval(checkInterval);
    }
  }, []);

  // Check if notifications are enabled but not working
  useEffect(() => {
    const checkNotificationHealth = async () => {
      if (!subscription) return;

      const registration = await navigator.serviceWorker.ready;
      const currentSub = await registration.pushManager.getSubscription();

      // If we think we're subscribed but actually aren't
      if (!currentSub) {
        toast.custom(
          (t) => (
            <div className="flex items-center gap-3 bg-red-600 text-white px-4 py-3 rounded-md shadow">
              <span>Notifications disconnected. Please re-enable them.</span>
              <button
                className="underline font-semibold"
                onClick={() => {
                  subscribeToPush();
                  toast.dismiss(t.id);
                }}
              >
                Re-enable
              </button>
            </div>
          ),
          { duration: 10000 },
        );
      }
    };

    // Check on app focus
    window.addEventListener("focus", checkNotificationHealth);
    return () => window.removeEventListener("focus", checkNotificationHealth);
  }, [subscription]);

  async function registerServiceWorker() {
    try {
      console.log("📝 Registering service worker...");
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      console.log("✅ Service worker registered:", registration);
      console.log("SW scope:", registration.scope);
      console.log("SW active:", registration.active);
      console.log("SW installing:", registration.installing);
      console.log("SW waiting:", registration.waiting);

      const sub = await registration.pushManager.getSubscription();
      console.log("Current subscription:", sub);

      if (sub) {
        console.log("Subscription endpoint:", sub.endpoint);
        console.log("Subscription expiration:", sub.expirationTime);
        console.log("Subscription keys:", {
          p256dh: sub.toJSON().keys?.p256dh,
          auth: sub.toJSON().keys?.auth,
        });
      } else {
        console.log("⚠️ No active subscription found");
      }

      setSubscription(sub);
    } catch (error) {
      console.error("❌ Service worker registration failed:", error);
    }
  }

  async function checkSubscriptionHealth() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();

      if (sub) {
        // Check if subscription is expired or about to expire
        if (sub.expirationTime && sub.expirationTime < Date.now() + 86400000) {
          console.log("⚠️ Subscription expiring soon, renewing...");
          setNeedsRenewal(true);
          await sub.unsubscribe();
          await subscribeToPush();
          setNeedsRenewal(false);
          return;
        }

        // Test if subscription actually works
        const response = await fetch("/api/test-subscription", {
          method: "POST",
        });
        const data = await response.json();

        if (!data.hasWorking) {
          console.log("⚠️ Subscription not working, needs renewal");
          setNeedsRenewal(true);

          // Auto-renew silently
          await sub.unsubscribe();
          await subscribeToPush();
          setNeedsRenewal(false);
        }
      }
    } catch (error) {
      console.error("Health check failed:", error);
    }
  }

  async function subscribeToPush() {
    setIsLoading(true);
    console.log("🔔 Starting push subscription...");

    try {
      // Request permission first
      const permission = await Notification.requestPermission();
      console.log("Notification permission result:", permission);

      if (permission !== "granted") {
        toast.error("Notification permission denied");
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      console.log("Service worker ready:", registration);

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });

      console.log("✅ New subscription created:", sub);
      console.log("Subscription endpoint:", sub.endpoint);
      console.log("Subscription JSON:", sub.toJSON());

      setSubscription(sub);
      const serializedSub = JSON.parse(JSON.stringify(sub));
      console.log("Serialized subscription:", serializedSub);

      const result = await subscribeUser(serializedSub);
      console.log("Server subscription result:", result);

      if (result.success) {
        toast.success("Notifications enabled!");
      } else {
        console.error("Server subscription failed:", result.error);
        toast.error(result.error || "Failed to enable notifications");
      }
    } catch (error) {
      console.error("❌ Failed to subscribe:", error);
      toast.error("Failed to enable notifications");
    } finally {
      setIsLoading(false);
    }
  }

  async function unsubscribeFromPush() {
    setIsLoading(true);
    console.log("🔕 Unsubscribing from push...");

    try {
      if (subscription) {
        console.log("Unsubscribing endpoint:", subscription.endpoint);
        await subscription.unsubscribe();
        console.log("✅ Unsubscribed from browser");

        await unsubscribeUser(subscription.endpoint);
        console.log("✅ Removed from server");

        setSubscription(null);
        toast.success("Notifications disabled");
      }
    } catch (error) {
      console.error("❌ Failed to unsubscribe:", error);
      toast.error("Failed to disable notifications");
    } finally {
      setIsLoading(false);
    }
  }

  async function forceServiceWorkerUpdate() {
    try {
      console.log("🔄 Forcing service worker update...");

      // Unregister all service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log("Unregistered:", registration.scope);
      }

      console.log("⏳ Waiting 1 second...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Re-register
      await registerServiceWorker();

      toast.success(
        "Service worker updated! Please enable notifications again.",
      );
    } catch (error) {
      console.error("❌ Failed to update service worker:", error);
      toast.error("Failed to update service worker");
    }
  }

  async function forceResubscribe() {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;

      // Get existing subscription
      const existingSub = await registration.pushManager.getSubscription();

      if (existingSub) {
        console.log("Unsubscribing old subscription...");
        await existingSub.unsubscribe();
        await unsubscribeUser(existingSub.endpoint);
      }

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Subscribe fresh
      await subscribeToPush();

      toast.success("Re-subscribed successfully!");
    } catch (error) {
      console.error("Error re-subscribing:", error);
      toast.error("Failed to re-subscribe");
    } finally {
      setIsLoading(false);
    }
  }

  async function testNotification() {
    try {
      const response = await fetch("/api/test-subscription", {
        method: "POST",
      });
      const data = await response.json();

      if (data.hasWorking) {
        toast.success(
          `Notifications working! (${data.workingCount}/${data.total})`,
        );
      } else {
        toast.error(data.reason || "Notifications not working");
      }
    } catch (error) {
      console.error("Test failed:", error);
      toast.error("Failed to test notifications");
    }
  }

  // Show iOS-specific message if not installed
  if (isIOS && !isStandalone) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="size-4 text-yellow-600" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              To enable push notifications on iOS, you need to install this app
              to your home screen first.
            </p>
            <p className="text-xs text-muted-foreground">
              Tap the share button <span className="font-semibold">􀈂</span> and
              select &quot; Add to Home Screen &quot;
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    console.log("⚠️ Push notifications not supported");
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {subscription ? (
            <Bell className="size-4" />
          ) : (
            <BellOff className="size-4" />
          )}
          Push Notifications
          {needsRenewal && (
            <span className="text-xs text-yellow-600">⚠️ Renewing...</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {subscription ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              You will receive notifications for order updates
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={unsubscribeFromPush}
                disabled={isLoading}
              >
                Disable Notifications
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={testNotification}
                disabled={isLoading}
              >
                Test Notification
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Enable notifications to stay updated on orders
            </p>
            <Button size="sm" onClick={subscribeToPush} disabled={isLoading}>
              Enable Notifications
            </Button>
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Troubleshooting:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={forceServiceWorkerUpdate}
              disabled={isLoading}
            >
              Update Service Worker
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={forceResubscribe}
              disabled={isLoading}
            >
              Force Re-subscribe
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

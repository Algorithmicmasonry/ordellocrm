const CACHE_VERSION = "v2"; // Increment this when you make changes

console.log("Service Worker loading... Version:", CACHE_VERSION);

// In your sw.js, add periodic sync to keep SW alive
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "keep-alive") {
    event.waitUntil(Promise.resolve());
  }
});

// Also add this to prevent SW from being killed
self.addEventListener("fetch", (event) => {
  // This ensures SW stays registered
  event.respondWith(fetch(event.request));
});

self.addEventListener("install", function (event) {
  console.log("Service Worker installing... Version:", CACHE_VERSION);
  self.skipWaiting(); // Force activate immediately
});

self.addEventListener("activate", function (event) {
  console.log("Service Worker activating... Version:", CACHE_VERSION);
  event.waitUntil(clients.claim()); // Take control immediately
});

self.addEventListener("push", function (event) {
  console.log("Push event received!", event);

  if (event.data) {
    try {
      const data = event.data.json();
      console.log("Push data:", data);

      // Always show browser notification regardless of app state
      const options = {
        body: data.body,
        icon: data.icon || "/icon.png",
        badge: "/badge.png",
        vibrate: [100, 50, 100],
        data: {
          url: data.url || "/dashboard",
          orderId: data.orderId,
        },
        actions: data.actions || [],
        tag: data.tag || "ordo-notification",
        requireInteraction: data.requireInteraction || false,
      };

      console.log("Showing notification with options:", options);

      event.waitUntil(
        self.registration
          .showNotification(data.title, options)
          .then(() => console.log("✅ Notification shown successfully"))
          .catch((err) =>
            console.error("❌ Failed to show notification:", err),
          ),
      );
    } catch (error) {
      console.error("❌ Error parsing push data:", error);
    }
  } else {
    console.log("⚠️ Push event has no data");
  }
});

self.addEventListener("notificationclick", function (event) {
  console.log("Notification click received.", event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/dashboard";
  console.log("Opening URL:", urlToOpen);

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        console.log("Found clients:", clientList.length);

        // If app is already open, focus it
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(urlToOpen) && "focus" in client) {
            console.log("Focusing existing window");
            return client.focus();
          }
        }

        // Otherwise open new window
        if (clients.openWindow) {
          console.log("Opening new window");
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((err) => console.error("Error handling notification click:", err)),
  );
});

// Optional: Background sync for offline order submission
self.addEventListener("sync", function (event) {
  if (event.tag === "sync-orders") {
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  console.log("Syncing orders in background");
}

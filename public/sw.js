/*
 * The service worker behind device notifications (Web Push).
 *
 * Plain JavaScript in `public/` because the app is a static export: Next copies this file to the
 * site root unchanged, so it is served at /sw.js with the whole origin as its scope. It does one
 * thing — show what the API pushes and open the right page when it is tapped. It caches nothing
 * and intercepts no requests.
 *
 * The API sends JSON: { title, body, url, tag? }.
 */

self.addEventListener("install", () => {
  // A new worker has nothing to hand over, so it need not wait for tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function readPayload(event) {
  if (!event.data) return {};
  try {
    return event.data.json();
  } catch {
    return { body: event.data.text() };
  }
}

self.addEventListener("push", (event) => {
  const payload = readPayload(event);
  const title = payload.title || "Advisory";

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body: payload.body || "",
        // The square app icon: the notification slot is square, the brand lockup is 4:1.
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: payload.tag,
        data: { url: payload.url || "/notifications" },
      });
      // Open tabs can refresh their feed; it also lets the page know a push arrived.
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        client.postMessage({ type: "push-received", payload });
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/notifications", self.location.origin);

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = clients.find((client) => new URL(client.url).origin === target.origin);
      if (open) {
        await open.focus();
        if (new URL(open.url).href !== target.href && "navigate" in open) {
          await open.navigate(target.href);
        }
        return;
      }
      await self.clients.openWindow(target.href);
    })(),
  );
});

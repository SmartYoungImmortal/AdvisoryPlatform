import { ApiError, api } from "@/lib/api/client";

/**
 * Device notifications (Web Push), from the browser's side.
 *
 * The worker at `public/sw.js` shows what the API pushes; this module is the other half — it asks
 * for permission, subscribes the browser with the API's VAPID public key and tells the API where to
 * send. Nothing here runs on the server: the app is a static export.
 *
 * `PushState` is what the UI shows, and it is read from the browser rather than remembered, so it
 * stays true when the person changes the permission in the browser's own settings.
 */
export type PushState =
  /** Permission granted and this browser is subscribed. */
  | "on"
  /** Can be turned on: permission not decided, or granted but not subscribed. */
  | "off"
  /** The browser has the site's notifications blocked; only the person can undo it. */
  | "blocked"
  /** No service worker, Push API or Notification API here. */
  | "unsupported"
  /** iPhone/iPad Safari, which only offers push to an app added to the home screen. */
  | "needs-install"
  /** The API has no VAPID keys configured, so there is nothing to subscribe to. */
  | "unavailable";

/** Same file the manifest-less static export serves from `public/`. */
const WORKER_URL = "/sw.js";

function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac, but a Mac has no touch screen.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Whether this browser can do push at all, and if not, whether installing the app would fix it. */
export function pushSupport(): "ok" | "unsupported" | "needs-install" {
  if (typeof window === "undefined") return "unsupported";
  const capable =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (capable) return "ok";
  return isIos() && !isInstalled() ? "needs-install" : "unsupported";
}

/** The VAPID key arrives base64url; `subscribe` wants the raw bytes. */
function decodeKey(key: string): Uint8Array<ArrayBuffer> {
  const base64 = (key + "=".repeat((4 - (key.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  // `atob` gives one char per byte (0–255), so the code point is the byte.
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.codePointAt(i) ?? 0;
  return bytes;
}

function sameKey(a: ArrayBuffer | null, b: Uint8Array): boolean {
  if (!a) return false;
  const view = new Uint8Array(a);
  return view.length === b.length && view.every((byte, i) => byte === b[i]);
}

/**
 * The site's notification permission. The Permissions API is asked first because it is the
 * browser's own record; `Notification.permission` is the fallback where it is missing, and can
 * disagree with it (headless Chromium reports "denied" there while the permission is granted).
 */
async function currentPermission(): Promise<NotificationPermission> {
  try {
    const status = await navigator.permissions.query({ name: "notifications" });
    return status.state === "prompt" ? "default" : status.state;
  } catch {
    return Notification.permission;
  }
}

/** What the browser says right now. */
export async function readPushState(): Promise<PushState> {
  const support = pushSupport();
  if (support !== "ok") return support;
  const permission = await currentPermission();
  if (permission === "denied") return "blocked";
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return permission === "granted" && subscription ? "on" : "off";
}

/**
 * Asks for permission, subscribes this browser and gives the subscription to the API, which ties it
 * to the signed-in user. Resolves to the state afterwards. Rejects when the API call fails (not
 * signed in, unreachable) so the page can say so; the permission answer is kept either way.
 */
export async function enablePush(): Promise<PushState> {
  const support = pushSupport();
  if (support !== "ok") return support;

  let permission = await currentPermission();
  if (permission === "default") {
    const answer = await Notification.requestPermission();
    permission = (await currentPermission()) === "granted" ? "granted" : answer;
  }
  if (permission === "denied") return "blocked";
  if (permission !== "granted") return "off";

  const { publicKey } = await api.get<{ readonly publicKey: string | null }>(
    "notifications/push/public-key",
  );
  if (!publicKey) return "unavailable";
  const serverKey = decodeKey(publicKey);

  const registration = await navigator.serviceWorker.register(WORKER_URL);
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  // A subscription made for another server key can never receive from this one.
  if (subscription && !sameKey(subscription.options.applicationServerKey, serverKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: serverKey,
  });

  // The API takes exactly the endpoint and keys; `toJSON()` also carries `expirationTime`.
  const { endpoint, keys } = subscription.toJSON();
  await api.post("notifications/push/subscriptions", { body: { endpoint, keys } });
  return "on";
}

/** Removes this browser's subscription from the API and from the browser. */
export async function disablePush(): Promise<PushState> {
  if (pushSupport() !== "ok") return readPushState();
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    try {
      await api.delete("notifications/push/subscriptions", {
        body: { endpoint: subscription.endpoint },
      });
    } catch (error) {
      // Already gone on the server is what we wanted.
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }
    await subscription.unsubscribe();
  }
  return readPushState();
}

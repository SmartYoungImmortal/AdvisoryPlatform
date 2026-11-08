import type { Viewport } from "next";

import { MatchingChatScreen } from "@/components/matching/matching-screens";

/**
 * The root viewport, held at its own scale: the message boxes here type at
 * 14px on a phone, the size of their placeholder, and iOS Safari zooms into
 * any field under 16px on focus unless the page says it may not scale up.
 * Pinch-zoom still works on iOS, which ignores this for the reader's own
 * gestures.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function MatchingPage() {
  return <MatchingChatScreen />;
}

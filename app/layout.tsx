import type { Metadata, Viewport } from "next";
// Noto Sans Thai carries the whole UI (--font-sans); Geist covers the Latin-only
// runs that opt in with `font-latin`.
import '@fontsource-variable/noto-sans-thai/wght.css';
import '@fontsource-variable/geist/wght.css';
// Kanit sets the home hero's headline and the line under it (`font-hero`).
import '@fontsource/kanit/400.css';
import '@fontsource/kanit/500.css';
// Sriracha sets the handwritten word in the home and `/search` headings (`font-hand`).
import '@fontsource/sriracha/400.css';
import "./globals.css";
import { cn } from "@/lib/utils";
import { IosFocusZoom } from "@/components/mobile/ios-focus-zoom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/lib/i18n/locale-provider";

export const metadata: Metadata = {
  title: "Advisory Platform",
  description: "แพลตฟอร์มจับคู่ผู้ขอคำปรึกษากับที่ปรึกษา",
  // iOS reads none of the manifest. The title it puts under the home-screen
  // icon, the status-bar treatment and the icon itself all come from these
  // instead — see `app/manifest.ts` for the Android half.
  appleWebApp: {
    capable: true,
    title: "Advisory",
    statusBarStyle: "default",
  },
  icons: { apple: "/apple-touch-icon.png" },
};

/**
 * `themeColor` paints the browser and OS chrome around the app, so it has to
 * track the surface actually behind that edge: `--card` at the top of a screen,
 * where the nav bar sits, and its dark-theme value under `prefers-color-scheme`.
 * It is a literal because this is metadata, not CSS — it cannot read the token.
 *
 * `viewportFit: "cover"` lets the frame reach into a notched phone's safe area,
 * which is what the tab bar's extra 16px of bottom inset is already dressed for.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={cn("h-full", "antialiased", "font-sans")}
    >
      {/* The frame around the mobile canvas is a themed surface, not a raw palette
          step — `bg-neutral-100` here stayed light in dark mode. The 448px canvas
          itself lives in `MobileViewport` (per route-group layouts) so the admin
          console can span the full width. */}
      <body className="min-h-full bg-muted">
        {/* Client components read their copy from this provider. It holds
            the reader's language and swaps the message file when they change
            it — see `lib/i18n/locale-provider.tsx`. */}
        <LocaleProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </LocaleProvider>
        <IosFocusZoom />
      </body>
    </html>
  );
}

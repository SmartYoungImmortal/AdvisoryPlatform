import type { Metadata } from "next";
// Noto Sans Thai carries the whole UI (--font-sans); Geist covers the Latin-only
// runs that opt in with `font-latin`.
import '@fontsource-variable/noto-sans-thai/wght.css';
import '@fontsource-variable/geist/wght.css';
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import {NextIntlClientProvider} from 'next-intl';

export const metadata: Metadata = {
  title: "Advisory Platform",
  description: "แพลตฟอร์มจับคู่ผู้ขอคำปรึกษากับที่ปรึกษา",
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
        <NextIntlClientProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

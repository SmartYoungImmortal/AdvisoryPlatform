import type { Metadata } from "next";
// Noto Sans Thai carries the whole UI (--font-sans); Geist covers the Latin-only
// runs that opt in with `font-latin`.
import '@fontsource-variable/noto-sans-thai/wght.css';
import '@fontsource-variable/geist/wght.css';
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';

export const metadata: Metadata = {
  title: "Advisory Platform",
  description: "แพลตฟอร์มจับคู่ผู้ขอคำปรึกษากับที่ปรึกษา",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Client components read their copy from this provider, not from the request
  // config, so the messages have to be handed over explicitly — without them a
  // `useTranslations` call in a client component renders the bare key.
  const messages = await getMessages();

  return (
    <html
      lang="th"
      className={cn("h-full", "antialiased", "font-sans")}
    >
      {/* The frame around the mobile canvas is a themed surface, not a raw palette
          step — `bg-neutral-100` here stayed light in dark mode. */}
      <body className="min-h-full max-w-md w-full flex flex-col mx-auto bg-muted">
        <NextIntlClientProvider messages={messages}>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

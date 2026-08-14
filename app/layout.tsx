import type { Metadata } from "next";
import '@fontsource-variable/noto-sans-thai/wght.css';
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/geist/wght.css';
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NextIntlClientProvider } from 'next-intl';
import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Advisory Platform",
  description: "Advisory Platform",
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
      <body className="h-full w-full">
        <NextIntlClientProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  );
}

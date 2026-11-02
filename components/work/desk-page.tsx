"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { AppFrame } from "@/components/account/app-frame";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { FEED_COLUMN } from "@/components/notifications/notification-center-screen";
import { Button } from "@/components/ui/button";
import { WORK_GUTTER } from "@/components/work/work-hub";
import { cn } from "@/lib/utils";

/**
 * A page behind the work desk — the services, availability, screening
 * requests, reviews, the advisor page's facts, the payout account — framed
 * as the account's own pages are (the transactions page, step for step):
 * the rail with "งาน" current, the white panel, the phone's back chevron to
 * the desk on a row of its own, the title in the hero's face, a line under
 * it, and the page's one action at the right.
 */
export function DeskPage({
  title,
  subtitle,
  action,
  backHref = "/work",
  children,
}: {
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly action?: ReactNode;
  readonly backHref?: string;
  readonly children: ReactNode;
}) {
  const c = useTranslations("common");

  return (
    <MobileScreen className="bg-card" wide="md">
      <AppFrame active="work">
        <ScreenBody className="bg-card">
          <AccountShell>
            <div className={cn("flex w-full min-w-0 flex-col pt-6 pb-12 lg:flex-1 lg:pt-0 lg:pb-0", FEED_COLUMN, WORK_GUTTER)}>
              <header className="flex w-full flex-col items-start gap-3 lg:gap-0">
                <Button
                  aria-label={c("back")}
                  className="relative -ml-1.5 size-8 shrink-0 text-foreground before:absolute before:-inset-1.5 before:content-[''] lg:hidden"
                  nativeButton={false}
                  render={<Link href={backHref} />}
                  size="icon"
                  variant="ghost"
                >
                  <ChevronLeft aria-hidden className="size-6" />
                </Button>
                <div className="flex w-full flex-wrap items-end justify-between gap-x-4 gap-y-3">
                  <div className="flex min-w-0 flex-col gap-1 lg:gap-2">
                    <h1 className="font-hero text-title-compact font-normal tracking-tight text-hero-ink lg:text-frame-title">
                      {title}
                    </h1>
                    {subtitle ? <p className="text-sm text-muted-foreground lg:text-frame-meta">{subtitle}</p> : null}
                  </div>
                  {action}
                </div>
              </header>
              {children}
            </div>
          </AccountShell>
        </ScreenBody>
      </AppFrame>
    </MobileScreen>
  );
}

/** The capsule a desk page's action wears: solid ink, at the frame's step from `lg`. */
export const DESK_PILL =
  "h-10 w-auto shrink-0 px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body";

/** A hairline box, the approved pages' one container. */
export const DESK_BOX = "rounded-2xl border border-border bg-card";

/** A row in a desk list: the transactions row's measure, with its hover. */
export const DESK_ROW =
  "-mx-3 flex items-start gap-3 rounded-card px-3 py-2.5 outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none lg:-mx-4 lg:gap-5 lg:px-4 lg:py-3.5";

/** The soft circle a row's glyph sits in. */
export const DESK_GLYPH =
  "flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground lg:size-12";

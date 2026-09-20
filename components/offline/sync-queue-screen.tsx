import { Clock, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { SiteFooter } from "@/components/marketing/site-footer";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusPill } from "@/components/mobile/status-pill";
import { CaptionedCard, QueuedItemRow } from "@/components/offline/parts";
import { RetryLink } from "@/components/offline/retry";
import { TopBar } from "@/components/topbar";
import { READING_COLUMN } from "@/lib/layout";
import { cn } from "@/lib/utils";

/**
 * Figma "ออฟไลน์ - คิวรอซิงก์" (1952:36060) — everything the device is holding
 * until it can reach the network, split by whether it will go on its own.
 *
 * "รอส่งอัตโนมัติ" is the queue proper: a clock, what is waiting, and the
 * static "รอส่ง". "ต้องทำตอนออนไลน์" is what a queue cannot hold — a bank
 * confirmation and a file too large to keep — so those rows carry a warning
 * glyph and a real retry instead of a status word.
 *
 * With no desktop frame for the section, the layout follows the desktop
 * notification centre (1952:35428), the nearest drawn page of the same shape:
 * the app nav carrying the back control, a white head band across the page, and
 * the cards on the page ground — all on one 800px column, closing on the footer.
 */
export function SyncQueueScreen() {
  const t = useTranslations("offline");
  const c = useTranslations("common");

  const automatic = [
    { title: t("queueMessageTitle"), body: t("queueMessageBody") },
    { title: t("queueReviewTitle"), body: t("queueReviewBody") },
    { title: t("queueProfileTitle"), body: t("queueProfileBody") },
  ];

  const blocked = [
    { title: t("queuePaymentTitle"), body: t("queuePaymentBody") },
    { title: t("queueUploadTitle"), body: t("queueUploadBody") },
  ];

  const band = cn(
    "flex w-full shrink-0 flex-col items-start px-6 pt-5 lg:px-0 lg:pt-6",
    READING_COLUMN,
  );

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/profile" label={c("back")} />
      <ScreenBody>
        <div className="hidden w-full lg:block">
          <TopBar backHref="/profile" />
        </div>

        {/* Figma "Heading" — the title and its "3 รายการรอส่ง" count. The band is
            full-bleed so the surface crosses the desktop page; only the copy
            inside it is capped. */}
        <div className="w-full shrink-0 lg:border-b lg:border-border lg:bg-card lg:shadow-card">
          <div className={READING_COLUMN}>
            <ScreenHeading
              className="lg:pt-5 lg:pb-9"
              subtitle={t("queueSubtitle")}
              title={t("queueTitle")}
            />
          </div>
        </div>

        <div className={band}>
          {/* "รอส่ง" was 12px grey against a 12px grey body line, so the one word
              that says what will happen to a row looked like part of it. It is a
              pill: amber, because it is waiting on something. */}
          <CaptionedCard caption={t("queueAutoCaption")}>
            {automatic.map((item) => (
              <QueuedItemRow
                body={item.body}
                icon={Clock}
                iconClassName="bg-warning/15 text-warning"
                key={item.title}
                title={item.title}
                trailing={<StatusPill tone="warning">{t("queuePending")}</StatusPill>}
              />
            ))}
          </CaptionedCard>
        </div>

        <div className={band}>
          <CaptionedCard caption={t("queueManualCaption")}>
            {blocked.map((item) => (
              <QueuedItemRow
                body={item.body}
                icon={TriangleAlert}
                iconClassName="bg-destructive/10 text-destructive"
                key={item.title}
                title={item.title}
                trailing={
                  <RetryLink className="text-xs font-medium text-primary">
                    {t("queueRetry")}
                  </RetryLink>
                }
              />
            ))}
          </CaptionedCard>
        </div>

        {/* Figma "Spacer" is a flat 205px, which is simply what is left of the
            874px frame — a flexible spacer is the same thing at any height. */}
        <ScreenSpacer className="lg:min-h-14" />

        {/* Figma "Actions" — one centred accent line, the whole width. */}
        <div
          className={cn(
            "flex w-full shrink-0 flex-col items-center px-6 py-2 lg:px-0",
            READING_COLUMN,
          )}
        >
          <RetryLink className="w-full justify-center">{t("queueRetryAll")}</RetryLink>
        </div>

        <ScreenSpacer className="hidden lg:block lg:min-h-14" />
        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}

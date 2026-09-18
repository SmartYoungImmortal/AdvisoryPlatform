import { Clock, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment } from "react";

import { SiteFooter } from "@/components/marketing/site-footer";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import {
  CaptionedCard,
  OFFLINE_COLUMN,
  OfflineDivider,
  QueuedItemRow,
  QueueStatus,
} from "@/components/offline/parts";
import { RetryLink } from "@/components/offline/retry";
import { TopBar } from "@/components/topbar";

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

  // On the page ground the desktop layout puts behind these bands, a card needs
  // its own hairline; on the phone the surface change already carries it.
  const listCard = "lg:border lg:border-border";
  const band = `flex w-full shrink-0 flex-col items-start px-6 pt-5 lg:px-0 lg:pt-6 ${OFFLINE_COLUMN}`;

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
        <div className="w-full shrink-0 lg:border-b lg:border-border lg:bg-card">
          <div className={OFFLINE_COLUMN}>
            <ScreenHeading
              className="lg:pt-5 lg:pb-9"
              subtitle={t("queueSubtitle")}
              title={t("queueTitle")}
            />
          </div>
        </div>

        <div className={band}>
          <CaptionedCard caption={t("queueAutoCaption")} cardClassName={listCard}>
            {automatic.map((item, i) => (
              <Fragment key={item.title}>
                {i > 0 ? <OfflineDivider /> : null}
                <QueuedItemRow
                  body={item.body}
                  icon={Clock}
                  title={item.title}
                  trailing={<QueueStatus>{t("queuePending")}</QueueStatus>}
                />
              </Fragment>
            ))}
          </CaptionedCard>
        </div>

        <div className={band}>
          <CaptionedCard caption={t("queueManualCaption")} cardClassName={listCard}>
            {blocked.map((item, i) => (
              <Fragment key={item.title}>
                {i > 0 ? <OfflineDivider /> : null}
                <QueuedItemRow
                  body={item.body}
                  icon={TriangleAlert}
                  title={item.title}
                  trailing={
                    <RetryLink className="text-xs font-normal text-muted-foreground">
                      {t("queueRetry")}
                    </RetryLink>
                  }
                />
              </Fragment>
            ))}
          </CaptionedCard>
        </div>

        {/* Figma "Spacer" is a flat 205px, which is simply what is left of the
            874px frame — a flexible spacer is the same thing at any height. */}
        <ScreenSpacer className="lg:min-h-14" />

        {/* Figma "Actions" — one centred accent line, the whole width. */}
        <div className={`flex w-full shrink-0 flex-col items-center px-6 py-2 lg:px-0 ${OFFLINE_COLUMN}`}>
          <RetryLink className="w-full justify-center">{t("queueRetryAll")}</RetryLink>
        </div>

        <ScreenSpacer className="hidden lg:block lg:min-h-14" />
        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}

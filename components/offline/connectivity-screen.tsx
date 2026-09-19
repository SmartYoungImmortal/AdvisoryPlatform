import { Wifi, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { BottomBar } from "@/components/bottombar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import {
  CachedRecordRow,
  CaptionedCard,
  ConnectivityBanner,
  OFFLINE_COLUMN,
  OfflineDivider,
} from "@/components/offline/parts";
import { RetryLink } from "@/components/offline/retry";
import { TopBar } from "@/components/topbar";

/**
 * Figma "ออฟไลน์ - แถบแจ้งเตือน" (1952:36279) and "กลับมาออนไลน์ - กำลังซิงก์"
 * (1952:36128).
 *
 * Neither frame is a screen of its own. Both draw the same app page — the nav,
 * the cached bookings and chats, the tab bar — with `ConnectivityBanner` laid
 * over it and one line at the foot of the content changing: offline says when
 * the data was last refreshed, syncing says it is refreshing now. So the banner
 * is the component and this is the route that shows it in place, the way
 * `/chat/session-banner` does for the in-app banner.
 *
 * The trailing slot is the difference that matters. Offline it is a real retry
 * — the one thing a reader can still do. Syncing it is a count of what is on
 * its way, which is a statement, not a control, so it stays plain text.
 *
 * The section has no desktop frame; at `lg` the canvas opens up and the page
 * keeps a readable 800px column under the app's own nav, closing on the site
 * footer where the phone closes on the tab bar.
 */
export function ConnectivityScreen({
  state = "offline",
}: {
  readonly state?: "offline" | "syncing";
}) {
  const t = useTranslations("offline");
  const offline = state === "offline";

  return (
    <MobileScreen className="pb-0" wide>
      <ScreenBody>
        <TopBar unreadNotifications />

        <ConnectivityBanner
          icon={offline ? WifiOff : Wifi}
          message={offline ? t("bannerOffline") : t("bannerSyncing")}
          trailing={
            offline ? (
              <RetryLink>{t("bannerRetry")}</RetryLink>
            ) : (
              <span className="shrink-0 text-sm font-medium whitespace-nowrap text-primary">
                {t("bannerSyncingCount")}
              </span>
            )
          }
        />

        {/* Figma "Page Content" — 20px between blocks, 24px side padding. The
            phone's last block has to clear the tab bar the frame draws over it;
            the desktop page has no tab bar, so the inset goes with it. */}
        <div
          className={`flex w-full flex-1 flex-col items-start gap-5 px-6 pt-5 pb-[101px] lg:px-0 lg:pb-6 ${OFFLINE_COLUMN}`}
        >
          <CaptionedCard caption={t("cachedBookings")} cardClassName="border border-border px-4">
            <CachedRecordRow
              body={t("cachedBooking1Body")}
              time={t("cachedBooking1Time")}
              title={t("cachedBooking1Name")}
            />
            <OfflineDivider className="bg-border" />
            <CachedRecordRow
              body={t("cachedBooking2Body")}
              time={t("cachedBooking2Time")}
              title={t("cachedBooking2Name")}
            />
          </CaptionedCard>

          <CaptionedCard caption={t("cachedChats")} cardClassName="border border-border px-4">
            <CachedRecordRow
              body={t("cachedChat1Body")}
              time={t("cachedChat1Time")}
              title={t("cachedChat1Name")}
            />
            <OfflineDivider className="bg-border" />
            <CachedRecordRow
              body={t("cachedChat2Body")}
              time={t("cachedChat2Time")}
              title={t("cachedChat2Name")}
            />
          </CaptionedCard>

          <p className="w-full text-xs font-normal text-muted-foreground">
            {offline ? t("cachedNoteOffline") : t("cachedNoteSyncing")}
          </p>
        </div>

        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
      {/* Figma's desktop nav carries these destinations itself — see `TopBar`. */}
      <BottomBar className="lg:hidden" role="user" selected="home" />
    </MobileScreen>
  );
}

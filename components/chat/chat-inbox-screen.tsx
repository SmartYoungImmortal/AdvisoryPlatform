import Image from "next/image";
import Link from "next/link";
import { Search, Video } from "lucide-react";
import { useTranslations } from "next-intl";

import chris from "@/assets/avatars/christopher-nolan.png";
import james from "@/assets/avatars/james-gunn.png";
import emptyIllustration from "@/assets/illustrations/messages-empty.svg";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import { PrimaryButton } from "@/components/mobile/buttons";
import { HomeIndicator } from "@/components/mobile/home-indicator";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { StatusBar } from "@/components/mobile/status-bar";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";

/** Figma "Chat 1..3" row — 12px top padding, 40px avatar, name/preview stack, hairline. */
function ChatRow({
  href,
  avatar,
  name,
  preview,
}: {
  readonly href: string;
  readonly avatar: React.ReactNode;
  readonly name: string;
  readonly preview: string;
}) {
  return (
    <Link className="flex h-[70px] w-full shrink-0 flex-col items-start border-b border-border pt-3" href={href}>
      <div className="flex w-full shrink-0 items-center gap-[2px] px-4">
        <div className="flex min-w-px flex-1 items-center gap-2 self-stretch">
          {avatar}
          <div className="flex shrink-0 flex-col items-start justify-center gap-1 whitespace-nowrap">
            <p className="font-latin text-[16px] leading-[24px] font-medium tracking-[0] text-foreground">
              {name}
            </p>
            <p className="font-thai text-[12px] leading-[18px] font-normal text-muted-foreground">
              {preview}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * Figma "Chat Inbox" (995:8260) and "Chat inbox - Empty" (995:8325).
 */
export function ChatInboxScreen({
  state = "default",
}: {
  readonly state?: "default" | "empty" | "session-banner";
}) {
  const t = useTranslations("chat");
  const n = useTranslations("notifications");
  const isEmpty = state === "empty";
  const hasBanner = state === "session-banner";

  return (
    <MobileScreen>
      <StatusBar />
      <TopBar unreadNotifications />
      {/* Figma "Container": 2px side padding, 16px top padding, 16px between blocks. */}
      <ScreenBody className="items-start gap-4 px-[2px] pt-4 pb-[72px]">
        {hasBanner ? (
          /* Figma "In-app banner" (995:11104) — a 64px accent-tinted strip above
             the list with an 18px video glyph and a join affordance. */
          <div className="flex h-16 w-full shrink-0 items-start gap-3 overflow-clip bg-primary/10 px-[14px] py-3">
            <Video className="mt-[11px] size-[18px] shrink-0 text-primary" />
            <div className="flex min-w-px flex-1 flex-col items-start gap-[2px] overflow-clip">
              <p className="font-thai w-full text-[14px] leading-[20px] font-medium text-foreground">
                {n("sessionBannerTitle")}
              </p>
              <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
                {n("sessionBannerBody")}
              </p>
            </div>
            <button
              className="font-thai mt-[10px] shrink-0 text-[14px] leading-[20px] font-medium whitespace-nowrap text-primary"
              type="button"
            >
              {n("sessionBannerAction")}
            </button>
          </div>
        ) : null}

        <div className="flex shrink-0 items-start gap-6 px-4">
          <p className="font-thai shrink-0 text-[20px] leading-[28px] font-semibold whitespace-nowrap text-foreground">
            {t("title")}
          </p>
        </div>

        <div className="flex w-full shrink-0 items-start px-4">
          <div className="flex h-9 min-w-px flex-1 items-center gap-2 overflow-clip rounded-[8px] border border-input bg-muted px-3 py-[7.5px]">
            <span className="flex w-5 shrink-0 flex-col items-center justify-center p-[2px]">
              <Search className="size-4 text-muted-foreground" />
            </span>
            <input
              aria-label={t("searchPlaceholder")}
              className="font-thai min-w-px flex-1 bg-transparent text-[14px] leading-[20px] font-normal text-foreground outline-none placeholder:text-muted-foreground"
              placeholder={t("searchPlaceholder")}
              type="search"
            />
          </div>
        </div>

        {isEmpty ? (
          /* Figma "Empty State" — 280px illustration, 16px gaps, 200px CTA. */
          <div className="flex w-full flex-1 flex-col items-center justify-center px-6 pb-6">
            <div className="flex w-full shrink-0 flex-col items-center gap-4">
              <Image
                alt=""
                className="size-[280px] shrink-0 overflow-clip"
                src={emptyIllustration}
              />
              <div className="flex w-full shrink-0 flex-col items-center gap-2 overflow-clip text-center">
                <p className="font-thai w-full text-[24px] leading-[34px] font-semibold text-foreground">
                  {t("emptyTitle")}
                </p>
                <p className="font-thai w-full text-[14px] leading-[20px] font-normal text-muted-foreground">
                  {t("emptyBody")}
                </p>
              </div>
              <PrimaryButton className="w-[200px]" href="/matching">
                {t("emptyAction")}
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <div className="flex w-full shrink-0 flex-col items-start">
            <div className="h-px w-full shrink-0 bg-muted" />
            <ChatRow
              avatar={<ChatAvatar size={40} />}
              href="/chat/sarah-jenskins"
              name={t("partner")}
              preview={t("list.sarahPreview")}
            />
            <ChatRow
              avatar={<ChatAvatar crop={false} size={40} src={chris} />}
              href="/chat/christopher-nolan"
              name={t("list.christopher")}
              preview={t("list.christopherPreview")}
            />
            <ChatRow
              avatar={<ChatAvatar crop={false} size={40} src={james} />}
              href="/chat/james-gunn"
              name={t("list.james")}
              preview={t("list.jamesPreview")}
            />
          </div>
        )}
      </ScreenBody>
      <BottomBar role="anon" selected="chat" />
      <HomeIndicator />
    </MobileScreen>
  );
}

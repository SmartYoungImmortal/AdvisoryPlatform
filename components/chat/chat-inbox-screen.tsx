import Image from "next/image";
import Link from "next/link";
import { Search, Video } from "lucide-react";
import { useTranslations } from "next-intl";

import { christopherNolan as chris, jamesGunn as james, messagesEmpty as emptyIllustration } from "@/lib/assets/r2";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import { PrimaryButton } from "@/components/mobile/buttons";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
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
      <div className="flex w-full shrink-0 items-center gap-0.5 px-4">
        <div className="flex min-w-px flex-1 items-center gap-2 self-stretch">
          {avatar}
          <div className="flex shrink-0 flex-col items-start justify-center gap-1 whitespace-nowrap">
            <p className="font-latin text-base font-medium text-foreground">
              {name}
            </p>
            <p className="text-xs font-normal text-muted-foreground">
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
      {/* Figma "Container": 2px side padding, 16px top padding, 16px between blocks. */}
      <ScreenBody className="items-start gap-4 px-0.5 pb-[72px]">
        <TopBar unreadNotifications />
        {hasBanner ? (
          /* Figma "In-app banner" (995:11104) — a 64px accent-tinted strip above
             the list with an 18px video glyph and a join affordance. */
          <div className="flex h-16 w-full shrink-0 items-start gap-3 overflow-clip bg-primary/10 px-3.5 py-3">
            <Video className="mt-[11px] size-4.5 shrink-0 text-primary" />
            <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
              <p className="w-full text-sm font-medium text-foreground">
                {n("sessionBannerTitle")}
              </p>
              <p className="w-full text-xs font-normal text-muted-foreground">
                {n("sessionBannerBody")}
              </p>
            </div>
            <Button
              className="mt-2.5 h-auto shrink-0 p-0 text-sm font-medium whitespace-nowrap"
              variant="link"
            >
              {n("sessionBannerAction")}
            </Button>
          </div>
        ) : null}

        <div className="flex shrink-0 items-start gap-6 px-4">
          <p className="shrink-0 text-xl font-semibold whitespace-nowrap text-foreground">
            {t("title")}
          </p>
        </div>

        <div className="flex w-full shrink-0 items-start px-4">
          <InputGroup className="gap-2 bg-muted px-3 shadow-none">
            <InputGroupAddon className="p-0">
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              aria-label={t("searchPlaceholder")}
              className="px-0 text-sm"
              placeholder={t("searchPlaceholder")}
              type="search"
            />
          </InputGroup>
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
                <p className="w-full text-2xl font-semibold text-foreground">
                  {t("emptyTitle")}
                </p>
                <p className="w-full text-sm font-normal text-muted-foreground">
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
    </MobileScreen>
  );
}

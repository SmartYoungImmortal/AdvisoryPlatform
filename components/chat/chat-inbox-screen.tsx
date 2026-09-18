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
import { cn } from "@/lib/utils";

/** Figma "Chat 1..3" row — 12px top padding, 40px avatar, name/preview stack, hairline. */
function ChatRow({
  href,
  avatar,
  name,
  preview,
  active = false,
}: {
  readonly href: string;
  readonly avatar: React.ReactNode;
  readonly name: string;
  readonly preview: string;
  /** The thread open in the pane beside this list — desktop only. */
  readonly active?: boolean;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-[70px] w-full shrink-0 flex-col items-start border-b border-border pt-3",
        active && "bg-muted/60",
      )}
      href={href}
    >
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

/** The three threads the prototype ships with, in the order the frame lists them. */
const THREADS = [
  { id: "sarah-jenskins", name: "partner", preview: "list.sarahPreview" },
  { id: "christopher-nolan", name: "list.christopher", preview: "list.christopherPreview" },
  { id: "james-gunn", name: "list.james", preview: "list.jamesPreview" },
] as const;

/** The portrait each thread carries — `sarah` is `ChatAvatar`'s own default. */
const THREAD_AVATAR = {
  "sarah-jenskins": <ChatAvatar size={40} />,
  "christopher-nolan": <ChatAvatar crop={false} size={40} src={chris} />,
  "james-gunn": <ChatAvatar crop={false} size={40} src={james} />,
} as const;

/**
 * The inbox itself — title, search, threads.
 *
 * Figma's desktop chat (1952:8003) shows this beside the open thread instead of
 * on a screen of its own, so it is a component both screens render: the inbox
 * page at every width, the thread page from `lg`. `activeId` is what marks the
 * row being read, which only the two-pane layout can show.
 */
export function ChatList({
  activeId,
  className,
}: {
  readonly activeId?: string;
  readonly className?: string;
}) {
  const t = useTranslations("chat");

  return (
    <div className={cn("flex w-full shrink-0 flex-col items-start gap-4", className)}>
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

      <div className="flex w-full min-h-0 flex-1 flex-col items-start overflow-y-auto">
        <div className="h-px w-full shrink-0 bg-muted" />
        {THREADS.map((thread) => (
          <ChatRow
            active={thread.id === activeId}
            avatar={THREAD_AVATAR[thread.id]}
            href={`/chat/${thread.id}`}
            key={thread.id}
            name={t(thread.name)}
            preview={t(thread.preview)}
          />
        ))}
      </div>
    </div>
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
    <MobileScreen className="pb-0" wide>
      {/* Figma "Container": 2px side padding, 16px top padding, 16px between blocks. */}
      <ScreenBody className="items-start gap-4 px-0.5 pb-[144px] lg:gap-0 lg:px-10 xl:px-30 lg:pb-6">
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
          /* Figma's desktop frame stands the list in the left half of a card
             and leaves the right half waiting for a thread to be picked. */
          <div className="flex w-full min-h-0 flex-1 flex-col items-start lg:mx-auto lg:max-w-[1440px] lg:flex-row lg:overflow-clip lg:rounded-xl lg:border lg:border-border lg:bg-card">
            <ChatList className="lg:h-full lg:w-80 lg:shrink-0 lg:border-e lg:border-border lg:pt-4" />
            <div className="hidden lg:flex lg:min-w-px lg:flex-1 lg:items-center lg:justify-center lg:p-10">
              <p className="max-w-80 text-center text-sm font-normal text-muted-foreground">
                {t("pickThread")}
              </p>
            </div>
          </div>
        )}
      </ScreenBody>
      <BottomBar className="lg:hidden" role="anon" selected="chat" />
    </MobileScreen>
  );
}

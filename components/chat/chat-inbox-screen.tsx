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
import { CHAT_PANE } from "@/components/chat/chat-chrome";
import { PrimaryButton } from "@/components/mobile/buttons";
import { EmptyState } from "@/components/mobile/empty-state";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";

/**
 * Figma "Chat 1..3" row — 12px top padding, 40px avatar, name/preview stack,
 * hairline.
 *
 * Three things the frame does not draw and a working inbox needs. An unread row
 * carries weight — the name goes semibold, the preview stops being muted and a
 * dot holds the right edge — so the list has a shape before it is read. The row
 * answers the pointer, which the desktop pane had no way of doing. And it sits
 * on the card surface rather than straight on the page ground, so the list is an
 * object with hairlines in it instead of three lines of text on grey.
 */
function ChatRow({
  href,
  avatar,
  name,
  preview,
  unread = false,
  active = false,
}: {
  readonly href: string;
  readonly avatar: React.ReactNode;
  readonly name: string;
  readonly preview: string;
  /** Not read yet: the row's own weight, plus the dot. */
  readonly unread?: boolean;
  /** The thread open in the pane beside this list — desktop only. */
  readonly active?: boolean;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-[70px] w-full shrink-0 flex-col items-start justify-center border-b border-border bg-card transition-colors duration-150 ease-out hover:bg-muted motion-reduce:transition-none",
        // The open thread keeps the accent tint and an accent edge, so the pane
        // and the list agree on which conversation is on screen.
        active && "bg-accent-surface/60 before:absolute before:inset-y-0 before:start-0 before:w-0.5 before:bg-primary before:content-['']",
      )}
      href={href}
    >
      <div className="flex w-full shrink-0 items-center gap-3 px-4">
        {avatar}
        <div className="flex min-w-px flex-1 flex-col items-start justify-center gap-0.5">
          <p
            className={cn(
              "font-latin w-full truncate text-sm",
              unread ? "font-semibold text-foreground" : "font-medium text-foreground",
            )}
          >
            {name}
          </p>
          <p
            className={cn(
              "w-full truncate text-xs",
              unread ? "font-medium text-foreground" : "font-normal text-muted-foreground",
            )}
          >
            {preview}
          </p>
        </div>
        {unread ? (
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary" />
        ) : null}
      </div>
    </Link>
  );
}

/** The three threads the prototype ships with, in the order the frame lists them. */
const THREADS = [
  { id: "sarah-jenskins", name: "partner", preview: "list.sarahPreview", unread: true },
  {
    id: "christopher-nolan",
    name: "list.christopher",
    preview: "list.christopherPreview",
    unread: true,
  },
  { id: "james-gunn", name: "list.james", preview: "list.jamesPreview", unread: false },
] as const;

/** The portrait each thread carries — `sarah` is `ChatAvatar`'s own default. */
const THREAD_AVATAR = {
  "sarah-jenskins": <ChatAvatar presence="online" size={40} />,
  "christopher-nolan": <ChatAvatar crop={false} presence="online" size={40} src={chris} />,
  "james-gunn": <ChatAvatar crop={false} presence="away" size={40} src={james} />,
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
        <InputGroup className="gap-2 rounded-card border-border bg-muted px-3.5 shadow-none">
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

      {/* The rows carry the card surface themselves, so the list closes with a
          hairline at the top and needs nothing else to read as one block. */}
      <div className="flex w-full min-h-0 flex-1 flex-col items-start overflow-y-auto border-t border-border">
        {THREADS.map((thread) => (
          <ChatRow
            active={thread.id === activeId}
            avatar={THREAD_AVATAR[thread.id]}
            href={`/chat/${thread.id}`}
            key={thread.id}
            name={t(thread.name)}
            preview={t(thread.preview)}
            unread={thread.unread}
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
             the list with an 18px video glyph and a join affordance.
             `bg-primary/10` lands a hair off `--accent-surface`, the token that
             exists for exactly this: the accent as a status ground. The glyph
             gets the card surface under it so it reads as a mark, and the join
             becomes a real button — a session starting in five minutes is the
             one thing on this screen worth a filled control. */
          <div className="flex h-16 w-full shrink-0 items-center gap-3 overflow-clip border-b border-border bg-accent-surface px-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card">
              <Video aria-hidden className="size-4.5 text-primary" />
            </span>
            <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
              <p className="w-full truncate text-sm font-semibold text-foreground">
                {n("sessionBannerTitle")}
              </p>
              <p className="w-full truncate text-xs font-normal tabular-nums text-muted-foreground">
                {n("sessionBannerBody")}
              </p>
            </div>
            <Button className="h-8 shrink-0 px-3.5 text-xs font-medium">
              {n("sessionBannerAction")}
            </Button>
          </div>
        ) : null}

        {isEmpty ? (
          /* Figma "Empty State" — illustration, copy, then the 200px CTA. It is
             `EmptyState` now: the same four parts every empty list in the app
             shows, at the one size they all show them. */
          <div className="flex w-full flex-1 flex-col items-center justify-center pb-6">
            <EmptyState
              action={
                <PrimaryButton className="w-50" href="/matching">
                  {t("emptyAction")}
                </PrimaryButton>
              }
              body={t("emptyBody")}
              illustration={emptyIllustration}
              title={t("emptyTitle")}
            />
          </div>
        ) : (
          /* Figma's desktop frame stands the list in the left half of a card
             and leaves the right half waiting for a thread to be picked. */
          <div className={cn("flex w-full min-h-0 flex-1 flex-col items-start", CHAT_PANE)}>
            <ChatList className="lg:h-full lg:w-80 lg:shrink-0 lg:border-e lg:border-border lg:pt-4" />
            <div className="hidden lg:flex lg:min-w-px lg:flex-1 lg:items-center lg:justify-center lg:bg-background lg:p-10">
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

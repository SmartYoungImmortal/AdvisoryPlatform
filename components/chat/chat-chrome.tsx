"use client";

import Link from "next/link";
import { ChevronLeft, Info, Paperclip, RotateCw, SendHorizontal, ShieldAlert, WifiOff } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useLayoutEffect, useRef, type ReactNode } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { AppFrame, PHONE_BAR } from "@/components/account/app-frame";
import { authPill } from "@/components/auth/auth-split";
import { BottomBar } from "@/components/bottombar";
import { ApiError } from "@/lib/api/client";
import { getOwnProfile } from "@/lib/api/resources";
import type { ApiOwnProfile } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PersonAvatar } from "@/components/chat/chat-avatar";
import { CHAT_FILE_ACCEPT, CHAT_MESSAGE_MAX_LENGTH } from "@/components/chat/chat-data";
import { useHourStyle } from "@/components/chat/chat-hooks";
import { useChatConnection, useConnection } from "@/components/chat/chat-live";
import { findOffPlatform, offPlatformKinds, type Counterpart } from "@/components/chat/chat-logic";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------- frame */

/**
 * The page every chat screen stands in.
 *
 * From `lg` it is the app frame (`AppFrame`): the rail at the left and the
 * white panel, which the chat fills edge to edge and top to bottom: the list,
 * the open thread and the details beside it, each scrolling on its own. The
 * column is told to take exactly the panel's height (`basis-0`), so the page
 * itself never scrolls: a messenger is a window, not a document.
 *
 * Below `lg` the frame steps aside and the card is the screen. `phone` says
 * how: the inbox scrolls as a page under the floating bar and over the tab
 * bar; a thread is a fixed column (its header, the messages scrolling between,
 * the composer) with no app bar at all, because its own header carries the way
 * back.
 *
 * Every chat screen stands in this frame, so it is also what holds the live
 * connection (`./chat-live`) for as long as one of them is open.
 */
export function ChatFrame({
  phone,
  children,
}: {
  readonly phone: "page" | "thread";
  readonly children: ReactNode;
}) {
  const page = phone === "page";
  return (
    <MobileScreen className="pb-0" wide="md">
      <LiveConnection />
      <AppFrame active="chat">
        <ScreenBody className={cn("bg-card lg:pb-0", page ? "pb-18" : "pb-0")}>
          {page ? (
            <div className={PHONE_BAR}>
              <TopBar dock unreadNotifications />
            </div>
          ) : null}
          <AccountShell active="chat" className="lg:min-h-0 lg:shrink lg:basis-0" compact>
            <div
              className={cn(
                "flex w-full flex-1 flex-col bg-card",
                !page && "min-h-0",
                "lg:min-h-0 lg:flex-row lg:overflow-hidden",
              )}
              data-slot="chat-card"
            >
              {children}
            </div>
          </AccountShell>
        </ScreenBody>
      </AppFrame>
      {page ? <BottomBar className="lg:hidden" role="user" selected="chat" /> : null}
    </MobileScreen>
  );
}

/** Holds the socket open while a chat screen is; `users/me` says whose lines are whose. */
function LiveConnection() {
  const me = useResource<ApiOwnProfile>("users/me", getOwnProfile);
  useChatConnection(me.data?.id);
  return null;
}

/**
 * One quiet line when the live connection has been down for a while, or when
 * the session behind it has ended. A dropped connection that comes back within
 * a few seconds is never mentioned (`NOTICE_AFTER_MS` in `./chat-live`).
 */
export function ConnectionNote({ className }: { readonly className?: string }) {
  const t = useTranslations("chat");
  const c = useTranslations("common");
  const connection = useConnection();
  if (!connection.noticeable) return null;
  const signedOut = connection.status === "unauthorized";
  return (
    // `<output>`: a status region by its own semantics (polite, implicit `status` role).
    <output className={cn("flex items-start gap-1.5 text-xs text-muted-foreground lg:text-frame-meta", className)}>
      <WifiOff aria-hidden className="mt-0.5 size-3.5 shrink-0 lg:mt-1 lg:size-4" />
      <span className="min-w-0">
        {signedOut ? t("liveSignedOut") : t("reconnecting")}
        {signedOut ? (
          <>
            {" "}
            <Link className="font-semibold text-foreground underline underline-offset-2" href="/login">
              {c("login")}
            </Link>
          </>
        ) : null}
      </span>
    </output>
  );
}

/* -------------------------------------------------------------------- error */

/**
 * What a chat block says when the API answered with a failure: the API's own
 * sentence, verbatim (the same rule as `ApiErrorCard` in
 * `components/service/parts.tsx`, which is the only thing that tells "no
 * session" from "the container is not running"), and the one way on. Signed
 * out, that is signing in, since asking again cannot change who you are;
 * otherwise it is asking again. Drawn here rather than borrowed so its type
 * follows the chat's desktop scale.
 */
export function ChatError({
  title,
  error,
  onRetry,
  className,
}: {
  readonly title: string;
  readonly error: Error;
  readonly onRetry?: () => void;
  readonly className?: string;
}) {
  const t = useTranslations("chat");
  const c = useTranslations("common");
  const signedOut = error instanceof ApiError && error.isUnauthenticated;

  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-3 rounded-card border border-hero-card-border bg-card p-5 shadow-hero-card",
        className,
      )}
      role="alert"
    >
      <p className="text-base font-semibold text-foreground lg:text-lg">{title}</p>
      <p className="text-sm text-muted-foreground lg:text-base">{error.message}</p>
      {signedOut ? (
        <Button className={cn(authPill(true), "w-auto")} nativeButton={false} render={<Link href="/login" />}>
          {c("login")}
        </Button>
      ) : null}
      {!signedOut && onRetry ? (
        <Button className={cn(authPill(), "w-auto")} onClick={onRetry} type="button" variant="outline">
          <RotateCw aria-hidden />
          {t("retry")}
        </Button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------- header */

/** What a room is called: the person, else what we know of them, else the room. */
export function counterpartName(
  counterpart: Counterpart,
  t: (key: "advisorFallback" | "roomLabel") => string,
): string {
  if (counterpart.advisor) return counterpart.advisor.displayName;
  if (counterpart.person) return counterpart.person.displayName;
  return counterpart.userId ? t("advisorFallback") : t("roomLabel");
}

/**
 * The thread's head: who this is, and what it is about.
 *
 * The line under the name is the consultation itself when the room's booking
 * is known (the service and its date), the advisor's own headline when only
 * the person is, and nothing it would have to make up otherwise. On a phone it
 * leads with the way back and ends on the details, which a desktop keeps open
 * beside the thread instead.
 */
export function ThreadHeader({
  counterpart,
  loading,
  detailsOpen = false,
  onToggleDetails,
}: {
  readonly counterpart: Counterpart;
  readonly loading: boolean;
  readonly detailsOpen?: boolean;
  /** The details: a column beside the thread on a desktop, a sheet on a phone. */
  readonly onToggleDetails?: () => void;
}) {
  const t = useTranslations("chat");
  const c = useTranslations("common");
  const format = useFormatter();
  const hour = useHourStyle();
  const { advisor, booking, service } = counterpart;
  const name = counterpartName(counterpart, t);

  let subtitle: string | null = advisor?.headline ?? null;
  if (booking) {
    const when = format.dateTime(new Date(booking.startTime), {
      day: "numeric",
      month: "short",
      hour,
      minute: "2-digit",
    });
    subtitle = service ? `${service.name} · ${when}` : t("sessionOn", { date: when });
  }

  return (
    <header className="relative z-1 flex h-16 w-full shrink-0 items-center gap-1 border-b border-border bg-card px-1.5 lg:h-22 lg:gap-3 lg:px-6">
      <Button
        aria-label={c("back")}
        className="size-11 shrink-0 rounded-full lg:hidden"
        nativeButton={false}
        render={<Link href="/chat" />}
        size="icon"
        variant="ghost"
      >
        <ChevronLeft className="size-6" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        {loading ? (
          <span aria-hidden className="size-10 shrink-0 rounded-full bg-muted lg:size-12" />
        ) : (
          <>
            <PersonAvatar
              advisor={advisor}
              className="lg:hidden"
              known={counterpart.userId !== null}
              person={counterpart.person}
              size={40}
              verified={advisor !== null}
            />
            <PersonAvatar
              advisor={advisor}
              className="hidden lg:inline-flex"
              known={counterpart.userId !== null}
              person={counterpart.person}
              size={48}
              verified={advisor !== null}
            />
          </>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          {loading ? (
            <>
              <span aria-hidden className="h-4 w-32 rounded-md bg-muted" />
              <span aria-hidden className="mt-1.5 h-3 w-44 rounded-md bg-muted" />
            </>
          ) : (
            <>
              <h2 className="truncate text-base font-semibold text-foreground lg:text-2xl">
                {name}
                {advisor ? <span className="sr-only"> · {t("verified")}</span> : null}
              </h2>
              {subtitle ? (
                <p className="truncate text-xs text-muted-foreground lg:text-base">{subtitle}</p>
              ) : null}
            </>
          )}
        </div>
      </div>

      {onToggleDetails ? (
        <Button
          aria-expanded={detailsOpen}
          aria-label={t("details")}
          className="size-11 shrink-0 rounded-full lg:size-12"
          onClick={onToggleDetails}
          size="icon"
          variant="ghost"
        >
          <Info className="size-5.5" />
        </Button>
      ) : null}
    </header>
  );
}

/* ----------------------------------------------------------------- composer */

/**
 * The compose row: attach, write, send.
 *
 * **Text** goes out as `chat:send` over the live connection (`onSend`); the
 * thread draws it at once as sending and then as sent or not sent, with a way
 * to try again. Enter sends and Shift+Enter starts a new line (an input method
 * still composing a word keeps its Enter). The field grows with the text up to
 * a limit and scrolls after that.
 *
 * **A file** goes up through `POST /chat/rooms/:id/files`; the thread shows it
 * on its way and, if the API turns it down, why and how to try again (`onPick`
 * hands the file over; the bubbles are the thread's).
 *
 * The draft belongs to the thread (`draft`, `onDraftChange`), so it can be
 * handed text to look over, and a phone number or LINE id typed into it is
 * pointed out before it is sent.
 */
export function Composer({
  enabled,
  draft,
  onDraftChange,
  onSend,
  onPick,
  recipient,
}: {
  /** False for anything that is not one of my rooms: nothing can be sent there. */
  readonly enabled: boolean;
  readonly draft: string;
  readonly onDraftChange: (draft: string) => void;
  readonly onSend: (text: string) => void;
  readonly onPick: (file: File) => void;
  /** Who the line is for, once known, for the field's accessible name. */
  readonly recipient?: string;
}) {
  const t = useTranslations("chat");
  const format = useFormatter();
  const connection = useConnection();
  const field = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  const kinds = offPlatformKinds(findOffPlatform(draft));
  const nearLimit = draft.length > CHAT_MESSAGE_MAX_LENGTH * 0.9;
  const canSend = enabled && draft.trim().length > 0 && connection.status !== "unauthorized";

  // `field-sizing: content` (on `Textarea`) grows the field where it is
  // supported; elsewhere it is measured, capped by `max-h-40` either way.
  useLayoutEffect(() => {
    const element = field.current;
    if (!element || CSS.supports("field-sizing", "content")) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [draft]);

  function submit() {
    if (!canSend) return;
    onSend(draft);
    onDraftChange("");
    // Keeps a phone's keyboard up for the next line.
    field.current?.focus();
  }

  return (
    <div className="w-full shrink-0 border-t border-border bg-card px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-6 lg:pt-4 lg:pb-5">
      <ConnectionNote className="mb-2.5 px-1" />

      {/* The hidden control behind the paperclip. `Input` carries the primitive's states. */}
      <Input
        accept={CHAT_FILE_ACCEPT}
        aria-hidden
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPick(file);
        }}
        ref={picker}
        tabIndex={-1}
        type="file"
      />

      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Button
          aria-label={t("attach")}
          className="size-11 shrink-0 rounded-full text-foreground lg:size-12"
          disabled={!enabled}
          onClick={() => picker.current?.click()}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Paperclip className="size-5.5" />
        </Button>

        <div className="flex min-w-0 flex-1 flex-col">
          <Textarea
            aria-label={recipient ? t("composerLabelTo", { name: recipient }) : t("composerLabel")}
            className="max-h-40 min-h-11 resize-none rounded-3xl border-border bg-muted/60 px-4 py-2.5 text-base shadow-none md:text-base lg:min-h-12 lg:py-3 lg:text-lg"
            disabled={!enabled}
            enterKeyHint="send"
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
              event.preventDefault();
              submit();
            }}
            placeholder={t("composerPlaceholder")}
            ref={field}
            rows={1}
            value={draft}
          />
        </div>

        <Button
          aria-label={t("send")}
          className={cn(
            "size-11 shrink-0 rounded-full border-0 lg:size-12",
            canSend
              ? "bg-hero-action text-hero-action-foreground hover:bg-hero-action/85"
              : "bg-muted text-muted-foreground disabled:opacity-100",
          )}
          disabled={!canSend}
          size="icon"
          type="submit"
        >
          <SendHorizontal className="size-5" />
        </Button>
      </form>

      {/* At most one quiet line under the row: what the draft would take off
          the platform, else how close it is to the limit. */}
      {kinds.length > 0 ? (
        <output className="mt-2 flex items-start gap-1.5 px-1 text-xs text-muted-foreground lg:text-frame-meta">
          <ShieldAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warning lg:mt-1 lg:size-4" />
          {t("flagDraft", {
            kinds: format.list(
              kinds.map((kind) => t(`flag.${kind}`)),
              { type: "conjunction" },
            ),
          })}
        </output>
      ) : null}
      {kinds.length === 0 && nearLimit ? (
        <p className="mt-2 px-1 text-right font-latin text-xs text-muted-foreground tabular-nums lg:text-frame-meta">
          {format.number(draft.length)}/{format.number(CHAT_MESSAGE_MAX_LENGTH)}
        </p>
      ) : null}
    </div>
  );
}

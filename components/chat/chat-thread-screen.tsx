"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, LoaderCircle, MessageCircleOff, MessagesSquare } from "lucide-react";
import { useFormatter, useTimeZone, useTranslations } from "next-intl";
import { Fragment, Suspense, useEffect, useRef, useState, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { liveAdvisorHref, useMountTime } from "@/components/bookings/booking-flow";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/chat/chat-avatar";
import { ChatError, ChatFrame, Composer, counterpartName, ThreadHeader } from "@/components/chat/chat-chrome";
import {
  chatReportHref,
  isChatRoomId,
  listChatMessages,
  MAX_CHAT_FILE_BYTES,
  uploadChatFile,
  type ApiChatMessage,
  type ApiChatRoom,
} from "@/components/chat/chat-data";
import { DetailsSheet, ThreadDetails } from "@/components/chat/chat-details";
import {
  counterpartFor,
  newestRoomId,
  noteFileSent,
  roomWith,
  useChatPeople,
  useClock,
  useDesktop,
  useInbox,
  useRoomTimeline,
  useSentFiles,
} from "@/components/chat/chat-hooks";
import { CHAT_LIST_PANE, ChatList } from "@/components/chat/chat-inbox-screen";
import {
  dismissChatMessage,
  markRoomRead,
  retryChatMessage,
  sendChatMessage,
  useDocumentVisible,
  usePendingSends,
  useReadMarks,
  useRoomLiveMessages,
  useRoomSubscriptions,
  type SendFailure,
} from "@/components/chat/chat-live";
import {
  dayKey,
  daysBetween,
  findOffPlatform,
  groupThread,
  mergeMessages,
  newestOf,
  NO_COUNTERPART,
  toTimeline,
  type Counterpart,
  type SenderRun,
} from "@/components/chat/chat-logic";
import {
  DayDivider,
  FileBubble,
  fileSize,
  OffPlatformNotice,
  OutgoingBubble,
  PendingTextBubble,
  TextBubble,
  ThreadSkeleton,
} from "@/components/chat/messages";
import { cn } from "@/lib/utils";

/**
 * `/chat/room?id=<uuid>`, and the `/message-failed` frame of it.
 *
 * ## Where the room comes from
 *
 * The uuid rides on the query (`chatHref` in `./chat-data` says why), read
 * through `useSearchParams` rather than the app's `useQueryValue`: moving
 * between rooms is a Link to the same path with another `?id=`, which the
 * router reports and a `popstate` subscription never hears. `?with=<user>`
 * opens the newest room with that person, for a button that knows the advisor
 * and not the room. A uuid in the path is honoured too, for the day the export
 * can prerender them. Anything else (the three prototype slugs) is not one of
 * your conversations, and the screen says so.
 *
 * ## What it reads
 *
 * The room's messages and files (`useRoomTimeline`), interleaved by time, with
 * whatever has arrived live since (`./chat-live`, merged by id); the inbox, for
 * the room itself and the list beside it; and the people lookups that name the
 * other side (`resolveCounterpart`). `GET /users/me` is still the only way to
 * tell my lines from theirs.
 *
 * ## What it writes
 *
 * Lines of text (`chat:send`, drawn at once as sending, then sent or not sent
 * with a way to try again), the files you attach, and the read marker: once per
 * newest line, only while the room still counts unread lines and the page is
 * in front of the reader.
 */

export function ChatThreadScreen({
  threadId,
  state = "default",
}: {
  /** The route segment: `room`, a prototype slug, or one day a uuid. */
  readonly threadId: string;
  /** `/chat/[id]/message-failed` draws the failed line; the API has no such state. */
  readonly state?: "default" | "message-failed";
}) {
  return (
    <ChatFrame phone="thread">
      {/* The prerendered page cannot know the query, so it ships the frame's
          shape and the room fills in on the client. */}
      <Suspense fallback={<ThreadLayout pane={<PaneSkeleton />} />}>
        <ThreadRoute slug={threadId} state={state} />
      </Suspense>
    </ChatFrame>
  );
}

/** The list beside whatever the centre holds, from `lg`. */
function ThreadLayout({ activeId, pane }: { readonly activeId?: string; readonly pane: ReactNode }) {
  return (
    <>
      <ChatList activeId={activeId} banner="off" className={cn("hidden lg:flex", CHAT_LIST_PANE)} />
      {pane}
    </>
  );
}

/**
 * `/chat` on a desktop: the latest conversation open beside the list, as a
 * messenger opens. Nothing on a phone, where the list is the whole screen and a
 * thread mounted out of sight would mark its room read.
 */
export function NewestThread() {
  const inbox = useInbox();
  const desktop = useDesktop();
  if (!desktop) return null;
  const roomId = newestRoomId(inbox.data);
  if (roomId === undefined) return <PaneSkeleton />;
  if (roomId === null) return null;
  return <ThreadPane key={roomId} roomId={roomId} state="default" />;
}

/** The room the address names outright: `?id=`, else the route's own slug when it is a room id. */
function directRoomId(queried: string | null, slug: string): string | null {
  if (queried && isChatRoomId(queried)) return queried;
  return isChatRoomId(slug) ? slug : null;
}

function ThreadRoute({ slug, state }: { readonly slug: string; readonly state: "default" | "message-failed" }) {
  const params = useSearchParams();
  const inbox = useInbox();
  const people = useChatPeople();

  const queried = params.get("id");
  const withUser = params.get("with");
  const direct = directRoomId(queried, slug);

  let roomId: string | null | undefined = direct;
  if (!roomId && withUser && isChatRoomId(withUser)) roomId = roomWith(withUser, inbox, people);
  // The frame is a picture of a state, so on a prototype slug it borrows your
  // newest conversation rather than drawing the failure over nothing.
  else if (!roomId && state === "message-failed") roomId = inbox.error ? null : newestRoomId(inbox.data);

  if (roomId === undefined) return <ThreadLayout pane={<PaneSkeleton />} />;

  if (roomId === null) {
    const advisorId = withUser && isChatRoomId(withUser) ? withUser : null;
    return <ThreadLayout pane={<NoRoom advisorId={advisorId} />} />;
  }

  return (
    <ThreadLayout
      activeId={roomId}
      // A new room is a new pane: its uploads, older pages and sheet start clean.
      pane={<ThreadPane key={roomId} roomId={roomId} state={state} />}
    />
  );
}

/* ------------------------------------------------------------------- panes */

/** The centre's shape while the route is being worked out. */
function PaneSkeleton() {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col border-border bg-card lg:border-l">
      <ThreadHeader counterpart={NO_COUNTERPART} loading />
      <div className="flex min-h-0 flex-1 flex-col justify-end px-4 lg:px-8">
        <ThreadSkeleton />
      </div>
    </section>
  );
}

/**
 * Not one of your conversations: a prototype slug, a broken link, or a person
 * you have no room with yet. Said plainly, with the way on: for a person, that
 * a chat opens once a consultation is booked, and their services first, since
 * booking one is what opens it. No room is opened before a booking.
 */
function NoRoom({ advisorId }: { readonly advisorId: string | null }) {
  const t = useTranslations("chat");
  const c = useTranslations("common");
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col border-border bg-card lg:border-l">
      {/* Nobody to name, so the phone's bar is only the way back. */}
      <div className="flex h-16 items-center gap-1 border-b border-border px-1.5 lg:hidden">
        <Button
          aria-label={c("back")}
          className="size-11 rounded-full"
          nativeButton={false}
          render={<Link href="/chat" />}
          size="icon"
          variant="ghost"
        >
          <ChevronLeft className="size-6" />
        </Button>
        <span className="text-base font-semibold text-foreground">{t("title")}</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-muted">
          <MessageCircleOff aria-hidden className="size-7 text-muted-foreground" />
        </span>
        <div className="flex max-w-md flex-col gap-1.5">
          <h1 className="font-hero text-2xl tracking-tight text-hero-ink lg:text-3xl">
            {advisorId ? t("noRoomWithTitle") : t("notARoomTitle")}
          </h1>
          <p className="text-sm text-muted-foreground lg:text-base">
            {advisorId ? t("noRoomWithBody") : t("notARoomBody")}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {advisorId ? (
            <>
              <Button className={cn(authPill(true), "w-auto")} nativeButton={false} render={<Link href={liveAdvisorHref(advisorId)} />}>
                {t("seeServices")}
              </Button>
              <Button className={cn(authPill(), "w-auto")} nativeButton={false} render={<Link href="/chat" />} variant="outline">
                {t("goToChats")}
              </Button>
            </>
          ) : (
            <Button className={cn(authPill(true), "w-auto")} nativeButton={false} render={<Link href="/chat" />}>
              {t("goToChats")}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

/** A file of mine on its way up, or turned down. */
type Outgoing = {
  readonly key: number;
  readonly file: File;
  readonly status: "sending" | "failed";
  readonly reason: string | null;
};

type ChatT = ReturnType<typeof useTranslations<"chat">>;

/**
 * Whether anything here is unread: a line from them after both my mark in this
 * tab and the room's own, or (before this tab marked anything) the room's count.
 */
function roomUnread({
  me,
  room,
  messages,
  readThrough,
}: {
  readonly me: string;
  readonly room: ApiChatRoom | undefined;
  readonly messages: readonly ApiChatMessage[];
  readonly readThrough: number | undefined;
}): boolean {
  const floor = Math.max(
    readThrough ?? Number.NEGATIVE_INFINITY,
    room?.lastReadAt ? Date.parse(room.lastReadAt) : Number.NEGATIVE_INFINITY,
  );
  if (messages.some((message) => message.senderUserId !== me && Date.parse(message.createdAt) > floor)) return true;
  return readThrough === undefined && (room?.unreadCount ?? 0) > 0;
}

/** Why a line did not go, in words; the API's own sentence when it gave one. */
function sendFailureText(failure: SendFailure | null, t: ChatT): string | null {
  if (!failure) return null;
  if (failure.kind === "offline") return t("sendOffline");
  // The API's own sentence ("Chat room not found", "Validation failed").
  if (failure.kind === "server" && failure.message) return failure.message;
  return t("sendUnconfirmed");
}

/** A day's divider: today, yesterday, else the date (with the year only when it is not this one). */
function threadDayLabel({
  day,
  at,
  now,
  timeZone,
  t,
  format,
}: {
  readonly day: string;
  readonly at: number;
  readonly now: number;
  readonly timeZone: string;
  readonly t: ChatT;
  readonly format: ReturnType<typeof useFormatter>;
}): string {
  const today = dayKey(now, timeZone);
  const ago = daysBetween(day, today);
  if (ago === 0) return t("today");
  if (ago === 1) return t("yesterday");
  return format.dateTime(new Date(at), {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(day.slice(0, 4) === today.slice(0, 4) ? {} : { year: "numeric" }),
  });
}

/** The thread could not be read: the API's sentence and a retry, centred. */
function ThreadLoadFailed({ error, onRetry }: { readonly error: Error; readonly onRetry: () => void }) {
  const t = useTranslations("chat");
  return (
    <div className="flex flex-1 items-center justify-center py-10">
      <ChatError className="max-w-md" error={error} onRetry={onRetry} title={t("threadLoadFailedTitle")} />
    </div>
  );
}

/** A room with nothing in it yet. */
function ThreadEmpty() {
  const t = useTranslations("chat");
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted">
        <MessagesSquare aria-hidden className="size-6 text-muted-foreground" />
      </span>
      <p className="text-base font-semibold text-foreground lg:text-lg">{t("threadEmptyTitle")}</p>
      <p className="max-w-xs text-sm text-muted-foreground lg:max-w-sm lg:text-base">{t("threadEmptyBodyLive")}</p>
    </div>
  );
}

/** The way further back, at the top of a history that is not all here yet. */
function LoadEarlier({
  busy,
  failed,
  onLoad,
}: {
  readonly busy: boolean;
  readonly failed: string | null;
  readonly onLoad: () => void;
}) {
  const t = useTranslations("chat");
  return (
    <div className="flex flex-col items-center gap-1.5 pt-6 pb-2">
      <Button
        aria-busy={busy || undefined}
        className="h-11 gap-2 rounded-full px-5 text-sm font-medium lg:h-12 lg:text-base"
        disabled={busy}
        onClick={onLoad}
        type="button"
        variant="outline"
      >
        {busy ? <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" /> : null}
        {t("loadEarlier")}
      </Button>
      {failed ? (
        <p className="text-xs text-destructive lg:text-base" role="alert">
          {t("loadEarlierFailed")} · {failed}
        </p>
      ) : null}
    </div>
  );
}

function ThreadPane({ roomId, state }: { readonly roomId: string; readonly state: "default" | "message-failed" }) {
  const t = useTranslations("chat");
  const format = useFormatter();
  const timeZone = useTimeZone() ?? "Asia/Bangkok";
  const now = useMountTime();
  const inbox = useInbox();
  const people = useChatPeople();
  const readMarks = useReadMarks();
  const visible = useDocumentVisible();
  const { messages, files } = useRoomTimeline(roomId);
  const live = useRoomLiveMessages(roomId);
  const pending = usePendingSends(roomId);
  const sent = useSentFiles(roomId);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const desktop = useDesktop();
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);
  useRoomSubscriptions([roomId]);

  const room = inbox.data?.find((entry) => entry.room.id === roomId)?.room;
  const me = people.me.data?.id;

  /* ---- older pages ------------------------------------------------------ */

  // The first page is the cached read; anything before it is fetched on asking,
  // a page at a time on the API's own cursor, and kept here for this room.
  const [earlier, setEarlier] = useState<{
    readonly items: readonly ApiChatMessage[];
    readonly cursor: string | null;
    readonly busy: boolean;
    readonly failed: string | null;
  }>({ items: [], cursor: null, busy: false, failed: null });
  const firstPage = messages.data;
  const cursor =
    earlier.items.length > 0 ? earlier.cursor : firstPage?.hasMore ? firstPage.nextCursor : null;
  const complete = firstPage !== undefined && cursor === null;

  async function loadEarlier() {
    if (!cursor || earlier.busy) return;
    setEarlier((state) => ({ ...state, busy: true, failed: null }));
    try {
      const page = await listChatMessages(roomId, { cursor, limit: 50 });
      setEarlier((state) => ({
        items: [...state.items, ...page.items],
        cursor: page.hasMore ? page.nextCursor : null,
        busy: false,
        failed: null,
      }));
    } catch (cause) {
      setEarlier((state) => ({
        ...state,
        busy: false,
        failed: cause instanceof Error ? cause.message : String(cause),
      }));
    }
  }

  // Server files first; a file sent from this tab stays until a read lists it.
  const listed = files.data?.items ?? [];
  const listedIds = new Set(listed.map((file) => file.id));
  const allFiles = [...listed, ...sent.filter((file) => !listedIds.has(file.id))];
  const allMessages = mergeMessages(firstPage?.items ?? [], earlier.items, live);
  const entries = toTimeline(allMessages, allFiles);
  const senders = [...new Set(entries.map((entry) => entry.senderId))];
  const counterpart = counterpartFor(room, senders, people);
  const days = groupThread(entries, me, timeZone);

  /* ---- the read marker -------------------------------------------------- */

  // Written once per (room, newest line), only while something here is unread
  // and only while the page is in front of the reader, so a line that arrives
  // as they read is read and one that arrives in a background tab is not. The
  // ref stops a re-render from writing it twice.
  const marked = useRef<string | null>(null);
  const newest = newestOf(allMessages);
  const unread =
    me !== undefined && !inbox.loading && roomUnread({ me, room, messages: allMessages, readThrough: readMarks.get(roomId) });
  useEffect(() => {
    if (!visible || !newest || !unread) return;
    const stamp = `${roomId}:${newest.id}`;
    if (marked.current === stamp) return;
    marked.current = stamp;
    markRoomRead(roomId, newest.id).catch(() => {
      // Not worth a banner: the thread is on screen and readable, and the
      // next line or visit tries again.
      marked.current = null;
    });
  }, [newest, roomId, unread, visible]);

  /* ---- text ------------------------------------------------------------- */

  function sendText(text: string) {
    sendChatMessage(roomId, text);
    // Back to the newest line: the top of a reversed column is its bottom.
    log.current?.scrollTo({ top: 0 });
  }

  const failureText = (failure: SendFailure | null) => sendFailureText(failure, t);

  /* ---- uploads ---------------------------------------------------------- */

  const [outgoing, setOutgoing] = useState<readonly Outgoing[]>([]);
  const nextKey = useRef(0);

  async function send(file: File, key: number) {
    const update = (patch: Partial<Outgoing>) =>
      setOutgoing((all) => all.map((item) => (item.key === key ? { ...item, ...patch } : item)));
    const fail = (reason: string) => update({ status: "failed", reason });

    // The API refuses more (a CHECK in Postgres too); saying so here spares the upload.
    if (file.size > MAX_CHAT_FILE_BYTES) {
      fail(t("tooLarge", { size: fileSize(MAX_CHAT_FILE_BYTES) }));
      return;
    }
    update({ status: "sending", reason: null });
    try {
      const created = await uploadChatFile(roomId, file);
      noteFileSent(created);
      setOutgoing((all) => all.filter((item) => item.key !== key));
    } catch (cause) {
      // The API's own sentence: "That file type is not accepted in chat", "File
      // storage is currently unavailable", each of which the reader needs told apart.
      fail(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function pick(file: File) {
    const key = nextKey.current++;
    setOutgoing((all) => [...all, { key, file, status: "sending", reason: null }]);
    void send(file, key);
  }

  /* ---- the failed-message frame ----------------------------------------- */

  // A picture of the state, drawn over your newest room. Trying it again hands
  // the line to the composer to be looked over and sent, rather than posting
  // words to a real person that its reader never wrote.
  const [failedLine, setFailedLine] = useState(state === "message-failed");

  /* ---- what the column shows -------------------------------------------- */

  const dayLabel = (day: string, at: number) => threadDayLabel({ day, at, now, timeZone, t, format });

  const loading = messages.loading || people.me.loading;
  const nothing = entries.length === 0 && outgoing.length === 0 && pending.length === 0 && !failedLine;

  let column: ReactNode;
  if (messages.error) {
    column = <ThreadLoadFailed error={messages.error} onRetry={messages.reload} />;
  } else if (loading) {
    column = <ThreadSkeleton />;
  } else if (nothing) {
    column = <ThreadEmpty />;
  } else {
    column = (
      <div className="flex flex-col pb-2">
        {/* With the whole history here, the top of it is the start of the
            conversation, and says so; otherwise it is the way further back. */}
        {complete ? <ThreadIntro counterpart={counterpart} openedAt={room?.createdAt} /> : null}
        {complete ? null : (
          <LoadEarlier busy={earlier.busy} failed={earlier.failed} onLoad={() => void loadEarlier()} />
        )}
        {days.map((day) => (
          <Fragment key={day.key}>
            <DayDivider>{dayLabel(day.day, day.at)}</DayDivider>
            {day.runs.map((run) => (
              <Run counterpart={counterpart} key={run.key} now={now} roomId={roomId} run={run} />
            ))}
          </Fragment>
        ))}

        {failedLine ? (
          <div className="pt-4">
            <PendingTextBubble
              onDismiss={() => setFailedLine(false)}
              onRetry={() => {
                setDraft(t("thread.failedText"));
                setFailedLine(false);
              }}
              status="failed"
              text={t("thread.failedText")}
            />
          </div>
        ) : null}

        {pending.map((item) => (
          <div className="pt-4" key={item.key}>
            <PendingTextBubble
              onDismiss={() => dismissChatMessage(roomId, item.key)}
              onRetry={() => retryChatMessage(roomId, item.key)}
              reason={failureText(item.failure)}
              status={item.status}
              text={item.text}
            />
          </div>
        ))}

        {outgoing.map((item) => (
          <div className="pt-4" key={item.key}>
            <OutgoingBubble
              image={item.file.type.startsWith("image/")}
              meta={fileSize(item.file.size)}
              name={item.file.name}
              onDismiss={() => setOutgoing((all) => all.filter((other) => other.key !== item.key))}
              onRetry={() => void send(item.file, item.key)}
              reason={item.reason}
              status={item.status}
            />
          </div>
        ))}
      </div>
    );
  }

  const details = (
    <ThreadDetails
      anonymous={room?.isAnonymous ?? false}
      bookings={people.bookings.data?.items ?? []}
      counterpart={counterpart}
      roomId={roomId}
      services={people.services.data?.items ?? []}
    />
  );
  // The same wait as the list's: a name that changed under the reader a beat
  // later would undo the point of naming them.
  const naming =
    loading || people.advisors.loading || people.bookings.loading || people.services.loading || inbox.loading;

  return (
    <>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-card lg:border-l lg:border-border" data-slot="chat-thread">
        <ThreadHeader
          counterpart={counterpart}
          detailsOpen={detailsOpen}
          loading={naming}
          onToggleDetails={() => setDetailsOpen((open) => !open)}
        />

        {/* Reversed, so the column starts at its newest line and stays there as
            lines arrive, without a script measuring heights. Its own scroller,
            kept out of the desktop's smooth page scroll. */}
        <div
          aria-label={t("title")}
          className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto overscroll-contain px-3 lg:px-8"
          data-lenis-prevent
          ref={log}
          role="log"
        >
          <div className={cn("flex w-full flex-col", (nothing || messages.error) && "flex-1")}>{column}</div>
        </div>

        <Composer
          draft={draft}
          enabled={!messages.error}
          onDraftChange={setDraft}
          onPick={pick}
          onSend={sendText}
          recipient={naming ? undefined : counterpartName(counterpart, t)}
        />
      </section>

      {/* Closed until asked for: the conversation has the room. */}
      {detailsOpen && desktop ? (
        <aside
          aria-label={t("details")}
          className="flex w-80 shrink-0 flex-col overflow-y-auto overscroll-contain border-l border-border px-5 py-8"
          data-lenis-prevent
        >
          {naming ? <DetailsSkeleton /> : details}
        </aside>
      ) : null}

      <DetailsSheet onOpenChange={setDetailsOpen} open={detailsOpen && !desktop}>
        {details}
      </DetailsSheet>
    </>
  );
}

/** The top of a conversation: who it is with, and when the room opened. */
function ThreadIntro({ counterpart, openedAt }: { readonly counterpart: Counterpart; readonly openedAt?: string }) {
  const t = useTranslations("chat");
  const format = useFormatter();
  return (
    <div className="flex flex-col items-center gap-2 pt-10 pb-4 text-center">
      <PersonAvatar
        advisor={counterpart.advisor}
        known={counterpart.userId !== null}
        person={counterpart.person}
        size={64}
        verified={counterpart.advisor !== null}
      />
      <p className="font-hero text-lg tracking-tight text-hero-ink lg:text-2xl">{counterpartName(counterpart, t)}</p>
      {openedAt ? (
        <p className="text-xs text-muted-foreground lg:text-base">
          {t("openedOn", { date: format.dateTime(new Date(openedAt), { day: "numeric", month: "long", year: "numeric" }) })}
        </p>
      ) : null}
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col items-center gap-3">
      <span className="size-20 rounded-full bg-muted" />
      <span className="h-5 w-36 rounded-md bg-muted" />
      <span className="h-4 w-48 rounded-md bg-muted" />
      <span className="mt-6 h-28 w-full rounded-card bg-muted" />
    </div>
  );
}

/* --------------------------------------------------------------------- run */

/**
 * One author's turn: the bubbles stacked tight, the other person's face beside
 * the last one, and the time once, under it.
 */
function Run({
  run,
  counterpart,
  roomId,
  now,
}: {
  readonly run: SenderRun;
  readonly counterpart: Counterpart;
  readonly roomId: string;
  readonly now: number;
}) {
  const clock = useClock();
  const last = run.items.at(-1);
  const mine = run.mine;

  return (
    <div className={cn("flex w-full flex-col pt-4", mine ? "items-end" : "items-start")}>
      <div className={cn("flex w-full items-start gap-2", mine ? "justify-end" : "justify-start")}>
        {mine ? null : <PersonAvatar advisor={counterpart.advisor} known person={counterpart.person} size={32} />}
        <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5", mine ? "items-end" : "items-start")}>
          {run.items.map(({ entry, first }) =>
            entry.kind === "message" ? (
              <Fragment key={entry.id}>
                <TextBubble first={first} mine={mine} text={entry.message.message} />
                {findOffPlatform(entry.message.message).length > 0 ? (
                  <OffPlatformNotice mine={mine} reportHref={chatReportHref(roomId)} text={entry.message.message} />
                ) : null}
              </Fragment>
            ) : (
              <FileBubble file={entry.file} first={first} key={entry.id} mine={mine} now={now} />
            ),
          )}
        </div>
      </div>
      {last ? (
        <time
          className={cn("mt-1 font-latin text-xs text-muted-foreground tabular-nums lg:text-base", mine ? "pr-1" : "pl-10")}
          dateTime={new Date(last.entry.at).toISOString()}
        >
          {clock(last.entry.at)}
        </time>
      ) : null}
    </div>
  );
}

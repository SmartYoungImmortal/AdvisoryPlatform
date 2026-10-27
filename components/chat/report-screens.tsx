"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, CircleCheck, MessagesSquare, ShieldCheck, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Suspense, useCallback, useId, useState, type ReactNode } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { AppFrame } from "@/components/account/app-frame";
import { authPill } from "@/components/auth/auth-split";
import { MobileScreen, ScreenBody, ScreenTopBar } from "@/components/mobile/screen";
import { StatusPill } from "@/components/mobile/status-pill";
import { ThaiText } from "@/components/mobile/thai-text";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { PersonAvatar } from "@/components/chat/chat-avatar";
import { ChatError, counterpartName } from "@/components/chat/chat-chrome";
import {
  chatHref,
  chatReportSentHref,
  isChatRoomId,
  listMyReports,
  submitReport,
  type ApiOwnReport,
  type ApiReportStatus,
} from "@/components/chat/chat-data";
import {
  counterpartFor,
  useChatPeople,
  useHourStyle,
  useInbox,
  useRoomTimeline,
} from "@/components/chat/chat-hooks";
import { reportCategories, type ReportCategory } from "@/lib/reports/categories";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/** The message key carrying each reason's label. */
const REASON_KEYS = {
  "off-platform": "reasonOffPlatform",
  scam: "reasonScam",
  harassment: "reasonHarassment",
  spam: "reasonSpam",
  misrepresentation: "reasonMisrepresentation",
  other: "reasonOther",
} as const satisfies Record<ReportCategory, string>;

/** How the report's status reads, and in what colour. */
const STATUS_TONE: Record<ApiReportStatus, "warning" | "success" | "neutral"> = {
  OPEN: "warning",
  ACTIONED: "success",
  DISMISSED: "neutral",
};

/** The details box's own limit; the API takes 2000 for the whole reason. */
const DETAILS_MAX = 500;

/**
 * The page both report screens stand in: on a phone a back chevron to the
 * thread over the form; from `lg` the app frame with chat current on the
 * rail, since the report is a step inside the chat.
 */
function ReportFrame({ back, children }: { readonly back: string; readonly children: ReactNode }) {
  const c = useTranslations("common");
  return (
    <MobileScreen className="bg-card pb-0" wide="md">
      <ScreenTopBar className="pt-3 lg:hidden" href={back} label={c("back")} />
      <AppFrame active="chat">
        <ScreenBody className="bg-card pb-6 lg:pb-0">
          <AccountShell active="chat">{children}</AccountShell>
        </ScreenBody>
      </AppFrame>
    </MobileScreen>
  );
}

/** The room id from `?id=` (or a uuid path segment), else null. */
function useRoomParam(slug: string): string | null {
  const params = useSearchParams();
  const queried = params.get("id");
  if (queried && isChatRoomId(queried)) return queried;
  return isChatRoomId(slug) ? slug : null;
}

/** A small heading over one part of the form. */
function FieldLabel({ children, id }: { readonly children: ReactNode; readonly id?: string }) {
  return (
    <p className="text-sm font-semibold text-foreground lg:text-lg" id={id}>
      {children}
    </p>
  );
}

/* ----------------------------------------------------------------- report */

/**
 * `/chat/room/report?id=<uuid>`: report the other person in a conversation.
 *
 * ## What it files
 *
 * `POST /reports` with the person (`reportedUserId`), the room, and a reason:
 * the chosen category's label, then whatever the reporter wrote. The API takes
 * the reporter from the session and nothing else, and it accepts no
 * attachments: the room *is* the evidence, since the console's case view
 * reads the whole conversation from it. So the form says the conversation is
 * attached (it is) instead of drawing file rows and an upload box with nothing
 * behind them, and there is no "block" switch, because no route blocks anyone.
 *
 * The person comes from the room (`resolveCounterpart`); a room where nobody
 * else has written and no booking names them cannot be reported from here,
 * and the form says so rather than guessing who to accuse.
 */
export function ReportScreen({ threadId }: { readonly threadId: string }) {
  return (
    <Suspense fallback={<ReportFrame back="/chat"><ReportSkeleton /></ReportFrame>}>
      <ReportRoute slug={threadId} />
    </Suspense>
  );
}

function ReportRoute({ slug }: { readonly slug: string }) {
  const roomId = useRoomParam(slug);
  if (!roomId) {
    return (
      <ReportFrame back="/chat">
        <NotARoom />
      </ReportFrame>
    );
  }
  return (
    <ReportFrame back={chatHref(roomId)}>
      <ReportForm roomId={roomId} />
    </ReportFrame>
  );
}

function ReportSkeleton() {
  return (
    <div aria-hidden className="flex w-full flex-col gap-4 px-6 pt-4 lg:px-0">
      <span className="h-9 w-2/3 rounded-md bg-muted" />
      <span className="h-5 w-full rounded-md bg-muted" />
      <span className="mt-4 h-40 w-full rounded-card bg-muted" />
    </div>
  );
}

function NotARoom() {
  const t = useTranslations("chat");
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="font-hero text-2xl tracking-tight text-hero-ink lg:text-3xl">{t("notARoomTitle")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground lg:max-w-md lg:text-base">{t("notARoomBody")}</p>
      <Button className={cn(authPill(true), "w-auto")} nativeButton={false} render={<Link href="/chat" />}>
        {t("goToChats")}
      </Button>
    </div>
  );
}

/**
 * The report being filled in about a room's other person, for the page and
 * the popup alike: who it is about, the chosen reason and the details, and
 * `submit`, which files it and answers the report as stored (or null, with
 * `failure` set to the API's own sentence).
 */
function useReportForm(roomId: string) {
  const t = useTranslations("report");
  const ct = useTranslations("chat");
  const inbox = useInbox();
  const people = useChatPeople();
  const { messages } = useRoomTimeline(roomId);

  const [category, setCategory] = useState<ReportCategory>("off-platform");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Error | null>(null);

  const room = inbox.data?.find((entry) => entry.room.id === roomId)?.room;
  const senders = [...new Set((messages.data?.items ?? []).map((m) => m.senderUserId))];
  const counterpart = counterpartFor(room, senders, people);
  const name = counterpartName(counterpart, ct);
  const resolving = messages.loading || inbox.loading || people.me.loading || people.bookings.loading;
  const reportable = counterpart.userId !== null;

  async function submit(): Promise<ApiOwnReport | null> {
    if (!counterpart.userId || sending) return null;
    setSending(true);
    setFailure(null);
    try {
      return await submitReport({
        reportedUserId: counterpart.userId,
        chatRoomId: roomId,
        reason: [t(REASON_KEYS[category]), details.trim()].filter(Boolean).join("\n\n"),
      });
    } catch (cause) {
      // The API's own sentence ("Chat room not found", "You cannot report
      // yourself"), which says what went wrong better than a guess would.
      // Only a failure gives the button back: a filed report moves on.
      setFailure(cause instanceof Error ? cause : new Error(String(cause)));
      setSending(false);
      return null;
    }
  }

  return { counterpart, name, resolving, reportable, category, setCategory, details, setDetails, sending, failure, submit };
}

function ReportForm({ roomId }: { readonly roomId: string }) {
  const t = useTranslations("report");
  const router = useRouter();
  const { counterpart, name, resolving, reportable, category, setCategory, details, setDetails, sending, failure, submit: file } =
    useReportForm(roomId);

  async function submit() {
    const report = await file();
    if (report) router.push(chatReportSentHref(roomId, report.id));
  }

  const who = (
    <div className="flex items-center gap-3 rounded-card border border-hero-card-border bg-card p-4 shadow-hero-card">
      {resolving ? (
        <span aria-hidden className="size-14 shrink-0 rounded-full bg-muted" />
      ) : (
        <PersonAvatar
          advisor={counterpart.advisor}
          known={counterpart.userId !== null}
          person={counterpart.person}
          size={56}
          verified={counterpart.advisor !== null}
        />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground lg:text-base">{t("whoLabel")}</span>
        <span className="truncate text-base font-semibold text-foreground lg:text-lg">{resolving ? "" : name}</span>
        {/* What the room is about: the service, else the advisor's headline. */}
        {counterpart.service || counterpart.advisor ? (
          <span className="truncate text-sm text-muted-foreground lg:text-base">
            {counterpart.service?.name ?? counterpart.advisor?.headline}
          </span>
        ) : null}
      </span>
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-6 px-6 pt-2 pb-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-x-12 lg:gap-y-8 lg:px-0 lg:pt-4">
      <header className="flex flex-col gap-2 lg:col-span-2">
        <Link
          className="hidden h-11 items-center gap-1 self-start text-base font-medium text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
          href={chatHref(roomId)}
        >
          <ChevronLeft aria-hidden className="size-4" />
          {t("backToChat")}
        </Link>
        <h1 className="font-hero text-2xl tracking-tight text-hero-ink lg:text-frame-title">
          {counterpart.advisor || counterpart.userId ? t("titleWith", { name }) : t("title")}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground lg:text-lg">
          {/* Broken at spaces only, so "เร็วขึ้น" never splits across lines. */}
          <ThaiText>{t("subtitle")}</ThaiText>
        </p>
      </header>

      <div className="lg:col-start-2 lg:row-start-2">{who}</div>

      <form
        className="flex flex-col gap-7 lg:col-start-1 lg:row-start-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">{t("reasonLabel")}</legend>
          <FieldLabel>{t("reasonLabel")}</FieldLabel>
          <RadioGroup
            className="grid grid-cols-1 gap-2 md:grid-cols-2"
            onValueChange={(value) => setCategory(value as ReportCategory)}
            value={category}
          >
            {reportCategories.map((option) => (
              <label
                className={cn(
                  "group flex min-h-14 cursor-pointer items-center gap-3 rounded-card border border-border bg-card px-4 py-3",
                  "transition-colors duration-150 hover:border-accented motion-reduce:transition-none",
                  "has-data-checked:border-hero-action has-data-checked:bg-muted/50 has-data-checked:ring-1 has-data-checked:ring-hero-action",
                )}
                key={option}
              >
                <RadioGroupItem className="size-5" value={option} />
                <span className="min-w-0 flex-1 text-base text-foreground group-has-data-checked:font-medium lg:text-lg">
                  {t(REASON_KEYS[option])}
                </span>
              </label>
            ))}
          </RadioGroup>
        </fieldset>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-foreground lg:text-lg" htmlFor="report-details">
            {t("detailsLabel")}
          </label>
          <div className="flex flex-col gap-1.5">
            <Textarea
              className="min-h-32 resize-none rounded-card border-border bg-card px-4 py-3 text-base shadow-none md:text-base lg:min-h-40 lg:text-lg"
              id="report-details"
              maxLength={DETAILS_MAX}
              onChange={(event) => setDetails(event.target.value)}
              placeholder={t("detailsPlaceholder")}
              value={details}
            />
            <p className="text-right font-latin text-xs text-muted-foreground tabular-nums lg:text-base">
              {details.length}/{DETAILS_MAX}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <FieldLabel>{t("evidenceLabel")}</FieldLabel>
          <div className="flex items-start gap-3 rounded-card bg-muted/60 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card">
              <MessagesSquare aria-hidden className="size-4.5 text-primary" />
            </span>
            <p className="min-w-0 flex-1 text-sm leading-6 text-foreground lg:text-base lg:leading-7">{t("evidenceAuto")}</p>
          </div>
        </div>

        {failure ? <ChatError error={failure} title={t("failedTitle")} /> : null}
        {!resolving && !reportable ? (
          <output className="block rounded-card bg-warning/10 p-4 text-sm text-foreground lg:text-base">
            {t("noCounterpart")}
          </output>
        ) : null}

        <div className="flex flex-col gap-3 md:flex-row">
          <Button
            aria-busy={sending || undefined}
            className={cn(authPill(true), "md:w-auto md:min-w-48")}
            disabled={sending || resolving || !reportable}
            type="submit"
          >
            {sending ? t("submitting") : t("submit")}
          </Button>
          <Button
            className={cn(authPill(), "md:w-auto")}
            nativeButton={false}
            render={<Link href={chatHref(roomId)} />}
            variant="outline"
          >
            {t("backToChat")}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------- submitted */

/**
 * `/chat/room/report/submitted?id=<uuid>&report=<id>`: the report, as filed.
 *
 * The summary is read back from `GET /reports/me` rather than carried over
 * from the form, so it shows what the API actually holds, status included.
 * Opened without a report to look up (a prototype slug, a link typed by hand)
 * it is the confirmation alone.
 */
export function ReportSubmittedScreen({ threadId }: { readonly threadId: string }) {
  return (
    <Suspense fallback={<ReportFrame back="/chat"><SubmittedBody report={null} roomId={null} /></ReportFrame>}>
      <SubmittedRoute slug={threadId} />
    </Suspense>
  );
}

function SubmittedRoute({ slug }: { readonly slug: string }) {
  const roomId = useRoomParam(slug);
  const params = useSearchParams();
  const reportId = params.get("report");
  const reports = useResource<Paginated<ApiOwnReport>>(
    "reports/me?limit=50",
    useCallback((signal: AbortSignal) => listMyReports({ limit: 50 }, signal), []),
  );
  const report = reportId ? (reports.data?.items.find((item) => item.id === reportId) ?? null) : null;

  return (
    <ReportFrame back={roomId ? chatHref(roomId) : "/chat"}>
      <SubmittedBody report={report} roomId={roomId} />
    </ReportFrame>
  );
}

function SummaryRow({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="shrink-0 text-sm text-muted-foreground lg:text-base">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-foreground lg:text-base">{children}</dd>
    </div>
  );
}

function SubmittedBody({ report, roomId }: { readonly report: ApiOwnReport | null; readonly roomId: string | null }) {
  const t = useTranslations("report");
  const format = useFormatter();
  const hour = useHourStyle();

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center px-6 py-10 lg:py-16">
      <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
        <span className="flex size-18 items-center justify-center rounded-full bg-success-surface">
          <CircleCheck aria-hidden className="size-9 text-success" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-hero text-2xl tracking-tight text-hero-ink lg:text-3xl">{t("submittedTitle")}</h1>
          <p className="text-sm leading-6 text-muted-foreground lg:text-base">{t("submittedBody")}</p>
        </div>

        {report ? (
          <section className="w-full">
            <dl className="w-full divide-y divide-border rounded-card border border-hero-card-border bg-card px-4 text-left shadow-hero-card">
              <SummaryRow label={t("summaryReported")}>{report.reportedDisplayName}</SummaryRow>
              <SummaryRow label={t("summaryReason")}>{report.reason.split("\n")[0]}</SummaryRow>
              <SummaryRow label={t("summaryStatus")}>
                <StatusPill className="lg:px-3 lg:text-base" tone={STATUS_TONE[report.status]}>
                  {t(`status.${report.status}`)}
                </StatusPill>
              </SummaryRow>
              <SummaryRow label={t("summarySent")}>
                <span className="font-latin tabular-nums">
                  {format.dateTime(new Date(report.createdAt), {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour,
                    minute: "2-digit",
                  })}
                </span>
              </SummaryRow>
            </dl>
          </section>
        ) : null}

        <p className="flex items-start gap-2 text-left text-xs leading-5 text-muted-foreground lg:text-base">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
          {t("submittedFootnote")}
        </p>

        <Button
          className={cn(authPill(true), "md:w-auto md:min-w-56")}
          nativeButton={false}
          render={<Link href={roomId ? chatHref(roomId) : "/chat"} />}
        >
          {roomId ? t("backToChat") : t("done")}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ popup */

/**
 * The report over the conversation, as a messenger asks it: a popup with its
 * title and close button held at the top, the reasons as a list to pick one
 * from, the details, and the button that files it; then, in the same popup,
 * that it was sent. The conversation stays where it was behind it.
 *
 * `/chat/room/report` stays for a link opened on its own.
 *
 * Portalled out of the chat's column, so it takes that column's zoom itself
 * (`app-scale`) from `lg`; below `lg` the wrapper is `contents`.
 */
export function ReportDialog({
  roomId,
  open,
  onOpenChange,
}: {
  readonly roomId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const title = useId();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        aria-labelledby={title}
        className="block max-h-[calc(100dvh-3rem)] max-w-[calc(100%-3rem)] gap-0 overflow-y-auto overscroll-contain rounded-card bg-card p-0 text-foreground shadow-hero-card ring-0 sm:max-w-md lg:w-auto lg:max-w-none"
        showCloseButton={false}
      >
        {/* Mounted while open only, so the next report starts from a clean form. */}
        {open ? (
          <div className="app-scale contents lg:block lg:w-140">
            <ReportDialogBody roomId={roomId} titleId={title} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ReportDialogBody({ roomId, titleId }: { readonly roomId: string; readonly titleId: string }) {
  const t = useTranslations("report");
  const c = useTranslations("common");
  const { counterpart, name, resolving, reportable, category, setCategory, details, setDetails, sending, failure, submit } =
    useReportForm(roomId);
  const [filed, setFiled] = useState(false);
  const known = counterpart.advisor !== null || counterpart.userId !== null;

  let heading = t("title");
  if (filed) heading = t("submittedTitle");
  else if (known) heading = t("titleWith", { name });

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card py-2 pr-2 pl-5 lg:py-3 lg:pr-4 lg:pl-7">
        <h2 className="min-w-0 truncate text-base font-semibold text-foreground lg:text-frame-figure" id={titleId}>
          {heading}
        </h2>
        <DialogClose render={<Button aria-label={c("close")} className="size-11 lg:size-12" size="icon" variant="ghost" />}>
          <X aria-hidden className="size-6" />
        </DialogClose>
      </div>

      {filed ? (
        <div className="flex flex-col items-center gap-4 px-5 pt-6 pb-6 text-center lg:gap-5 lg:px-7 lg:pt-8 lg:pb-8">
          <span className="flex size-14 items-center justify-center rounded-full bg-success-surface lg:size-16">
            <CircleCheck aria-hidden className="size-7 text-success lg:size-8" />
          </span>
          <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("submittedBody")}</p>
          <p className="flex items-start gap-2 text-left text-xs text-muted-foreground lg:text-frame-label">
            <ShieldCheck aria-hidden className="mt-px size-4 shrink-0 text-success" />
            {t("submittedFootnote")}
          </p>
          <DialogClose render={<Button className={cn(authPill(true), "lg:h-12 lg:text-frame-meta")} />}>{t("done")}</DialogClose>
        </div>
      ) : (
        <form
          className="flex flex-col gap-5 px-5 pt-4 pb-5 lg:gap-6 lg:px-7 lg:pt-5 lg:pb-7"
          onSubmit={(event) => {
            event.preventDefault();
            void submit().then((report) => {
              if (report) setFiled(true);
            });
          }}
        >
          <p className="text-sm text-muted-foreground lg:text-frame-meta">
            <ThaiText>{t("subtitle")}</ThaiText>
          </p>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-semibold text-foreground lg:text-frame-meta">{t("reasonLabel")}</legend>
            {/* The reasons as a list to pick from, the mark at the right. */}
            <RadioGroup
              className="-mx-2 mt-1.5 flex flex-col gap-0.5"
              onValueChange={(value) => setCategory(value as ReportCategory)}
              value={category}
            >
              {reportCategories.map((option) => (
                <label
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-muted/60 has-data-checked:bg-muted/60 motion-reduce:transition-none lg:min-h-12"
                  key={option}
                >
                  <span className="min-w-0 flex-1 text-sm text-foreground lg:text-frame-meta">{t(REASON_KEYS[option])}</span>
                  <RadioGroupItem className="size-5" value={option} />
                </label>
              ))}
            </RadioGroup>
          </fieldset>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground lg:text-frame-meta" htmlFor={`${titleId}-details`}>
              {t("detailsLabel")}
            </label>
            <Textarea
              className="min-h-24 resize-none rounded-xl border-border bg-card px-3.5 py-3 text-sm shadow-none field-sizing-fixed md:text-sm lg:min-h-32 lg:text-frame-meta"
              id={`${titleId}-details`}
              maxLength={DETAILS_MAX}
              onChange={(event) => setDetails(event.target.value)}
              placeholder={t("detailsPlaceholder")}
              value={details}
            />
            <p className="self-end font-latin text-xs text-muted-foreground tabular-nums lg:text-frame-label">
              {details.length}/{DETAILS_MAX}
            </p>
          </div>

          {/* The room is the evidence: the case view reads it whole. */}
          <p className="flex items-start gap-2 text-xs text-muted-foreground lg:text-frame-label">
            <MessagesSquare aria-hidden className="mt-px size-4 shrink-0 text-primary" />
            {t("evidenceAuto")}
          </p>

          {failure ? <ChatError error={failure} title={t("failedTitle")} /> : null}
          {!resolving && !reportable ? (
            <output className="block rounded-xl bg-warning/10 p-3.5 text-sm text-foreground lg:text-frame-meta">{t("noCounterpart")}</output>
          ) : null}

          <Button
            aria-busy={sending || undefined}
            className={cn(authPill(true), "lg:h-12 lg:text-frame-meta")}
            disabled={sending || resolving || !reportable}
            type="submit"
          >
            {sending ? t("submitting") : t("submit")}
          </Button>
        </form>
      )}
    </>
  );
}

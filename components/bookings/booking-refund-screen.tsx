"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Radio } from "@base-ui/react/radio";
import {
  CircleCheckBig,
  CircleX,
  Clock3,
  ExternalLink,
  FileText,
  Plus,
  ReceiptText,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { AUTH_LINK, authPill } from "@/components/auth/auth-split";
import { Figures } from "@/components/figures";
import { DetailColumn } from "@/components/bookings/booking-detail-screen";
import { PILL_LG, SHEET_X } from "@/components/payment/invoice-screens";
import { invoiceHref } from "@/components/payment/transactions-data";
import { StatusToast, useStatusToast } from "@/components/mobile/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup } from "@/components/ui/radio-group";
import { asUuid, isCancellable, useMountTime, useQueryValue } from "@/components/bookings/booking-flow";
import { bookingExit, bookingPopupHref, type BookingExit } from "@/components/bookings/booking-exit";
import { REFUND_INK, useClock, useRefundCases, useStanding } from "@/components/bookings/booking-sheet";
import { cancelAndCheck } from "@/components/bookings/use-booking-cancellation";
import { ApiError } from "@/lib/api/client";
import {
  getBooking,
  getMyBookingInvoice,
  listMyRefundCases,
  openRefundCase,
  listRefundEvidence,
  uploadRefundEvidence,
  getRefundEvidenceUrl,
  type RefundEvidence,
} from "@/lib/api/resources";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase, ApiRefundCaseStatus } from "@/lib/api/types";
import { invalidate, useLastAnswer, useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * Why the money is asked back, by where the booking stands: a session still
 * ahead is called off for the reader's own reasons or the advisor's; one that
 * has ended went wrong in the room. None is chosen for the reader.
 */
const REASONS = {
  ahead: ["busy", "wrongBooking", "advisorAsked", "other"],
  past: ["noShow", "cutShort", "notAsDescribed", "other"],
} as const;
type Reason = (typeof REASONS)[keyof typeof REASONS][number];

/**
 * What the form does: `cancel` calls a booking still ahead off and asks for
 * the money back, `report` asks it back for a session that has ended, `claim`
 * for one already called off.
 */
type Mode = "cancel" | "report" | "claim";

function modeOf(exit: Extract<BookingExit, { kind: "cancelAndRefund" | "requestRefund" }>): Mode {
  if (exit.kind === "cancelAndRefund") return "cancel";
  return exit.after === "ended" ? "report" : "claim";
}

/** What the reader may write under "details": the API takes the reason and these together. */
const DETAILS_MAX = 3800;
/** The evidence the API keeps per request, and what each file may be. */
const FILES_MAX = 5;
const FILE_BYTES_MAX = 50 * 1024 * 1024;
const FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** The receipt's paper: the sections inside carry its side margin, so a hairline between them runs edge to edge. */
const CARD = "flex w-full flex-col rounded-card border border-hero-card-border bg-card shadow-hero-card";
/** The card's head: what this is, what it does, and the booking it is about. */
const HEAD = cn("flex flex-col pt-6 pb-5 lg:pt-9 lg:pb-8", SHEET_X);
/** Under the receipt's dashed hairline: the form, or how the request stands. */
const REST = cn("flex flex-col gap-6 border-t border-dashed border-border pt-5 pb-6 lg:gap-8 lg:pt-7 lg:pb-9", SHEET_X);

/** The way on under the card: the receipt's capsules, piece for piece. */
const PILL = cn("md:h-11 md:text-sm", PILL_LG);

/** A section's name inside the card: smaller than the card's head, never smaller than what it heads. */
const SECTION_HEAD = "text-sm font-medium text-foreground lg:text-frame-meta";
/** "Optional", beside a section's name. */
const SECTION_NOTE = "text-xs text-muted-foreground lg:text-frame-label";

/** A file in the list: the muted row the receipt's line items sit on. */
const FILE_ROW =
  "flex min-h-11 w-full items-center gap-3 rounded-xl bg-muted/50 px-3.5 text-left text-sm text-foreground lg:min-h-14 lg:px-4 lg:text-frame-meta";

/** A capsule inside the card, for the evidence: as tall as the ones under it, only as wide as its words. */
const SMALL_PILL =
  "h-11 w-auto self-start px-4 text-sm md:h-11 md:px-5 md:text-sm lg:h-14 lg:px-6 lg:text-frame-meta";

/** How a request stands: its mark, as the receipt's outcome line has one. */
const STATUS_ICON = {
  OPEN: Clock3,
  APPROVED: CircleCheckBig,
  REJECTED: CircleX,
} as const satisfies Record<ApiRefundCaseStatus, LucideIcon>;

/** The booking could not be read because it is not one of the reader's: asking again will not change that. */
function isNotFound(error: Error | null): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 403);
}

/**
 * `/bookings/refund?bookingId=`: asking for the money paid for a booking
 * back, laid out as the receipt's page is (`DetailColumn`): one card in the
 * panel's narrow column, its way on under it, then the line to support.
 *
 * Where the booking and its money stand decides what the card is
 * (`bookingExit`, the rule the booking's popup offers this page by): the form
 * to cancel a booking still ahead and ask for its money, the form to report a
 * session that went wrong, or how a request already sent stands. Every way
 * out goes back to the booking's popup on `/bookings`.
 */
export function BookingRefundScreen() {
  const id = asUuid(useQueryValue("bookingId"));
  if (!id) return <RefundNotFound />;
  return <RefundData id={id} key={id} />;
}

function RefundData({ id }: { readonly id: string }) {
  const t = useTranslations("bookingRefund");
  const fetcher = useCallback(
    async (signal: AbortSignal) => {
      const [booking, invoice] = await Promise.all([
        getBooking(id, signal),
        // No invoice for the booking: it was never paid for, which the card says.
        getMyBookingInvoice(id, signal).catch((error: unknown) => {
          if (error instanceof ApiError && error.status === 404) return null;
          throw error;
        }),
      ]);
      return { booking, invoice };
    },
    [id],
  );
  const resource = useResource(`booking-refund/${id}`, fetcher);
  // Kept while the page reads again on the reader's return, so the card and
  // what it was saying stay mounted.
  const data = useLastAnswer(resource);
  const back = bookingPopupHref(id);

  if (data) return <RefundCard booking={data.booking} invoice={data.invoice} reload={resource.reload} />;
  if (isNotFound(resource.error)) return <RefundNotFound />;
  return (
    <DetailColumn crumb={t("crumb")} parent={{ href: back }}>
      {resource.error ? (
        <RefundState
          title={t("loadFailedTitle")}
          body={t("loadFailedBody")}
          retry={resource.reload}
          way={{ href: back, label: t("backToBooking") }}
        />
      ) : (
        <RefundSkeleton />
      )}
    </DetailColumn>
  );
}

/** Not one of the reader's bookings, or no booking named: the one way on is their own list. */
function RefundNotFound() {
  const t = useTranslations("bookingRefund");
  return (
    <DetailColumn crumb={t("crumb")}>
      <RefundState title={t("notFoundTitle")} body={t("notFoundBody")} way={{ href: "/bookings", label: t("toMyBookings") }} />
    </DetailColumn>
  );
}

/**
 * Nothing to ask for, unboxed as the booking's own missing page is: one muted
 * icon, what it is, and the way on, with a retry only when asking again could
 * change the answer.
 */
function RefundState({
  title,
  body,
  way,
  retry,
  children,
}: {
  readonly title: string;
  readonly body: string;
  readonly way: { readonly href: string; readonly label: string };
  readonly retry?: () => void;
  readonly children?: ReactNode;
}) {
  const t = useTranslations("bookingRefund");
  const pill = "mt-1 h-11 w-auto px-5 text-sm md:h-11 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body";

  return (
    <div className="flex w-full flex-col gap-6 lg:gap-8">
      <div
        className="flex w-full flex-col items-center justify-center gap-3 px-6 py-12 text-center lg:gap-5 lg:rounded-2xl lg:border lg:border-border lg:py-20"
        role={retry ? "alert" : "status"}
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-hero-ink/75 lg:size-14">
          <ReceiptText aria-hidden className="size-5 lg:size-7" strokeWidth={1.5} />
        </span>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-base font-semibold text-foreground lg:text-frame-figure">{title}</h1>
          <p className="text-xs text-balance text-muted-foreground lg:text-frame-meta">{body}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {retry ? (
            <Button className={cn(authPill(false), pill)} onClick={retry} type="button" variant="outline">
              {t("retry")}
            </Button>
          ) : null}
          <Button className={cn(authPill(true), pill)} nativeButton={false} render={<Link href={way.href} />}>
            {way.label}
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}

/** The card's own shape while the booking and what was paid for it load. */
function RefundSkeleton() {
  const t = useTranslations("bookingRefund");
  const bone = "animate-pulse bg-muted motion-reduce:animate-none";

  return (
    <div aria-busy className="flex w-full flex-col gap-6 lg:gap-8" role="status">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden className={CARD}>
        <div className={cn(HEAD, "gap-2 lg:gap-3")}>
          <span className={cn(bone, "h-6 w-3/4 rounded-lg lg:h-8")} />
          <span className={cn(bone, "h-4 w-2/3 rounded lg:h-5")} />
          <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 lg:mt-5 lg:gap-x-6 lg:gap-y-5">
            {[0, 1, 2, 3].map((i) => (
              <span className={cn(bone, "h-10 rounded lg:h-12")} key={i} />
            ))}
          </div>
        </div>
        <div className={REST}>
          <span className={cn(bone, "h-40 w-full rounded-xl lg:h-56")} />
        </div>
      </div>
      <span aria-hidden className={cn(bone, "h-11 w-full rounded-full lg:h-14")} />
    </div>
  );
}

/** One of the facts under the card's head: its name small and muted over the value, as the receipt's. */
function Fact({
  label,
  children,
  className,
}: {
  readonly label: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <dt className="text-xs text-muted-foreground lg:text-frame-label">{label}</dt>
      <dd className="text-xs break-words text-foreground lg:text-frame-meta">{children}</dd>
    </div>
  );
}

/** The amount as the receipts write it: whole baht bare, satang only when there are some. */
function useBaht(): (satang: number) => string {
  const format = useFormatter();
  return (satang) => {
    const digits = satang % 100 === 0 ? 0 : 2;
    return format.number(satang / 100, {
      style: "currency",
      currency: "THB",
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  };
}

/**
 * The booking the request is about, two to a row as the receipt's facts: who
 * advises and when (the day, then the hours on a line of their own), the
 * service, then what was paid with the way to its receipt. `standing` adds how
 * the booking stands, once a request has been sent; `note` is a muted line
 * under the amount.
 */
function BookingFacts({
  booking,
  invoice,
  standing,
  note,
}: {
  readonly booking: ApiBooking;
  readonly invoice: ApiAdviseeInvoice;
  readonly standing?: { readonly label: string; readonly ink: string };
  readonly note?: string;
}) {
  const t = useTranslations("bookingRefund");
  const b = useTranslations("bookings");
  const tr = useTranslations("transactions");
  const format = useFormatter();
  const clock = useClock();
  const baht = useBaht();

  return (
    <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 lg:mt-7 lg:gap-x-6 lg:gap-y-5">
      <Fact label={t("advisorLabel")}>{invoice.advisor.displayName}</Fact>
      <Fact label={t("dateLabel")}>
        <span className="block">
          <Figures>
            {format.dateTime(new Date(booking.startTime), { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          </Figures>
        </span>
        <span className="block whitespace-nowrap">
          <Figures>{tr("timeRange", { from: clock(booking.startTime), to: clock(booking.endTime) })}</Figures>
        </span>
      </Fact>
      <Fact className={standing ? undefined : "col-span-2"} label={t("serviceLabel")}>
        {invoice.service.name}
      </Fact>
      {standing ? (
        <Fact label={t("bookingLabel")}>
          <span className={cn("font-medium", standing.ink)}>{standing.label}</span>
        </Fact>
      ) : null}
      <Fact className="col-span-2" label={t("paidLabel")}>
        <span className="font-latin font-medium tabular-nums">{baht(invoice.amountSatang)}</span>
        {" · "}
        {/* A thumb's 44 to press, the line's own height kept. */}
        <Link
          className="-my-3.5 inline-block py-3.5 font-medium whitespace-nowrap text-primary underline-offset-4 hover:underline"
          href={invoiceHref(invoice.id)}
        >
          {b("viewReceipt")}
        </Link>
        {invoice.refundSatang ? (
          <span className="mt-0.5 block text-muted-foreground">
            {t("refundedAmount", { amount: baht(invoice.refundSatang) })}
          </span>
        ) : null}
        {note ? <span className="mt-0.5 block text-muted-foreground">{note}</span> : null}
      </Fact>
    </dl>
  );
}

/** The quiet, centred line every state closes on, as the receipt's: a question about this booking goes to support. */
function HelpLine({ booking, invoice }: { readonly booking: ApiBooking; readonly invoice: ApiAdviseeInvoice | null }) {
  const b = useTranslations("bookings");
  const tr = useTranslations("transactions");
  const l = useTranslations("landing");
  const format = useFormatter();
  const subject = encodeURIComponent(
    b("supportSubject", {
      service: invoice?.service.name ?? "",
      date: format.dateTime(new Date(booking.startTime), { day: "numeric", month: "short", year: "numeric" }),
    }),
  );

  return (
    <p className="text-center text-xs text-muted-foreground lg:text-frame-label">
      {b("helpPrompt")}{" "}
      <a className={cn(AUTH_LINK, "py-1.5")} href={`mailto:${l("footerEmailAddress")}?subject=${subject}`}>
        {tr("contactSupport")}
      </a>
    </p>
  );
}

/** The capsules under the card, then the line to support: the receipt's `NextSteps`. */
function WaysOn({ children, help }: { readonly children: ReactNode; readonly help: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 md:gap-3 lg:gap-4">
      <div className="flex flex-col gap-2.5">{children}</div>
      {help}
    </div>
  );
}

/** A problem to say inside the card, in the destructive ink. */
function Problem({ children }: { readonly children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-sm text-destructive lg:text-frame-meta">
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 lg:mt-1" />
      {children}
    </p>
  );
}

/**
 * The booking with what was paid for it: which card this page is, the request
 * that the form sends, and the evidence that goes with it.
 *
 * What makes the request safe is kept in this order: a booking the API still
 * holds is cancelled first and the cancellation confirmed before any request is
 * opened; a request whose answer was lost is read back before another is
 * sent; and each file that uploads stays listed when the next one fails.
 */
function RefundCard({
  booking,
  invoice,
  reload,
}: {
  readonly booking: ApiBooking;
  readonly invoice: ApiAdviseeInvoice | null;
  readonly reload: () => void;
}) {
  const t = useTranslations("bookingRefund");
  const now = useMountTime();
  const cases = useRefundCases(invoice);
  const listed = useLastAnswer(cases);
  const [created, setCreated] = useState<ApiRefundCase | null>(null);
  // Called off here, before the request went through: the card now asks for
  // the money of a cancelled booking, and the next press does not cancel again.
  const [cancelledHere, setCancelledHere] = useState(false);
  // Held here, over both the form and the status card: the files picked on
  // the form go up as the status card takes over, and stay listed there.
  const evidence = useEvidence();
  const toast = useStatusToast();
  const back = bookingPopupHref(booking.id);
  const shownBooking: ApiBooking = cancelledHere ? { ...booking, state: "CANCELLED" } : booking;
  // The request this page sent counts before the list has been read again.
  const known =
    created && !(listed ?? []).some((item) => item.id === created.id) ? [...(listed ?? []), created] : listed;
  const exit = bookingExit(shownBooking, now, invoice, known);

  // Read again when the reader comes back to the tab, so a decision made
  // meanwhile shows without a button to ask for it.
  const reloadCases = cases.reload;
  useEffect(() => {
    const read = () => {
      if (document.visibilityState !== "visible") return;
      reload();
      reloadCases();
    };
    document.addEventListener("visibilitychange", read);
    return () => document.removeEventListener("visibilitychange", read);
  }, [reload, reloadCases]);
  // And the next visit reads afresh rather than from what this one cached.
  useEffect(
    () => () => {
      invalidate(`booking-refund/${booking.id}`);
      invalidate("refunds/me");
    },
    [booking.id],
  );

  const parent = { href: back, label: invoice?.service.name };
  let body: ReactNode;
  if (exit.kind === "waiting") {
    body = cases.error ? (
      <RefundState
        title={t("loadFailedTitle")}
        body={t("statusFailed")}
        retry={cases.reload}
        way={{ href: back, label: t("backToBooking") }}
      />
    ) : (
      <RefundSkeleton />
    );
  } else if (exit.kind === "refundStatus" && invoice) {
    body = (
      <RefundStatus
        booking={shownBooking}
        evidence={evidence}
        invoice={invoice}
        now={now}
        refund={exit.refund}
        onProblem={(text) => toast.show(text, false)}
      />
    );
  } else if ((exit.kind === "cancelAndRefund" || exit.kind === "requestRefund") && invoice) {
    body = (
      <RefundForm
        booking={booking}
        cancelledHere={cancelledHere}
        evidence={evidence}
        invoice={invoice}
        mode={modeOf(exit)}
        onCancelled={() => setCancelledHere(true)}
        onSent={(refund, cancelled) => {
          setCreated(refund);
          if (cancelled) setCancelledHere(true);
          toast.show(t(cancelled ? "sentCancelled" : "sent"), true, t("sentDetail"));
        }}
      />
    );
  } else {
    body = <RefundNothing booking={booking} invoice={invoice} />;
  }

  return (
    <DetailColumn crumb={t("crumb")} parent={parent}>
      {body}
      <StatusToast
        dismiss={toast.dismiss}
        leaving={toast.leaving}
        paused={toast.paused}
        setPaused={toast.setPaused}
        toast={toast.toast}
      />
    </DetailColumn>
  );
}

/** Nothing to ask back on this booking: never paid for, already refunded, or a session still running. */
function RefundNothing({ booking, invoice }: { readonly booking: ApiBooking; readonly invoice: ApiAdviseeInvoice | null }) {
  const t = useTranslations("bookingRefund");
  const way = { href: bookingPopupHref(booking.id), label: t("backToBooking") };
  const help = <HelpLine booking={booking} invoice={invoice} />;

  if (invoice?.status === "refunded") {
    return (
      <RefundState body={t("refundedBody")} title={t("refundedTitle")} way={way}>
        {help}
      </RefundState>
    );
  }
  if (invoice?.status === "paid") {
    return (
      <RefundState body={t("inProgressBody")} title={t("inProgressTitle")} way={way}>
        {help}
      </RefundState>
    );
  }
  return (
    <RefundState body={t("notPaidBody")} title={t("notPaidTitle")} way={way}>
      {help}
    </RefundState>
  );
}

/** Whether picked files fit what the API keeps: five at most with those already sent, each a kind it takes. */
function filesFit(selected: readonly File[], kept: number): boolean {
  return (
    selected.length + kept <= FILES_MAX &&
    selected.every((file) => file.size > 0 && file.size <= FILE_BYTES_MAX && FILE_TYPES.includes(file.type))
  );
}

type Evidence = ReturnType<typeof useEvidence>;

/**
 * The evidence the reader adds: files picked and not yet sent, the ones this
 * page has uploaded, and the upload itself. Files go up one by one, and each
 * one that lands is listed at once, so a later failure leaves the earlier
 * ones in place and only what is left waits to be sent again.
 */
function useEvidence() {
  const [files, setFiles] = useState<readonly File[]>([]);
  const [saved, setSaved] = useState<readonly RefundEvidence[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<"fileError" | "uploadFailed" | null>(null);
  const locked = useRef(false);

  /** Adds picked files, unless with `kept` (already sent) they would not fit. */
  function choose(selected: readonly File[], kept: number) {
    if (!filesFit([...files, ...selected], kept)) {
      setProblem("fileError");
      return;
    }
    setProblem(null);
    setFiles((previous) => [...previous, ...selected]);
  }

  async function upload(refundId: string, chosen: readonly File[], kept: readonly RefundEvidence[]) {
    if (locked.current || chosen.length === 0) return;
    locked.current = true;
    setUploading(true);
    setProblem(null);
    try {
      for (const file of chosen) {
        const row = await uploadRefundEvidence(refundId, file);
        setSaved((previous) => [...(previous ?? kept).filter((item) => item.objectKey !== row.objectKey), row]);
        setFiles((previous) => previous.filter((item) => item !== file));
      }
      invalidate(`refunds/${refundId}/evidence`);
    } catch {
      setProblem("uploadFailed");
    } finally {
      locked.current = false;
      setUploading(false);
    }
  }

  return { files, saved, uploading, problem, choose, upload, clear: () => setFiles([]) };
}

/** The dashed field that takes files: the one boxed thing in the card, as an input is. */
function Dropzone({ disabled, onChoose }: { readonly disabled: boolean; readonly onChoose: (files: File[]) => void }) {
  const t = useTranslations("bookingRefund");
  return (
    <>
      <label className="relative flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-muted/40 px-4 text-sm text-muted-foreground transition-colors hover:bg-muted focus-within:ring-3 focus-within:ring-ring/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 lg:min-h-18 lg:text-frame-meta">
        <Plus aria-hidden className="size-4 text-foreground lg:size-5" />
        {t("attach")}
        <Input
          type="file"
          aria-label={t("evidence")}
          multiple
          accept={FILE_TYPES.join(",")}
          disabled={disabled}
          onChange={(event) => {
            onChoose(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <p className={SECTION_NOTE}>{t("fileHint")}</p>
    </>
  );
}

/** Files picked and not yet sent, by name. */
function PendingFiles({ files }: { readonly files: readonly File[] }) {
  return files.map((file) => (
    <p key={`${file.name}-${file.lastModified}`} className={FILE_ROW}>
      <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground lg:size-5" />
      <span className="min-w-0 flex-1 break-all">{file.name}</span>
    </p>
  ));
}

/** The files already with the request, each opening its private copy in a new tab. */
function EvidenceList({
  files,
  onOpen,
}: {
  readonly files: readonly RefundEvidence[];
  readonly onOpen: (file: RefundEvidence) => void;
}) {
  return files.map((file) => (
    <Button
      key={file.objectKey}
      type="button"
      variant="ghost"
      className={cn(FILE_ROW, "h-auto justify-start py-2 font-normal whitespace-normal hover:bg-muted")}
      onClick={() => onOpen(file)}
    >
      <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground lg:size-5" />
      <span className="min-w-0 flex-1 truncate">{file.originalFileName}</span>
      <ExternalLink aria-hidden className="size-4 shrink-0 text-muted-foreground" />
    </Button>
  ));
}

/**
 * The form: why, in the reader's words, and what shows it. Its press is named
 * for what it does to the booking and the money, and whenever it cancels the
 * booking first (ahead, or ended and still booked) the line above it says the
 * cancelling is at once and for good. No
 * second prompt: the reader chose this from the booking's popup, and this page
 * is the confirmation.
 */
function RefundForm({
  booking,
  invoice,
  mode,
  cancelledHere,
  evidence,
  onCancelled,
  onSent,
}: {
  readonly booking: ApiBooking;
  readonly invoice: ApiAdviseeInvoice;
  readonly mode: Mode;
  readonly cancelledHere: boolean;
  readonly evidence: Evidence;
  readonly onCancelled: () => void;
  /** The request is in; `cancelled` when this press also called the booking off. */
  readonly onSent: (refund: ApiRefundCase, cancelled: boolean) => void;
}) {
  const t = useTranslations("bookingRefund");
  const format = useFormatter();
  const heading = useId();
  const detailsId = useId();
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<"cancellationUnconfirmed" | "sendFailed" | "sendFailedCancelled" | null>(null);
  const locked = useRef(false);
  const reasons = REASONS[mode === "report" ? "past" : "ahead"];
  const detailsNeeded = reason === "other";
  const ready = reason !== null && (!detailsNeeded || details.trim().length > 0);
  // Still to be called off by this press. The API opens a request only on a
  // booking it no longer holds, so one it still holds is cancelled first: a
  // session ahead, or one whose end has passed while it is still `BOOKED`.
  // This one test cancels, says so above the press, and names it while it works.
  const cancelling = isCancellable(booking.state) && !cancelledHere;
  // A session still ahead: the press is named for calling it off, and the other way keeps it.
  const callingOff = cancelling && mode === "cancel";
  const shownProblem = problem ?? evidence.problem;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || !ready) return;
    locked.current = true;
    setBusy(true);
    setProblem(null);
    // How far this press got, so a failure says what did happen.
    let cancelled = false;
    let refund: ApiRefundCase | undefined;
    try {
      if (cancelling) {
        const outcome = await cancelAndCheck(booking.id);
        if (outcome !== "cancelled") {
          setProblem("cancellationUnconfirmed");
          return;
        }
        cancelled = true;
        invalidate("bookings/");
      }
      try {
        refund = await openRefundCase(
          { invoiceId: invoice.id, reason: `${t(`reasons.${reason}`)}\n${details.trim()}`.trim() },
          AbortSignal.timeout(15000),
        );
      } catch (error) {
        // A lost response may hide a committed request. Read before offering another POST.
        const fresh = await listMyRefundCases({ invoiceId: invoice.id, limit: 100 }, AbortSignal.timeout(15000));
        refund = fresh.items.find((item) => item.status === "OPEN");
        if (!refund) throw error;
      }
      invalidate("refunds/me");
    } catch {
      if (cancelled) onCancelled();
      setProblem(cancelled || cancelledHere ? "sendFailedCancelled" : "sendFailed");
      return;
    } finally {
      locked.current = false;
      setBusy(false);
    }
    if (!refund) return;
    // The request is in, and the status card takes over. The files picked go
    // up with it there; one that fails waits on that card to be sent again.
    onSent(refund, cancelled);
    await evidence.upload(refund.id, evidence.files, []);
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex w-full flex-col gap-6 lg:gap-8">
      <article aria-labelledby={heading} className={CARD}>
        <header className={HEAD}>
          <h1 className="text-xl font-semibold tracking-tight text-hero-ink lg:text-frame-heading" id={heading}>
            {t(`title.${mode}`)}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground lg:mt-2 lg:text-frame-meta">{t(`lead.${mode}`)}</p>
          <BookingFacts booking={booking} invoice={invoice} note={t("amountNote")} />
        </header>

        <div className={REST}>
          <fieldset className="min-w-0" disabled={busy}>
            <legend className={cn(SECTION_HEAD, "p-0")}>{t("reason")}</legend>
            <RadioGroup
              aria-required
              className="mt-1 gap-0 lg:mt-2"
              disabled={busy}
              onValueChange={(value) => {
                const chosen = reasons.find((item) => item === value);
                if (chosen) setReason(chosen);
              }}
              value={reason}
            >
              {reasons.map((item, index) => (
                <label
                  key={item}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-4 py-2.5 text-sm text-foreground has-[:disabled]:cursor-not-allowed lg:min-h-18 lg:text-frame-meta",
                    index > 0 && "border-t border-border",
                  )}
                >
                  <span className="min-w-0 flex-1">{t(`reasons.${item}`)}</span>
                  {/* The checkout's radio: a ring in the field grey, and once
                      chosen an ink ring round an ink dot. */}
                  <Radio.Root
                    className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-card ring-1 ring-input transition-shadow duration-300 outline-none ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-checked:ring-2 data-checked:ring-foreground data-disabled:opacity-50 motion-reduce:transition-none"
                    value={item}
                  >
                    <Radio.Indicator className="size-3.5 rounded-full bg-foreground transition-transform duration-300 data-ending-style:scale-0 data-starting-style:scale-0 motion-reduce:transition-none" />
                  </Radio.Root>
                </label>
              ))}
            </RadioGroup>
          </fieldset>

          <div className="flex flex-col">
            <div className="flex items-baseline justify-between gap-4">
              <label className={SECTION_HEAD} htmlFor={detailsId}>
                {t("details")}
              </label>
              <span className={SECTION_NOTE}>{detailsNeeded ? t("required") : t("optional")}</span>
            </div>
            <Textarea
              id={detailsId}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={DETAILS_MAX}
              disabled={busy}
              required={detailsNeeded}
              placeholder={t(mode === "report" ? "detailsHint.past" : "detailsHint.ahead")}
              className="mt-2 min-h-28 resize-none rounded-xl bg-card px-3.5 py-3 text-base field-sizing-fixed lg:mt-3 lg:min-h-40 lg:px-4 lg:text-frame-meta"
            />
            <p className="mt-1.5 self-end font-latin text-xs tabular-nums text-muted-foreground lg:text-frame-label">
              {format.number(details.length)}/{format.number(DETAILS_MAX)}
            </p>
          </div>

          <section className="flex flex-col gap-2 lg:gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className={SECTION_HEAD}>{t("evidence")}</h2>
              <span className={SECTION_NOTE}>{t("optional")}</span>
            </div>
            {evidence.files.length < FILES_MAX ? (
              <Dropzone disabled={busy} onChoose={(selected) => evidence.choose(selected, 0)} />
            ) : null}
            <PendingFiles files={evidence.files} />
          </section>

          {shownProblem ? <Problem>{t(shownProblem)}</Problem> : null}
        </div>
      </article>

      <WaysOn help={<HelpLine booking={booking} invoice={invoice} />}>
        {cancelling ? (
          <p className="text-center text-xs text-balance text-foreground lg:text-frame-meta">
            {t(callingOff ? "consequence.ahead" : "consequence.past")}
          </p>
        ) : null}
        <Button type="submit" disabled={busy || !ready} className={cn(authPill(true), PILL, "disabled:opacity-40")}>
          {busy
            ? t(cancelling ? "submitting.cancel" : "submitting.send")
            : t(callingOff ? "submit.cancel" : "submit.send")}
        </Button>
        <Button
          className={cn(authPill(false), PILL)}
          nativeButton={false}
          render={<Link href={bookingPopupHref(booking.id)} />}
          variant="outline"
        >
          {callingOff ? t("keepBooking") : t("backToBooking")}
        </Button>
      </WaysOn>
    </form>
  );
}

/**
 * How a request stands, as the receipt says how a payment did: its standing
 * in its colour, what it means for the money, the booking it is about, when
 * it was sent and decided, the reason as it was sent, and its evidence. While
 * it is under review more evidence can be added; once decided, the way on is
 * the booking, or support when it was turned down.
 */
function RefundStatus({
  booking,
  invoice,
  refund,
  now,
  evidence: added,
  onProblem,
}: {
  readonly booking: ApiBooking;
  readonly invoice: ApiAdviseeInvoice;
  readonly refund: ApiRefundCase;
  readonly now: number;
  readonly evidence: Evidence;
  readonly onProblem: (text: string) => void;
}) {
  const t = useTranslations("bookingRefund");
  const b = useTranslations("bookings");
  const tr = useTranslations("transactions");
  const l = useTranslations("landing");
  const format = useFormatter();
  const clock = useClock();
  const standing = useStanding()(booking, now);
  const heading = useId();
  const fetchEvidence = useCallback((signal: AbortSignal) => listRefundEvidence(refund.id, signal), [refund.id]);
  const evidence = useResource(`refunds/${refund.id}/evidence`, fetchEvidence);
  // What this page uploaded counts before the list has been read again.
  const shown = added.saved ?? evidence.data ?? [];
  const { files, uploading } = added;
  const open = refund.status === "OPEN";
  const StatusIcon = STATUS_ICON[refund.status];
  const card = invoice.card ? `${invoice.card.brand} •••• ${invoice.card.lastDigits}` : null;
  const stamp = (iso: string) =>
    `${format.dateTime(new Date(iso), { day: "numeric", month: "short", year: "numeric" })} · ${clock(iso)}`;

  // What the decision means for the money, said only as far as the invoice shows it.
  let lead: string;
  if (refund.status === "OPEN") lead = t("statusLead.OPEN");
  else if (refund.status === "REJECTED") lead = t("statusLead.REJECTED");
  else if (invoice.status === "refunded") lead = card ? t("statusLead.refunded", { card }) : t("statusLead.refundedNoCard");
  else lead = card ? t("statusLead.refunding", { card }) : t("statusLead.refundingNoCard");
  let note: string | undefined;
  if (open) note = t("amountNote");
  else if (refund.status === "APPROVED" && invoice.status !== "refunded") note = t("amountNoteApproved");

  async function openEvidence(file: RefundEvidence) {
    try {
      const signed = await getRefundEvidenceUrl(refund.id, file.objectKey);
      window.open(signed.url, "_blank", "noopener,noreferrer");
    } catch {
      onProblem(t("evidenceFailed"));
    }
  }

  const subject = encodeURIComponent(
    b("supportSubject", {
      service: invoice.service.name,
      date: format.dateTime(new Date(booking.startTime), { day: "numeric", month: "short", year: "numeric" }),
    }),
  );
  const support = `mailto:${l("footerEmailAddress")}?subject=${subject}`;
  const back = bookingPopupHref(booking.id);

  return (
    <div className="flex w-full flex-col gap-6 lg:gap-8">
      <article aria-labelledby={heading} className={CARD}>
        <header className={HEAD}>
          <p
            className={cn("flex items-center gap-1.5 text-xs font-medium lg:gap-2 lg:text-frame-meta", REFUND_INK[refund.status])}
            role="status"
          >
            <StatusIcon aria-hidden className="size-4 shrink-0 lg:size-5" />
            {t(`status.${refund.status}`)}
          </p>
          <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-hero-ink lg:mt-2 lg:text-frame-heading" id={heading}>
            {t("title.status")}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground lg:mt-2 lg:text-frame-meta">{lead}</p>
          <BookingFacts booking={booking} invoice={invoice} note={note} standing={standing} />
        </header>

        <div className={REST}>
          <section className="flex flex-col gap-2 lg:gap-3">
            <h2 className={SECTION_HEAD}>{t("timeline")}</h2>
            <dl className="flex flex-col gap-1.5 lg:gap-2.5">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground lg:text-frame-meta">{t("sentAt")}</dt>
                <dd className="text-right text-sm text-foreground lg:text-frame-meta">
                  <Figures>{stamp(refund.createdAt)}</Figures>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-muted-foreground lg:text-frame-meta">{t(`decidedAt.${refund.status}`)}</dt>
                <dd className={cn("text-right text-sm lg:text-frame-meta", refund.resolvedAt ? "text-foreground" : "text-muted-foreground")}>
                  {refund.resolvedAt ? <Figures>{stamp(refund.resolvedAt)}</Figures> : t("notYet")}
                </dd>
              </div>
            </dl>
          </section>

          <section className="flex flex-col gap-1.5 lg:gap-2">
            <h2 className={SECTION_HEAD}>{t("sentReason")}</h2>
            <p className="text-sm whitespace-pre-wrap text-foreground lg:text-frame-meta">{refund.reason}</p>
          </section>

          {open || shown.length > 0 || files.length > 0 || evidence.error ? (
            <section className="flex flex-col gap-2 lg:gap-3">
              <h2 className={SECTION_HEAD}>{t("evidence")}</h2>
              <EvidenceList files={shown} onOpen={(file) => void openEvidence(file)} />
              {evidence.error ? (
                <Button type="button" variant="link" className="h-11 self-start px-0 text-sm lg:text-frame-meta" onClick={evidence.reload}>
                  {t("evidenceRetry")}
                </Button>
              ) : null}
              {/* Picked and not yet sent (or left by a failed upload): listed
                  first, their upload the press under them. Under review only. */}
              {files.length > 0 ? (
                <>
                  <PendingFiles files={files} />
                  {open ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className={cn(authPill(true), SMALL_PILL)}
                        disabled={uploading}
                        onClick={() => void added.upload(refund.id, files, shown)}
                        type="button"
                      >
                        {uploading ? t("uploading") : t("upload", { count: files.length })}
                      </Button>
                      <Button
                        className={cn(authPill(false), SMALL_PILL)}
                        disabled={uploading}
                        onClick={added.clear}
                        type="button"
                        variant="outline"
                      >
                        {t("discardFiles")}
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : open && shown.length < FILES_MAX ? (
                <>
                  <label
                    className={cn(
                      authPill(false),
                      SMALL_PILL,
                      "relative inline-flex cursor-pointer items-center justify-center focus-within:ring-3 focus-within:ring-ring/50",
                    )}
                  >
                    <Plus aria-hidden className="size-4 lg:size-5" />
                    {t("addEvidence")}
                    <Input
                      type="file"
                      aria-label={t("addEvidence")}
                      multiple
                      accept={FILE_TYPES.join(",")}
                      onChange={(event) => {
                        added.choose(Array.from(event.target.files ?? []), shown.length);
                        event.target.value = "";
                      }}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                  <p className={SECTION_NOTE}>{t("fileHint")}</p>
                </>
              ) : null}
              {added.problem ? <Problem>{t(added.problem)}</Problem> : null}
            </section>
          ) : null}
        </div>
      </article>

      <WaysOn help={<HelpLine booking={booking} invoice={invoice} />}>
        {refund.status === "REJECTED" ? (
          <>
            <Button className={cn(authPill(true), PILL)} nativeButton={false} render={<a href={support} />}>
              {tr("contactSupport")}
            </Button>
            <Button className={cn(authPill(false), PILL)} nativeButton={false} render={<Link href={back} />} variant="outline">
              {t("backToBooking")}
            </Button>
          </>
        ) : (
          <>
            <Button className={cn(authPill(true), PILL)} nativeButton={false} render={<Link href={back} />}>
              {t("backToBooking")}
            </Button>
            {refund.status === "APPROVED" ? (
              <Button
                className={cn(authPill(false), PILL)}
                nativeButton={false}
                render={<Link href={invoiceHref(invoice.id)} />}
                variant="outline"
              >
                {b("viewReceipt")}
              </Button>
            ) : null}
          </>
        )}
      </WaysOn>
    </div>
  );
}

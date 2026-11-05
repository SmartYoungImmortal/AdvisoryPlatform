"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useRef, useState, type ReactNode } from "react";

import { refundHref, reportUntil, signInHref, type BookingExit } from "@/components/bookings/booking-exit";
import { openRefundOnce, refundFailure, type OpenedRefund, type RefundFailure } from "@/components/bookings/refund-actions";
import { EvidenceBones, EvidencePicker, RefundAlert, uploadFault, type UploadFault } from "@/components/bookings/refund-evidence";
import {
  Bone,
  MailSupportPill,
  MetaBones,
  REFUND_HEADING,
  REFUND_SECTION,
  REFUND_SHAPE,
  REFUND_UNDER_HEADING,
  RefundActions,
  RefundCard,
  RefundFacts,
  RefundHead,
  refundPill,
  useRefundFormat,
  useSupportMail,
} from "@/components/bookings/refund-sheet";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { uploadRefundEvidence } from "@/lib/api/resources";
import type { ApiAdviseeInvoice, ApiBooking } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** The /terms §8 grounds for a refund after the start, in the order the form offers them. */
const REASONS = [
  { value: "advisorAbsent", noShow: true },
  { value: "platformFailed", noShow: true },
  { value: "notAsDescribed", hint: "reasons.notAsDescribedHint" },
  { value: "other", needsDetails: true },
] as const satisfies readonly {
  readonly value: string;
  readonly hint?: "reasons.notAsDescribedHint";
  readonly needsDetails?: boolean;
  /** Still a ground once the advisor has recorded the advisee absent: the two that `meta.noShow` names. */
  readonly noShow?: boolean;
}[];

type Reason = (typeof REASONS)[number]["value"];

function offeredFor(state: ApiBooking["state"]) {
  return state === "NO_SHOW" ? REASONS.filter((option) => "noShow" in option) : REASONS;
}

/** The API keeps 4000 characters of reason; the longest label and its blank line fit in what this leaves. */
const DETAILS_MAX = 3800;

/** The line under the amount, in parts: the deadline's own " · " is joined by no-break spaces, so it stays one part. */
function useReportMeta(): (until: Date) => string[] {
  const t = useTranslations("bookingRefund");
  const when = useRefundFormat();
  return (until) => t("meta.report", { date: when.deadline(until) }).split(" · ");
}

/**
 * The form's boxes, which the page's skeleton builds its bones in
 * (`ReportFormBones`), so the page keeps its height when the money lands.
 * Below `lg` two sections, the reasons with the details and then the evidence.
 * From `lg` one, on the wide head's columns: the reasons beside the details,
 * the evidence under the reasons. Each level's box gives way (`contents`)
 * where the other level draws it.
 */
const FORM = {
  form: cn(REFUND_SECTION, "max-lg:contents lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-8"),
  section: cn(REFUND_SECTION, "lg:contents"),
  fieldset: cn(REFUND_UNDER_HEADING, "flex min-w-0 flex-col"),
  reasons: "-mx-2 flex w-auto flex-col gap-0.5",
  reason: "flex min-h-11 items-center gap-3 rounded-xl px-2 py-2 lg:min-h-12",
  reasonText: "flex min-w-0 flex-1 flex-col gap-0.5",
  reasonTitle: "text-sm text-balance lg:text-frame-meta",
  reasonHint: "text-xs text-balance lg:text-frame-label",
  mark: "size-5",
  details: "mt-4 flex flex-col lg:mt-0",
  /** As far under its title as the reasons are under theirs. From `lg` it grows to the reasons' height, so the two columns end level. */
  field: cn(REFUND_UNDER_HEADING, "min-h-24 rounded-xl lg:min-h-32 lg:flex-1"),
  counterRow: "mt-2 flex items-start gap-3",
  counter: "ml-auto shrink-0 font-latin text-xs tabular-nums lg:text-frame-label",
  evidence: "lg:col-start-1",
  noShow: cn(REFUND_SHAPE.meta, "text-pretty"),
} as const;

function needsDetails(reason: Reason | null): boolean {
  return REASONS.some((item) => item.value === reason && "needsDetails" in item);
}

function missingFrom(reason: Reason | null, details: string): "reason" | "details" | null {
  if (reason === null) return "reason";
  return needsDetails(reason) && details.trim() === "" ? "details" : null;
}

type Phase =
  | { readonly kind: "idle" | "sending" | "uploading" }
  | { readonly kind: "failed"; readonly failure: RefundFailure };

const SEND_LABEL = {
  idle: "actions.send",
  failed: "actions.send",
  sending: "busy.sending",
  uploading: "busy.uploading",
} as const satisfies Record<Phase["kind"], string>;

/** Only `retry` asks for another press; the rest say what will help instead. */
const SEND_FAILED = {
  signIn: "errors.signIn",
  notFound: "errors.refundNotFound",
  refused: "errors.refundRefused",
  retry: "errors.sendFailed",
} as const satisfies Record<RefundFailure, string>;

export function ReportMode({
  booking,
  invoice,
  exit,
  notice,
  stillOffered,
  onOpened,
}: {
  readonly booking: ApiBooking;
  readonly invoice: ApiAdviseeInvoice;
  readonly exit: Extract<BookingExit, { kind: "report" }>;
  readonly notice?: string | null;
  /** The rule again at the press's time: a form left open can outlast the 7 days. */
  readonly stillOffered: (at: number) => boolean;
  /** `notice`: the files that could not be attached to the request this form opened. */
  readonly onOpened: (opened: OpenedRefund, notice?: string) => void;
}): ReactNode {
  const t = useTranslations("bookingRefund");
  const when = useRefundFormat();
  const meta = useReportMeta();
  const format = useFormatter();
  const formId = useId();
  const legendId = useId();
  const reasonErrorId = useId();
  const detailsId = useId();
  const detailsErrorId = useId();

  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState<readonly File[]>([]);
  const [tried, setTried] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const sending = useRef(false);
  const group = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  const supportMail = useSupportMail(invoice.invoiceNumber);
  const missing = tried ? missingFrom(reason, details) : null;
  const busy = phase.kind === "sending" || phase.kind === "uploading";
  const failure = phase.kind === "failed" ? phase.failure : null;
  // After a refusal sending again fails the same way: support is the way on, so it takes the button.
  const toSupport = failure === "refused" || failure === "notFound";
  const detailsRequired = needsDetails(reason);
  const offered = offeredFor(booking.state);

  async function send(chosen: Reason) {
    sending.current = true;
    setPhase({ kind: "sending" });
    const label = t(`reasons.${chosen}`);
    const told = details.trim();
    let opened: OpenedRefund;
    try {
      opened = await openRefundOnce(invoice.id, told ? `${label}\n\n${told}` : label);
    } catch (cause) {
      sending.current = false;
      setPhase({ kind: "failed", failure: refundFailure(cause) });
      return;
    }
    // Someone else's request: these files are evidence for what this form says, which that request does not.
    if (opened.alreadyOpen) {
      onOpened(opened);
      return;
    }
    const { refund } = opened;
    if (files.length > 0) setPhase({ kind: "uploading" });
    const failed = new Map<UploadFault, string[]>();
    for (const file of files) {
      try {
        await uploadRefundEvidence(refund.id, file);
      } catch (cause) {
        const fault = uploadFault(cause);
        failed.set(fault, [...(failed.get(fault) ?? []), file.name]);
      }
    }
    const said = [...failed].map(([fault, names]) => t(`attachments.${fault}`, { name: format.list(names) }));
    onOpened(opened, said.length > 0 ? said.join(" ") : undefined);
  }

  function submit() {
    if (sending.current) return;
    setTried(true);
    if (reason === null) {
      group.current?.querySelector<HTMLElement>('[role="radio"]')?.focus();
      return;
    }
    if (missingFrom(reason, details) === "details") {
      field.current?.focus();
      return;
    }
    if (!stillOffered(Date.now())) return;
    void send(reason);
  }

  return (
    <>
      <RefundCard
        head={
          <RefundHead
            amount={when.baht(exit.maxSatang)}
            icon={RotateCcw}
            meta={meta(exit.until)}
            title={t("head.report")}
            tone="primary"
          >
            {/* An advisor-recorded no-show: §8 returns nothing for a missed session, which the amount above would otherwise seem to promise. */}
            {booking.state === "NO_SHOW" ? <p className={cn(FORM.noShow, "text-muted-foreground")}>{t("meta.noShow")}</p> : null}
            <RefundFacts booking={booking} invoice={invoice} />
          </RefundHead>
        }
        foot={
          <form
            className={FORM.form}
            id={formId}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <section className={FORM.section}>
              <div>
                <h2 className={REFUND_HEADING}>{t("reasons.legend")}</h2>
                <fieldset className={FORM.fieldset}>
                  <legend className="sr-only" id={legendId}>
                    {t("reasons.legend")}
                  </legend>
                  {missing === "reason" ? (
                    <RefundAlert className="mb-1.5" id={reasonErrorId}>
                      {t("form.reasonMissing")}
                    </RefundAlert>
                  ) : null}
                  <RadioGroup
                    aria-describedby={missing === "reason" ? reasonErrorId : undefined}
                    aria-invalid={missing === "reason" || undefined}
                    aria-labelledby={legendId}
                    className={FORM.reasons}
                    onValueChange={(value) => setReason(value as Reason)}
                    ref={group}
                    value={reason}
                  >
                    {offered.map((option) => (
                      <label
                        className={cn(
                          FORM.reason,
                          "cursor-pointer transition-colors duration-150 hover:bg-muted/60 has-data-checked:bg-muted/60 motion-reduce:transition-none",
                        )}
                        key={option.value}
                      >
                        <span className={FORM.reasonText}>
                          {/* Balanced, not pretty: Chrome's pretty still left a Thai hint's last word alone on its line at 390. */}
                          <span className={cn(FORM.reasonTitle, "text-foreground")}>{t(`reasons.${option.value}`)}</span>
                          {"hint" in option ? (
                            <span className={cn(FORM.reasonHint, "text-muted-foreground")}>{t(option.hint)}</span>
                          ) : null}
                        </span>
                        <RadioGroupItem className={FORM.mark} value={option.value} />
                      </label>
                    ))}
                  </RadioGroup>
                </fieldset>
              </div>

              <div className={FORM.details}>
                <label className={REFUND_HEADING} htmlFor={detailsId}>
                  {detailsRequired ? t("form.detailsLabelRequired") : t("form.detailsLabel")}
                </label>
                <Textarea
                  aria-describedby={missing === "details" ? detailsErrorId : undefined}
                  aria-invalid={missing === "details" || undefined}
                  className={cn(
                    FORM.field,
                    "resize-none border-border bg-card px-3.5 py-3 text-base shadow-none field-sizing-fixed md:text-base lg:text-frame-meta",
                  )}
                  id={detailsId}
                  maxLength={DETAILS_MAX}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder={t("form.detailsPlaceholder")}
                  ref={field}
                  required={detailsRequired}
                  value={details}
                />
                <div className={FORM.counterRow}>
                  {missing === "details" ? <RefundAlert id={detailsErrorId}>{t("form.detailsMissing")}</RefundAlert> : null}
                  <p className={cn(FORM.counter, "text-muted-foreground")}>
                    {t("form.counter", { count: details.length, max: DETAILS_MAX })}
                  </p>
                </div>
              </div>
            </section>

            <section className={FORM.section}>
              <div className={FORM.evidence}>
                <h2 className={REFUND_HEADING}>{t("attachments.label")}</h2>
                <div className={REFUND_UNDER_HEADING}>
                  <EvidencePicker disabled={busy} files={files} onChange={setFiles} />
                </div>
              </div>
            </section>
          </form>
        }
      />

      <RefundActions help={!toSupport} invoiceNumber={invoice.invoiceNumber}>
        {failure ? <RefundAlert className="text-center">{t(SEND_FAILED[failure])}</RefundAlert> : null}
        {notice && !failure ? <RefundAlert className="text-center">{notice}</RefundAlert> : null}
        {failure === "signIn" ? (
          <Button className={refundPill("solid")} nativeButton={false} render={<Link href={signInHref(refundHref(booking.id))} />}>
            {t("actions.signIn")}
          </Button>
        ) : toSupport ? (
          <MailSupportPill href={supportMail} />
        ) : (
          <Button aria-busy={busy || undefined} className={refundPill("solid")} disabled={busy} focusableWhenDisabled form={formId} type="submit">
            {t(SEND_LABEL[phase.kind])}
          </Button>
        )}
      </RefundActions>
    </>
  );
}

/** What the report's head says under its amount, as bones: the line with the deadline, and a no-show's warning. */
export function ReportHeadBones({ booking }: { readonly booking: ApiBooking }) {
  const t = useTranslations("bookingRefund");
  const meta = useReportMeta();
  return (
    <>
      <p className={REFUND_SHAPE.meta}>
        <MetaBones parts={meta(reportUntil(booking))} />
      </p>
      {booking.state === "NO_SHOW" ? (
        <p className={FORM.noShow}>
          <Bone text={t("meta.noShow")} />
        </p>
      ) : null}
    </>
  );
}

/** The form as bones, in its own boxes, its own words giving each line its length: the page's foot while the money loads. */
export function ReportFormBones({ booking }: { readonly booking: ApiBooking }) {
  const t = useTranslations("bookingRefund");
  return (
    <div className={FORM.form}>
      <div className={FORM.section}>
        <div>
          <p className={REFUND_HEADING}>
            <Bone text={t("reasons.legend")} />
          </p>
          <div className={FORM.fieldset}>
            <div className={FORM.reasons}>
              {offeredFor(booking.state).map((option) => (
                <div className={FORM.reason} key={option.value}>
                  <span className={FORM.reasonText}>
                    <span className={FORM.reasonTitle}>
                      <Bone text={t(`reasons.${option.value}`)} />
                    </span>
                    {"hint" in option ? (
                      <span className={FORM.reasonHint}>
                        <Bone text={t(option.hint)} />
                      </span>
                    ) : null}
                  </span>
                  <span className={cn(FORM.mark, "shrink-0 rounded-full bg-muted")} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={FORM.details}>
          <p className={REFUND_HEADING}>
            <Bone text={t("form.detailsLabel")} />
          </p>
          <div className={cn(FORM.field, "bg-muted")} />
          <div className={FORM.counterRow}>
            <p className={FORM.counter}>
              <Bone text={t("form.counter", { count: 0, max: DETAILS_MAX })} />
            </p>
          </div>
        </div>
      </div>
      <div className={FORM.section}>
        <div className={FORM.evidence}>
          <p className={REFUND_HEADING}>
            <Bone text={t("attachments.label")} />
          </p>
          <div className={REFUND_UNDER_HEADING}>
            <EvidenceBones />
          </div>
        </div>
      </div>
    </div>
  );
}

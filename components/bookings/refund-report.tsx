"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useRef, useState, type ReactNode } from "react";

import { refundHref, signInHref, type BookingExit } from "@/components/bookings/booking-exit";
import { openRefundOnce, refundFailure, type OpenedRefund, type RefundFailure } from "@/components/bookings/refund-actions";
import { EvidencePicker, RefundAlert, uploadFault, type UploadFault } from "@/components/bookings/refund-evidence";
import {
  REFUND_HEADING,
  REFUND_SECTION,
  REFUND_UNDER_HEADING,
  RefundActions,
  RefundCard,
  RefundFacts,
  RefundHead,
  refundPill,
  useRefundFormat,
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

/** The API keeps 4000 characters of reason; the longest label and its blank line fit in what this leaves. */
const DETAILS_MAX = 3800;

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

  const missing = tried ? missingFrom(reason, details) : null;
  const busy = phase.kind === "sending" || phase.kind === "uploading";
  const failure = phase.kind === "failed" ? phase.failure : null;
  const detailsRequired = needsDetails(reason);
  const offered = booking.state === "NO_SHOW" ? REASONS.filter((option) => "noShow" in option) : REASONS;

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
            // The deadline's own " · " is joined by no-break spaces, so it stays one part.
            meta={t("meta.report", { date: when.deadline(exit.until) }).split(" · ")}
            title={t("head.report")}
            tone="primary"
          >
            {/* An advisor-recorded no-show: §8 returns nothing for a missed session, which the amount above would otherwise seem to promise. */}
            {booking.state === "NO_SHOW" ? (
              <p className="mt-1.5 text-xs text-pretty text-muted-foreground lg:text-frame-meta">{t("meta.noShow")}</p>
            ) : null}
            <RefundFacts booking={booking} invoice={invoice} />
          </RefundHead>
        }
        // Below `lg` two sections, the reasons with the details and then the evidence. From `lg` one,
        // on the wide head's columns: the reasons beside the details, the evidence under the reasons.
        // Each level's box gives way (`contents`) where the other level draws it.
        foot={
          <form
            className={cn(REFUND_SECTION, "max-lg:contents lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-8")}
            id={formId}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <section className={cn(REFUND_SECTION, "lg:contents")}>
              <div>
                <h2 className={REFUND_HEADING}>{t("reasons.legend")}</h2>
                <fieldset className={cn(REFUND_UNDER_HEADING, "flex min-w-0 flex-col")}>
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
                    className="-mx-2 flex w-auto flex-col gap-0.5"
                    onValueChange={(value) => setReason(value as Reason)}
                    ref={group}
                    value={reason}
                  >
                    {offered.map((option) => (
                      <label
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-muted/60 has-data-checked:bg-muted/60 motion-reduce:transition-none lg:min-h-12"
                        key={option.value}
                      >
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          {/* Balanced, not pretty: Chrome's pretty still left a Thai hint's last word alone on its line at 390. */}
                          <span className="text-sm text-balance text-foreground lg:text-frame-meta">{t(`reasons.${option.value}`)}</span>
                          {"hint" in option ? (
                            <span className="text-xs text-balance text-muted-foreground lg:text-frame-label">{t(option.hint)}</span>
                          ) : null}
                        </span>
                        <RadioGroupItem className="size-5" value={option.value} />
                      </label>
                    ))}
                  </RadioGroup>
                </fieldset>
              </div>

              {/* From `lg` the field grows to the reasons' height, so the two columns end level. */}
              <div className="mt-4 flex flex-col gap-2 lg:mt-0">
                <label className={REFUND_HEADING} htmlFor={detailsId}>
                  {detailsRequired ? t("form.detailsLabelRequired") : t("form.detailsLabel")}
                </label>
                <Textarea
                  aria-describedby={missing === "details" ? detailsErrorId : undefined}
                  aria-invalid={missing === "details" || undefined}
                  className="min-h-24 resize-none rounded-xl border-border bg-card px-3.5 py-3 text-base shadow-none field-sizing-fixed md:text-base lg:min-h-32 lg:flex-1 lg:text-frame-meta"
                  id={detailsId}
                  maxLength={DETAILS_MAX}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder={t("form.detailsPlaceholder")}
                  ref={field}
                  required={detailsRequired}
                  value={details}
                />
                <div className="flex items-start gap-3">
                  {missing === "details" ? <RefundAlert id={detailsErrorId}>{t("form.detailsMissing")}</RefundAlert> : null}
                  <p className="ml-auto shrink-0 font-latin text-xs text-muted-foreground tabular-nums lg:text-frame-label">
                    {t("form.counter", { count: details.length, max: DETAILS_MAX })}
                  </p>
                </div>
              </div>
            </section>

            <section className={cn(REFUND_SECTION, "lg:contents")}>
              <div className="lg:col-start-1">
                <h2 className={REFUND_HEADING}>{t("attachments.label")}</h2>
                <div className={REFUND_UNDER_HEADING}>
                  <EvidencePicker disabled={busy} files={files} onChange={setFiles} />
                </div>
              </div>
            </section>
          </form>
        }
      />

      <RefundActions invoiceNumber={invoice.invoiceNumber}>
        {failure ? <RefundAlert className="text-center">{t(SEND_FAILED[failure])}</RefundAlert> : null}
        {notice && !failure ? <RefundAlert className="text-center">{notice}</RefundAlert> : null}
        {failure === "signIn" ? (
          <Button className={refundPill("solid")} nativeButton={false} render={<Link href={signInHref(refundHref(booking.id))} />}>
            {t("actions.signIn")}
          </Button>
        ) : (
          <Button aria-busy={busy || undefined} className={refundPill("solid")} disabled={busy} focusableWhenDisabled form={formId} type="submit">
            {t(SEND_LABEL[phase.kind])}
          </Button>
        )}
      </RefundActions>
    </>
  );
}

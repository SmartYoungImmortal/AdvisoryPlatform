"use client";

import { RotateCcw } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useRef, useState, type ReactNode } from "react";

import type { BookingExit } from "@/components/bookings/booking-exit";
import { openRefundOnce } from "@/components/bookings/refund-actions";
import { EvidencePicker, RefundAlert } from "@/components/bookings/refund-evidence";
import {
  RefundActions,
  RefundCard,
  RefundFacts,
  RefundHead,
  RefundSection,
  refundPill,
  useRefundFormat,
} from "@/components/bookings/refund-sheet";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { uploadRefundEvidence } from "@/lib/api/resources";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";

/** The /terms §8 grounds for a refund after the start, in the order the form offers them. */
const REASONS = [
  { value: "advisorAbsent" },
  { value: "platformFailed" },
  { value: "notAsDescribed", hint: "reasons.notAsDescribedHint" },
  { value: "other", needsDetails: true },
] as const satisfies readonly {
  readonly value: string;
  readonly hint?: "reasons.notAsDescribedHint";
  readonly needsDetails?: boolean;
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

type Phase = "idle" | "sending" | "uploading" | "failed";

const SEND_LABEL = {
  idle: "actions.send",
  failed: "actions.send",
  sending: "busy.sending",
  uploading: "busy.uploading",
} as const satisfies Record<Phase, string>;

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
  readonly onOpened: (refund: ApiRefundCase, notice?: string) => void;
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
  const [phase, setPhase] = useState<Phase>("idle");
  const sending = useRef(false);
  const group = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  const missing = tried ? missingFrom(reason, details) : null;
  const busy = phase === "sending" || phase === "uploading";
  const detailsRequired = needsDetails(reason);

  async function send(chosen: Reason) {
    sending.current = true;
    setPhase("sending");
    const label = t(`reasons.${chosen}`);
    const told = details.trim();
    let refund: ApiRefundCase;
    try {
      refund = await openRefundOnce(invoice.id, told ? `${label}\n\n${told}` : label);
    } catch {
      sending.current = false;
      setPhase("failed");
      return;
    }
    if (files.length > 0) setPhase("uploading");
    const failed: string[] = [];
    for (const file of files) {
      try {
        await uploadRefundEvidence(refund.id, file);
      } catch {
        failed.push(file.name);
      }
    }
    onOpened(refund, failed.length > 0 ? t("attachments.uploadFailed", { name: format.list(failed) }) : undefined);
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
            meta={t("meta.report", { date: when.deadline(exit.until) })}
            title={t("head.report")}
            tone="primary"
          >
            <RefundFacts booking={booking} invoice={invoice} />
          </RefundHead>
        }
        aside={
          <RefundSection heading={t("attachments.label")}>
            <EvidencePicker disabled={busy} files={files} onChange={setFiles} />
          </RefundSection>
        }
      >
        <form
          className="flex flex-col"
          id={formId}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <RefundSection heading={t("reasons.legend")}>
            <fieldset className="flex min-w-0 flex-col">
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
                className="-mx-2 mt-1.5 flex flex-col gap-0.5"
                onValueChange={(value) => setReason(value as Reason)}
                ref={group}
                value={reason}
              >
                {REASONS.map((option) => (
                  <label
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-muted/60 has-data-checked:bg-muted/60 motion-reduce:transition-none lg:min-h-12"
                    key={option.value}
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm text-foreground lg:text-frame-meta">{t(`reasons.${option.value}`)}</span>
                      {"hint" in option ? (
                        <span className="text-xs text-muted-foreground lg:text-frame-label">{t(option.hint)}</span>
                      ) : null}
                    </span>
                    <RadioGroupItem className="size-5" value={option.value} />
                  </label>
                ))}
              </RadioGroup>
            </fieldset>

            <div className="mt-4 flex flex-col gap-2 lg:mt-5">
              <label className="text-sm font-semibold text-foreground lg:text-frame-meta" htmlFor={detailsId}>
                {detailsRequired ? t("form.detailsLabelRequired") : t("form.detailsLabel")}
              </label>
              <Textarea
                aria-describedby={missing === "details" ? detailsErrorId : undefined}
                aria-invalid={missing === "details" || undefined}
                className="min-h-24 resize-none rounded-xl border-border bg-card px-3.5 py-3 text-base shadow-none field-sizing-fixed md:text-base lg:min-h-32 lg:text-frame-meta"
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
          </RefundSection>
        </form>
      </RefundCard>

      <RefundActions invoiceNumber={invoice.invoiceNumber}>
        {phase === "failed" ? <RefundAlert className="text-center">{t("errors.sendFailed")}</RefundAlert> : null}
        {notice && phase !== "failed" ? <RefundAlert className="text-center">{notice}</RefundAlert> : null}
        <Button aria-busy={busy || undefined} className={refundPill("solid")} disabled={busy} focusableWhenDisabled form={formId} type="submit">
          {t(SEND_LABEL[phase])}
        </Button>
      </RefundActions>
    </>
  );
}

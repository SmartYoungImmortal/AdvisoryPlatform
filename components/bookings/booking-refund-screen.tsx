"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { TopBar } from "@/components/topbar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  asUuid,
  isCancellable,
  useQueryValue,
} from "@/components/bookings/booking-flow";
import { AdvisorFace } from "@/components/bookings/booking-sheet";
import { cancelAndCheck } from "@/components/bookings/use-booking-cancellation";
import { ApiError } from "@/lib/api/client";
import {
  getAdvisor,
  getBooking,
  getMyBookingInvoice,
  listMyRefundCases,
  openRefundCase,
  listRefundEvidence,
  uploadRefundEvidence,
  getRefundEvidenceUrl,
  type RefundEvidence,
} from "@/lib/api/resources";
import type {
  ApiAdviseeInvoice,
  ApiBooking,
  ApiRefundCase,
} from "@/lib/api/types";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

const PAGE = "mx-auto w-full max-w-[1440px] px-6 lg:px-10 xl:px-30";
const REASONS = [
  "noService",
  "advisorCancelled",
  "wrongBooking",
  "other",
] as const;
type Reason = (typeof REASONS)[number];

export function BookingRefundScreen() {
  const id = asUuid(useQueryValue("bookingId"));
  const t = useTranslations("bookingRefund");
  if (!id)
    return (
      <p role="alert" className="p-6">
        {t("missing")}
      </p>
    );
  return <RefundData id={id} key={id} />;
}

function RefundData({ id }: { readonly id: string }) {
  const t = useTranslations("bookingRefund");
  const fetcher = useCallback(
    async (signal: AbortSignal) => {
      const [booking, invoice] = await Promise.all([
        getBooking(id, signal),
        getMyBookingInvoice(id, signal),
      ]);
      return { booking, invoice };
    },
    [id],
  );
  const resource = useResource(`booking-refund/${id}`, fetcher);
  return (
    <MobileScreen wide className="bg-background">
      <ScreenBody>
        <div className="hidden lg:block">
          <TopBar />
        </div>
        <div className="w-full lg:border-b lg:border-border lg:bg-card">
          <div className={PAGE}>
            <ScreenTopBar
              href={`/bookings/detail?bookingId=${id}`}
              label={t("back")}
              className="px-0"
            />
            <header className="pb-6 lg:pb-9">
              <h1 className="text-2xl font-semibold lg:text-heading">
                {t("title")}
              </h1>
              <p className="mt-2 text-xs text-muted-foreground">{t("intro")}</p>
            </header>
          </div>
        </div>
        {resource.loading ? (
          <p role="status" className={cn(PAGE, "py-8")}>
            {t("loading")}
          </p>
        ) : null}
        {resource.error ? (
          <div role="alert" className={cn(PAGE, "py-8")}>
            <p>{t("unavailable")}</p>
            <Button type="button" variant="link" onClick={resource.reload}>
              {t("retry")}
            </Button>
          </div>
        ) : null}
        {resource.data ? (
          <RefundForm
            booking={resource.data.booking}
            invoice={resource.data.invoice}
          />
        ) : null}
        <div className="hidden w-full lg:block">
          <SiteFooter />
        </div>
      </ScreenBody>
    </MobileScreen>
  );
}

function RefundForm({
  booking,
  invoice,
}: {
  readonly booking: ApiBooking;
  readonly invoice: ApiAdviseeInvoice;
}) {
  const t = useTranslations("bookingRefund");
  const format = useFormatter();
  const [reason, setReason] = useState<Reason>("noService");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [created, setCreated] = useState<ApiRefundCase | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [evidenceOverride, setEvidenceOverride] = useState<
    RefundEvidence[] | null
  >(null);
  const locked = useRef(false);
  const advisor = useResource(`advisors/${booking.advisorId}`, (signal) =>
    getAdvisor(booking.advisorId, signal),
  );
  const fetchCases = useCallback(
    (signal: AbortSignal) =>
      listMyRefundCases({ invoiceId: invoice.id, limit: 100 }, signal),
    [invoice.id],
  );
  const cases = useResource(`refunds/me?invoiceId=${invoice.id}`, fetchCases);
  const current =
    created ??
    cases.data?.items.find((item) => item.status === "OPEN") ??
    cases.data?.items.at(-1);
  const fetchEvidence = useCallback(
    (signal: AbortSignal) =>
      current ? listRefundEvidence(current.id, signal) : Promise.resolve([]),
    [current],
  );
  const evidence = useResource(
    `refunds/${current?.id ?? "new"}/evidence`,
    fetchEvidence,
  );
  const shownEvidence = evidenceOverride ?? evidence.data ?? [];
  const eligible = invoice.status === "paid";
  const canSubmit =
    !cases.loading &&
    !cases.error &&
    (!current || current.status === "OPEN") &&
    eligible;

  function chooseFiles(selected: File[]) {
    if (
      selected.length + shownEvidence.length > 5 ||
      selected.some(
        (file) =>
          file.size === 0 ||
          file.size > 50 * 1024 * 1024 ||
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
          ].includes(file.type),
      )
    ) {
      setProblem(t("fileError"));
      return;
    }
    setProblem(null);
    setFiles(selected);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || !canSubmit) return;
    if (current && files.length === 0) return;
    locked.current = true;
    setBusy(true);
    setProblem(null);
    try {
      let refund = current;
      if (!refund) {
        if (isCancellable(booking.state)) {
          const outcome = await cancelAndCheck(booking.id);
          if (outcome !== "cancelled") {
            setProblem(t("cancellationUnconfirmed"));
            return;
          }
          invalidate("bookings/");
        }
        try {
          refund = await openRefundCase(
            {
              invoiceId: invoice.id,
              reason: `${t(reason)}\n${details.trim()}`.trim(),
            },
            AbortSignal.timeout(15000),
          );
        } catch (error) {
          // A lost response may hide a committed request. Read before offering another POST.
          const fresh = await listMyRefundCases(
            { invoiceId: invoice.id, limit: 100 },
            AbortSignal.timeout(15000),
          );
          refund = fresh.items.find((item) => item.status === "OPEN");
          if (!refund) throw error;
        }
        setCreated(refund);
        invalidate("refunds/me");
      }
      for (const file of files) {
        const saved = await uploadRefundEvidence(refund.id, file);
        setEvidenceOverride((previous) => [
          ...(previous ?? shownEvidence).filter(
            (row) => row.objectKey !== saved.objectKey,
          ),
          saved,
        ]);
        setFiles((previous) => previous.filter((item) => item !== file));
      }
      invalidate(`refunds/${refund.id}/evidence`);
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : t("failed"));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  async function openEvidence(file: RefundEvidence) {
    try {
      const signed = await getRefundEvidenceUrl(
        current?.id ?? "",
        file.objectKey,
      );
      window.open(signed.url, "_blank", "noopener,noreferrer");
    } catch {
      setProblem(t("evidenceFailed"));
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className={cn(
        PAGE,
        "grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:py-10 lg:pb-22",
      )}
    >
      <div className="order-2 flex min-w-0 flex-col gap-6 lg:order-1">
        {current ? (
          <section
            role="status"
            className="rounded-card border border-border bg-card p-4"
          >
            <h2 className="font-semibold">{t(`status.${current.status}`)}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("requestOnly")}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{current.reason}</p>
            <Button
              type="button"
              variant="link"
              onClick={() => {
                setCreated(null);
                cases.reload();
              }}
            >
              {t("checkStatus")}
            </Button>
          </section>
        ) : null}
        {!current ? (
          <>
            <fieldset disabled={busy || !canSubmit}>
              <legend className="mb-2 text-sm font-semibold">
                {t("reason")}
              </legend>
              <RadioGroup
                value={reason}
                onValueChange={(value) => {
                  const chosen = REASONS.find((item) => item === value);
                  if (chosen) setReason(chosen);
                }}
                className="gap-2"
              >
                {REASONS.map((item) => (
                  <label
                    key={item}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-3 rounded-card border bg-card px-3 py-2 text-sm",
                      reason === item ? "border-primary" : "border-border",
                    )}
                  >
                    <RadioGroupItem
                      value={item}
                      className="size-4.5 [&_[data-slot=radio-group-indicator]]:invisible"
                    />
                    {t(item)}
                  </label>
                ))}
              </RadioGroup>
            </fieldset>
            <div>
              <label
                htmlFor="refund-details"
                className="mb-2 block text-sm font-semibold"
              >
                {t("details")}
              </label>
              <Textarea
                id="refund-details"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={3800}
                disabled={busy || !canSubmit}
                placeholder={t("detailsHint")}
                className="min-h-21 bg-card text-sm"
              />
            </div>
          </>
        ) : null}
        <section>
          <h2 className="mb-2 text-sm font-semibold">{t("evidence")}</h2>
          {!current || current.status === "OPEN" ? (
            <label className="relative flex min-h-13 items-center justify-center gap-2 rounded-card border border-dashed border-input bg-muted px-3 text-sm text-muted-foreground">
              <Plus aria-hidden className="size-4 text-primary" />
              {t("attach")}
              <Input
                type="file"
                aria-label={t("evidence")}
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                disabled={busy || !canSubmit}
                onChange={(event) => {
                  chooseFiles(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">{t("fileHint")}</p>
          {files.map((file) => (
            <p
              key={`${file.name}-${file.lastModified}`}
              className="mt-2 break-all text-sm"
            >
              {file.name}
            </p>
          ))}
          {shownEvidence.map((file) => (
            <Button
              key={file.objectKey}
              type="button"
              variant="link"
              className="block max-w-full truncate p-0"
              onClick={() => void openEvidence(file)}
            >
              {file.originalFileName}
            </Button>
          ))}
          {evidence.error ? (
            <Button type="button" variant="link" onClick={evidence.reload}>
              {t("retry")}
            </Button>
          ) : null}
        </section>
        {problem ? (
          <p role="alert" className="text-sm text-destructive">
            {problem}
          </p>
        ) : null}
        {cases.error ? (
          <div role="alert">
            <p>{t("statusFailed")}</p>
            <Button type="button" variant="link" onClick={cases.reload}>
              {t("retry")}
            </Button>
          </div>
        ) : null}
        {!eligible ? (
          <p role="status" className="text-sm text-muted-foreground">
            {invoice.status === "refunded" ? t("moneyRefunded") : t("notPaid")}
          </p>
        ) : null}
      </div>
      <aside className="contents lg:order-2 lg:flex lg:min-w-0 lg:flex-col lg:gap-3">
        <section className="order-1 rounded-card border border-border bg-card lg:order-none">
          <div className="flex items-center gap-3 p-3">
            <AdvisorFace
              advisor={advisor.data}
              className="size-10 lg:size-10"
            />
            <div className="min-w-0">
              <p className="font-medium">{invoice.advisor.displayName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {invoice.service.name} ·{" "}
                {format.dateTime(new Date(booking.startTime), {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>
          <div className="flex justify-between gap-3 border-t border-border p-3 text-sm">
            <span className="text-muted-foreground">{t("paidAmount")}</span>
            <span className="font-latin font-semibold">
              {format.number(invoice.amountSatang / 100, {
                style: "currency",
                currency: "THB",
              })}
            </span>
          </div>
        </section>
        <Button
          type="submit"
          disabled={
            busy || !canSubmit || Boolean(current && files.length === 0)
          }
          className="order-3 w-full lg:order-none"
        >
          {busy ? t("submitting") : current ? t("uploadEvidence") : t("submit")}
        </Button>
        <Link
          className={cn(
            buttonVariants({ variant: "outline" }),
            "order-4 lg:order-none",
          )}
          href={`/bookings/detail?bookingId=${booking.id}`}
        >
          {current ? t("back") : t("keep")}
        </Link>
      </aside>
    </form>
  );
}

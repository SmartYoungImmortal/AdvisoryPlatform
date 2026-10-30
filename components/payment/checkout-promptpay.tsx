"use client";

import { Loader2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { createBookingInvoice, getPromptPayStatus, payByPromptPay } from "@/lib/api/resources";
import { baht } from "@/components/bookings/booking-flow";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

import { POPUP_OVERLAY } from "./checkout-parts";

/**
 * Paying by PromptPay: a QR code the payer scans with their banking app.
 *
 * Paying makes (or finds) the booking's invoice, less the coupon if one is
 * added, and asks the API for a code on it (`POST /payment/promptpay`), which
 * lasts 15 minutes. While the code is on screen the page asks every 3 seconds
 * whether it was paid; the API records the first outcome it sees and books the
 * booking, as a card's 3-D Secure return does, and a paid code sends the
 * browser to `/checkout/success`. A code that runs out says so, and paying
 * again makes a new one on a new invoice (the expired one is failed).
 */

/** How often the page asks whether the code was paid. */
const POLL_MS = 3_000;

type Code = {
  readonly invoiceId: string;
  readonly qrImageUrl: string;
  readonly amountSatang: number;
  readonly expiresAt: string;
};

export function usePromptPay(bookingId: string, couponCode: string | undefined) {
  const t = useTranslations("payment");
  const [code, setCode] = useState<Code | null>(null);
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [expired, setExpired] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const start = useCallback(() => {
    setStarting(true);
    setProblem(null);
    void (async () => {
      try {
        const invoice = await createBookingInvoice(bookingId, couponCode);
        const made = await payByPromptPay(invoice.id);
        setCode({ invoiceId: invoice.id, ...made });
        setExpired(false);
        setOpen(true);
      } catch (cause: unknown) {
        setProblem(t("payFailed", { reason: cause instanceof Error ? cause.message : String(cause) }));
      } finally {
        setStarting(false);
      }
    })();
  }, [bookingId, couponCode, t]);

  // Asks whether the code was paid while it is on screen and still good. A
  // missed answer is only a missed tick: the next one asks again.
  useEffect(() => {
    if (!open || !code || expired) return;
    let stopped = false;
    let timer = 0;
    const ask = async () => {
      try {
        const status = await getPromptPayStatus(code.invoiceId);
        if (stopped) return;
        if (status.status === "success" && status.url) {
          window.location.assign(status.url);
          return;
        }
        if (status.status === "failed") {
          setExpired(true);
          return;
        }
      } catch {
        // Asked again on the next tick.
      }
      if (!stopped) timer = window.setTimeout(() => void ask(), POLL_MS);
    };
    timer = window.setTimeout(() => void ask(), POLL_MS);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [code, expired, open]);

  return { start, starting, problem, code, open, setOpen, expired, setExpired };
}

export type PromptPayment = ReturnType<typeof usePromptPay>;

/** The seconds left until `expiresAt`, counted down every second while `running`. */
function useSecondsLeft(expiresAt: string | undefined, running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, [running]);
  if (!expiresAt) return 0;
  return Math.max(0, Math.round((Date.parse(expiresAt) - now) / 1_000));
}

/**
 * The code on screen, in a popup: its title at the top with the way out at the
 * right, no rule under it; then the code itself, PromptPay's
 * own card as the provider draws it, the amount under it, and how long it has
 * left. While it waits, a line says so; once it has run out, the code goes and
 * a button makes a new one.
 */
export function PromptPayDialog({ promptPay }: { readonly promptPay: PromptPayment }) {
  const t = useTranslations("payment");
  const c = useTranslations("common");
  const format = useFormatter();
  const { code, open, setOpen, expired, setExpired } = promptPay;
  const secondsLeft = useSecondsLeft(code?.expiresAt, open && !expired);
  const runOut = expired || (code !== null && secondsLeft === 0);

  // The clock running out is the code running out, whatever the last answer said.
  useEffect(() => {
    if (open && code && secondsLeft === 0 && !expired) setExpired(true);
  }, [code, expired, open, secondsLeft, setExpired]);

  const clock = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="gap-0 rounded-[24px] p-0 sm:max-w-[420px]" overlayClassName={POPUP_OVERLAY} showCloseButton={false}>
        <div className="relative flex h-16 items-center justify-center">
          <DialogTitle className="text-base leading-5 font-semibold text-foreground">{t("promptPayTitle")}</DialogTitle>
          <DialogClose
            aria-label={c("close")}
            className="absolute top-1/2 right-2.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-full outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <X aria-hidden className="size-4" strokeWidth={2.5} />
          </DialogClose>
        </div>
        {code ? (
          <div className="flex flex-col items-center px-6 pt-6 pb-8 text-center">
            {runOut ? (
              <>
                <p className="text-lg leading-6 font-semibold text-foreground">{t("promptPayExpired")}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t("promptPayExpiredHint")}</p>
                <Button
                  className="mt-6 h-12 rounded-[12px] bg-foreground px-6 text-base font-semibold text-background hover:bg-foreground/85"
                  disabled={promptPay.starting}
                  onClick={promptPay.start}
                  type="button"
                >
                  {promptPay.starting ? t("payWorking") : t("promptPayRenew")}
                </Button>
              </>
            ) : (
              <>
                <Image
                  alt={t("promptPayQrAlt")}
                  className="h-auto w-60"
                  height={1050}
                  priority
                  src={code.qrImageUrl}
                  unoptimized
                  width={740}
                />
                <p className="mt-4 font-latin text-2xl leading-8 font-semibold text-foreground tabular-nums">
                  {format.number(baht(code.amountSatang), "baht")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("promptPayExpiresIn")} <span className="font-latin tabular-nums">{clock}</span>
                </p>
                <p className="mt-5 flex items-center gap-2 text-sm text-foreground" role="status">
                  <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
                  {t("promptPayWaiting")}
                </p>
                <p className="mt-3 text-xs leading-4 text-muted-foreground">{t("promptPayHint")}</p>
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { createBookingInvoice, getPaymentPublicKey, startCheckout } from "@/lib/api/resources";
import { useResource } from "@/lib/api/use-resource";
import {
  googlePayReady,
  isGooglePayCancel,
  loadGooglePay,
  requestGooglePayToken,
  type PaymentsClient,
} from "@/lib/payment/google-pay";
import { createGooglePayToken } from "@/lib/payment/omise";
import { cn } from "@/lib/utils";

/**
 * Paying by Google Pay: Google's own button and sheet, then the card as any
 * other (`lib/payment/google-pay.ts`).
 *
 * The button opens the sheet for the total as it stands (the coupon taken
 * off); the card chosen there becomes an Omise card token, the invoice is
 * made (or found) and charged to it (`POST /payment/checkout`), and the
 * browser follows the answer, through 3-D Secure if the account asks for it,
 * to `/checkout/success`, as a typed card does. Shutting the sheet is not a
 * failure: the page just stays as it was.
 *
 * Whether it can be offered is the browser's to say (`isReadyToPay`): until it
 * has, the method is listed and not choosable, and where it cannot it says so.
 */

/** The name Google's sheet shows the payer as the one being paid. */
const MERCHANT_NAME = "Advisory";

export function useGooglePay(bookingId: string, couponCode: string | undefined, amountSatang: number | null) {
  const t = useTranslations("payment");
  const key = useResource<{ readonly publicKey: string }>(
    "payment/public-key",
    useCallback((signal: AbortSignal) => getPaymentPublicKey(signal), []),
  );
  const publicKey = key.data?.publicKey ?? "";
  const [client, setClient] = useState<PaymentsClient | null>(null);
  /** null while the browser is still being asked. */
  const [available, setAvailable] = useState<boolean | null>(null);
  const [paying, setPaying] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    void (async () => {
      try {
        const made = await loadGooglePay();
        const ready = await googlePayReady(made);
        if (stopped) return;
        setClient(made);
        setAvailable(ready);
      } catch {
        if (!stopped) setAvailable(false);
      }
    })();
    return () => {
      stopped = true;
    };
  }, []);

  const pay = useCallback(() => {
    if (!client || !publicKey || amountSatang === null || paying) return;
    setProblem(null);
    // Straight from the press, before anything is awaited: Google opens its
    // sheet only on a user's gesture.
    const sheet = requestGooglePayToken(client, { publicKey, amountSatang, merchantName: MERCHANT_NAME });
    setPaying(true);
    void (async () => {
      try {
        const wallet = await sheet;
        const cardToken = await createGooglePayToken(publicKey, wallet);
        const invoice = await createBookingInvoice(bookingId, couponCode);
        const { url } = await startCheckout({ invoiceId: invoice.id, cardToken });
        window.location.assign(url);
      } catch (cause: unknown) {
        if (!isGooglePayCancel(cause)) {
          setProblem(t("payFailed", { reason: cause instanceof Error ? cause.message : String(cause) }));
        }
        setPaying(false);
      }
    })();
  }, [amountSatang, bookingId, client, couponCode, paying, publicKey, t]);

  return { client, available, ready: client !== null && publicKey !== "" && amountSatang !== null, paying, problem, pay };
}

export type GooglePayment = ReturnType<typeof useGooglePay>;

/**
 * Google's own black "Pay with Google Pay" button, the size of the page's pay
 * button: drawn by Google's script (its brand rules ask for theirs), in the
 * page's language, and held off while the payment is under way.
 */
export function GooglePayButton({
  googlePay,
  className,
}: {
  readonly googlePay: GooglePayment;
  readonly className?: string;
}) {
  const t = useTranslations("payment");
  const locale = useLocale();
  const boxRef = useRef<HTMLDivElement>(null);
  const payRef = useRef(googlePay.pay);
  const { client } = googlePay;

  useEffect(() => {
    payRef.current = googlePay.pay;
  }, [googlePay.pay]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || !client) return;
    const button = client.createButton({
      onClick: () => payRef.current(),
      buttonColor: "black",
      buttonType: "pay",
      buttonSizeMode: "fill",
      buttonRadius: 12,
      buttonLocale: locale,
    });
    box.replaceChildren(button);
    return () => box.replaceChildren();
  }, [client, locale]);

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        aria-busy={googlePay.paying}
        className={cn("h-12 w-full", (!googlePay.ready || googlePay.paying) && "pointer-events-none opacity-50")}
        ref={boxRef}
      />
      {googlePay.paying ? <p className="mt-2 text-sm text-muted-foreground">{t("payWorking")}</p> : null}
    </div>
  );
}

"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import Image from "next/image";
import { useCallback, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { createBookingInvoice, payByMobileBanking } from "@/lib/api/resources";
import type { ApiMobileBank } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Paying in a Thai bank's app: the payer picks their bank, the API charges
 * the invoice on that bank's source (`POST /payment/mobile-banking`), and the
 * browser goes to the page that opens the app, the amount already filled in.
 * Once it is confirmed there the bank sends the payer back through the same
 * return as a card's 3-D Secure, which books the booking and lands on
 * `/checkout/success`, `/failed` or `/unconfirmed`.
 *
 * It needs the bank's app on the device in the payer's hand, so it is only
 * offered on phones and tablets. In test mode the page it opens is Omise's
 * own, where the charge is marked paid or failed.
 */

/** The banks Omise takes, in the order Thai banking apps are most used, each with its app. */
export const BANKS: readonly { readonly key: ApiMobileBank; readonly app: string }[] = [
  { key: "kbank", app: "K PLUS" },
  { key: "scb", app: "SCB EASY" },
  { key: "ktb", app: "Krungthai NEXT" },
  { key: "bbl", app: "Bualuang mBanking" },
  { key: "bay", app: "KMA" },
];

/**
 * A bank's own mark, cut from its logo to the symbol alone
 * (`public/icons/banks`, from Wikimedia Commons, Krungthai's from Wikipedia),
 * in a rounded square the way its app's icon sits on a phone.
 */
export function BankMark({ bank, className }: { readonly bank: ApiMobileBank; readonly className?: string }) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-[22%]", className)}>
      <Image alt="" className="object-contain" fill sizes="32px" src={`/icons/banks/${bank}.svg`} unoptimized />
    </span>
  );
}

/** The five marks in a row under the row's name, as the card row shows the cards it takes. */
export function BankMarks() {
  return (
    <span className="flex items-center gap-1 pt-1">
      {BANKS.map((bank) => (
        <BankMark bank={bank.key} className="size-3.5" key={bank.key} />
      ))}
    </span>
  );
}

/** The phone the app is on, as the API passes it to the bank; undefined on anything else. */
function platformOf(): "IOS" | "ANDROID" | undefined {
  const agent = navigator.userAgent;
  if (/Android/i.test(agent)) return "ANDROID";
  // iPadOS asks for desktop pages and names itself a Mac; its touch screen gives it away.
  if (/iPhone|iPad|iPod/i.test(agent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "IOS";
  }
  return undefined;
}

const noSubscription = () => () => {};

/** Whether this is a phone or tablet, where the bank's app can be. False on the server pass. */
export function useOnPhone(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => platformOf() !== undefined,
    () => false,
  );
}

export function useMobileBanking(bookingId: string, couponCode: string | undefined) {
  const t = useTranslations("payment");
  const [bank, setBank] = useState<ApiMobileBank | null>(null);
  const [paying, setPaying] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const pay = useCallback(() => {
    if (!bank) {
      setProblem(t("bankRequired"));
      return;
    }
    setPaying(true);
    setProblem(null);
    void (async () => {
      try {
        const invoice = await createBookingInvoice(bookingId, couponCode);
        const { url } = await payByMobileBanking({ invoiceId: invoice.id, bank, platform: platformOf() });
        window.location.assign(url);
      } catch (cause: unknown) {
        setProblem(t("payFailed", { reason: cause instanceof Error ? cause.message : String(cause) }));
        setPaying(false);
      }
    })();
  }, [bank, bookingId, couponCode, t]);

  return { bank, setBank, paying, problem, pay };
}

export type MobileBanking = ReturnType<typeof useMobileBanking>;

/**
 * The banks under the row, while it is chosen: a row each, the bank's mark,
 * its name and under it its app, with the same radio as the ways to pay above.
 */
export function BankList({ mobileBanking, className }: { readonly mobileBanking: MobileBanking; readonly className?: string }) {
  const t = useTranslations("payment");
  return (
    <RadioGroup
      aria-label={t("bankTitle")}
      className={cn("flex flex-col pb-2", className)}
      onValueChange={(value) => mobileBanking.setBank(value as ApiMobileBank)}
      value={mobileBanking.bank}
    >
      {BANKS.map((bank) => (
        <label className="flex h-14 cursor-pointer items-center gap-3 pl-12" key={bank.key}>
          <BankMark bank={bank.key} className="size-8" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm text-foreground">{t(`bank.${bank.key}`)}</span>
            <span className="text-xs text-muted-foreground">{bank.app}</span>
          </span>
          <Radio.Root
            className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-card ring-1 ring-input transition-shadow duration-300 outline-none ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-checked:ring-2 data-checked:ring-foreground motion-reduce:transition-none"
            value={bank.key}
          >
            <Radio.Indicator className="size-3.5 rounded-full bg-foreground transition-transform duration-300 data-ending-style:scale-0 data-starting-style:scale-0 motion-reduce:transition-none" />
          </Radio.Root>
        </label>
      ))}
    </RadioGroup>
  );
}

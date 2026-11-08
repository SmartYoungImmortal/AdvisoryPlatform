"use client";

import { Clock, CreditCard, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { asUuid, baht, useQueryValue } from "@/components/bookings/booking-flow";
import { invoiceHref } from "@/components/payment/transactions-data";
import { SETTINGS_DIALOG_STACK, SettingsDialog, settingsStackPill } from "@/components/profile/settings-dialog";
import { Button } from "@/components/ui/button";
import { getMyInvoice } from "@/lib/api/resources";
import type { ApiAdviseeInvoice } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

import { isCheckoutOutcome, type CheckoutOutcome } from "./checkout-return";

/** One figure of the outcome: its name at the left, the value at the right. */
export type OutcomeRow = {
  readonly label: string;
  readonly value: string;
  /** A Latin run — a masked card, an amount, a reference — in tabular figures. */
  readonly latin?: boolean;
  readonly tone?: string;
};

/** A way on: a link, or a press that closes the popup. */
export type OutcomeAction = { readonly label: string } & (
  | { readonly href: string; readonly onClick?: never }
  | { readonly onClick: () => void; readonly href?: never }
);

function OutcomeButton({ action, kind }: { readonly action: OutcomeAction; readonly kind: "solid" | "soft" }) {
  const className = settingsStackPill(kind);
  if (action.href !== undefined)
    return (
      <Button className={className} nativeButton={false} render={<Link href={action.href} />}>
        {action.label}
      </Button>
    );
  return (
    <Button className={className} onClick={action.onClick} type="button">
      {action.label}
    </Button>
  );
}

/**
 * What did not go through, as a popup over the page it happened on: a payment
 * over the checkout, a time already taken over the time picker.
 *
 * The settings' centred card (`SettingsDialog` with a mark): the mark in its
 * grey disc, the title and what happened centred under it, the figures as
 * plain lines on the card's white, then the capsules stacked full width, the
 * way on filled in ink and the other in soft grey. No close in the corner:
 * the way out is a capsule, Escape or the scrim.
 *
 * `dismissible: false` leaves only the capsules, for an outcome whose page
 * behind must not be used: a payment the bank has not answered, which paying
 * again would charge twice.
 */
export function OutcomeDialog({
  open,
  icon,
  title,
  body,
  rows = [],
  note,
  primary,
  secondary,
  dismissible = true,
  onClose,
}: {
  readonly open: boolean;
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: string;
  readonly rows?: readonly OutcomeRow[];
  readonly note?: string;
  readonly primary: OutcomeAction;
  readonly secondary?: OutcomeAction;
  readonly dismissible?: boolean;
  readonly onClose?: () => void;
}) {
  const detail = rows.length > 0;

  return (
    <SettingsDialog
      // What to do about it straight under what happened, as one passage.
      description={
        note ? (
          <>
            {body}
            <span className="block">{note}</span>
          </>
        ) : (
          body
        )
      }
      icon={icon}
      onOpenChange={(next) => {
        if (!next && dismissible) onClose?.();
      }}
      open={open}
      title={title}
    >
      {rows.length > 0 ? (
        <dl className="flex w-full flex-col gap-2 text-xs md:text-sm">
          {rows.map((row) => (
            <div className="flex items-baseline justify-between gap-4" key={row.label}>
              <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
              <dd
                className={cn(
                  "min-w-0 text-right font-medium text-foreground",
                  row.latin && "font-latin tabular-nums",
                  row.tone,
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className={cn(SETTINGS_DIALOG_STACK, !detail && "mt-0 md:mt-0")}>
        <OutcomeButton action={primary} kind="solid" />
        {secondary ? <OutcomeButton action={secondary} kind="soft" /> : null}
      </div>
    </SettingsDialog>
  );
}

/**
 * A payment's outcome in words and figures. With an invoice, its receipt
 * (`GET /payment/invoices/:id`) gives the card and the amount; until it has
 * answered there are no figures rather than a sample's for a moment. `sample`
 * is the design state, reached from `/screens` with no invoice at all.
 */
export function usePaymentOutcome(state: CheckoutOutcome, invoiceId: string | undefined, sample = false) {
  const t = useTranslations("payment");
  const format = useFormatter();
  const receipt = useResource<ApiAdviseeInvoice | null>(
    invoiceId ? `payment/invoices/${invoiceId}` : "payment/invoices/none",
    useCallback(
      (signal: AbortSignal) => (invoiceId ? getMyInvoice(invoiceId, signal) : Promise.resolve(null)),
      [invoiceId],
    ),
  );

  const failed = state === "failed";
  const words = failed
    ? { icon: CreditCard, title: t("failedTitle"), body: t("failedBody"), note: t("failedHelp") }
    : { icon: Clock, title: t("unconfirmedTitle"), body: t("unconfirmedBody"), note: undefined };
  const waiting: OutcomeRow = { label: t("statusLabel"), value: t("statusValue"), tone: "text-warning" };

  if (sample)
    return {
      ...words,
      rows: failed
        ? [
            { label: t("cardLabel"), value: t("cardValue"), latin: true },
            { label: t("amountLabel"), value: t("amountValue"), latin: true },
            { label: t("reasonLabel"), value: t("reasonValue"), tone: "text-destructive" },
          ]
        : [
            { label: t("amountLabel"), value: t("unconfirmedAmount"), latin: true },
            { label: t("cardLabel"), value: t("cardValue"), latin: true },
            waiting,
            { label: t("refLabel"), value: t("refValue"), latin: true },
          ],
    };

  const paid = receipt.data;
  if (!paid) return { ...words, rows: [] as readonly OutcomeRow[] };

  const amount: OutcomeRow = { label: t("amountLabel"), value: format.number(baht(paid.amountSatang), "baht"), latin: true };
  const card: readonly OutcomeRow[] = paid.card
    ? [{ label: t("cardLabel"), value: `${paid.card.brand} •••• ${paid.card.lastDigits}`, latin: true }]
    : [];

  if (failed) return { ...words, rows: [...card, amount] };
  return {
    ...words,
    rows: [amount, ...card, waiting, { label: t("refLabel"), value: paid.invoiceNumber, latin: true }],
  };
}

/**
 * The ways on from a payment that did not end paid. A declined one goes back
 * to paying (`retry`); one the bank has not answered goes to its receipt,
 * which follows it to paid or failed, and to the bookings, never back to the
 * button that would charge it again.
 */
export function useOutcomeActions(
  state: CheckoutOutcome,
  invoiceId: string | undefined,
  /** Closes the popup over the checkout, or, on the outcome's own page, where paying again starts. */
  retry: (() => void) | string,
): { readonly primary: OutcomeAction; readonly secondary?: OutcomeAction } {
  const t = useTranslations("payment");
  if (state === "failed")
    return {
      primary: typeof retry === "string" ? { label: t("tryAgain"), href: retry } : { label: t("tryAgain"), onClick: retry },
    };
  return {
    primary: { label: t("viewHistory"), href: invoiceId ? invoiceHref(invoiceId) : "/transactions" },
    secondary: { label: t("viewBooking"), href: "/bookings" },
  };
}

/**
 * `/checkout/card?bookingId=…&outcome=failed|unconfirmed&invoiceId=…`: the
 * outcome the bank sent back, over the checkout it left from
 * (`checkout-return.ts`). Closing a declined one leaves the checkout as it
 * was, to pay again, and takes the outcome out of the address so a reload
 * does not bring it back. One the bank has not answered cannot be closed.
 */
export function CheckoutOutcomePopup({ bookingId }: { readonly bookingId: string }) {
  const router = useRouter();
  const raw = useQueryValue("outcome");
  const outcome = isCheckoutOutcome(raw) ? raw : null;
  const invoiceId = asUuid(useQueryValue("invoiceId"));
  const [closed, setClosed] = useState(false);
  const copy = usePaymentOutcome(outcome ?? "failed", outcome ? invoiceId : undefined);

  const close = () => {
    setClosed(true);
    router.replace(`/checkout/card?bookingId=${encodeURIComponent(bookingId)}`, { scroll: false });
  };
  const actions = useOutcomeActions(outcome ?? "failed", invoiceId, close);

  if (!outcome) return null;
  return (
    <OutcomeDialog
      {...copy}
      {...actions}
      dismissible={outcome === "failed"}
      onClose={close}
      open={!closed}
    />
  );
}

"use client";

import { CalendarCheck, Gift, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState, type ReactNode } from "react";

import { liveServiceHref } from "@/components/bookings/booking-flow";
import { chatHref } from "@/components/chat/chat-data";
import { getServiceTrial, requestTrial, trialKeys, type ApiServiceTrial } from "@/components/trials/trial-data";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import type { ApiPublicService } from "@/lib/api/types";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/** The row's one capsule: small, round, beside the words. */
const ACTION = "h-9 shrink-0 rounded-full px-4 text-xs font-medium lg:h-10 lg:text-frame-label";

/**
 * The service's free trial, at the top of the panel of times, for the one
 * looking at it: what it is and the way to ask, then where their ask stands
 * and the way on from there (the chat it opened, the trial's own times in
 * this panel once it is granted, the booking it became). Asking opens the chat room with the advisor, where the
 * request waits as a card; the page goes there.
 *
 * Signed out, asking goes to sign in and back to this service. A service with
 * no trial shows nothing, and so does a read that fails: the paid times under
 * it are still there.
 */
export function TrialOffer({
  service,
  trialMode,
  onTrial,
  className,
}: {
  readonly service: ApiPublicService;
  /** The panel shows the trial's times now (`Picker.trial`). */
  readonly trialMode: boolean;
  /** Turns the panel to the trial's times, or back to the paid ones. */
  readonly onTrial: (on: boolean) => void;
  readonly className?: string;
}) {
  const t = useTranslations("trial");
  const s = useTranslations("service");
  const session = useSession();
  const signedIn = session.status === "authenticated";
  const minutes = service.trialEnabled ? service.trialDurationMinutes : null;
  const trial = useResource<ApiServiceTrial | null>(
    signedIn && minutes ? trialKeys.service(service.id) : "trials/service:off",
    useCallback(
      (signal: AbortSignal) => (signedIn && minutes ? getServiceTrial(service.id, signal) : Promise.resolve(null)),
      [signedIn, minutes, service.id],
    ),
  );
  const { asking, failure, ask } = useAskTrial(service.id, liveServiceHref(service.id), trial.reload);

  if (!minutes || session.status === "loading" || trial.loading || trial.error) return null;

  const request = trial.data?.request ?? null;
  const openChat = request ? (
    <RowLink href={chatHref(request.chatRoomId)} icon={MessageCircle}>
      {t("openChat")}
    </RowLink>
  ) : null;

  let line: ReactNode;
  let action: ReactNode;
  if (!request) {
    line = (
      <>
        <span className="block font-medium text-foreground">{s("trialFree", { minutes })}</span>
        <span className="block text-muted-foreground">{t("offerBody")}</span>
      </>
    );
    action = (
      <Button
        aria-busy={asking || undefined}
        className={ACTION}
        disabled={asking}
        onClick={() => void ask()}
        type="button"
      >
        {asking ? t("requesting") : t("request")}
      </Button>
    );
  } else if (request.status === "PENDING") {
    line = t("requested");
    action = openChat;
  } else if (request.status === "GRANTED" && request.trialBookingId) {
    line = t("rowBooked");
    action = (
      <RowLink href={`/bookings/detail?bookingId=${request.trialBookingId}`} icon={CalendarCheck}>
        {t("viewBooking")}
      </RowLink>
    );
  } else if (request.status === "GRANTED" && trialMode) {
    line = t("rowPicking", { minutes });
    action = (
      <Button className={ACTION} onClick={() => onTrial(false)} type="button" variant="outline">
        {t("paidTimes")}
      </Button>
    );
  } else if (request.status === "GRANTED") {
    line = t("rowGranted");
    action = (
      <Button className={ACTION} onClick={() => onTrial(true)} type="button">
        <CalendarCheck aria-hidden />
        {t("pickTime")}
      </Button>
    );
  } else {
    line = t("rowDeclined");
    action = openChat;
  }

  return (
    <div className={cn("flex flex-col gap-2", className)} data-slot="trial-offer">
      <div className="flex items-center gap-3 rounded-2xl bg-primary/5 p-3 lg:p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Gift aria-hidden className="size-4.5" />
        </span>
        <p className="min-w-0 flex-1 text-xs leading-5 text-pretty text-foreground lg:text-frame-label">{line}</p>
        {action}
      </div>
      {failure ? (
        <p className="text-xs text-destructive lg:text-frame-label" role="alert">
          {failure}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Asking for a service's free trial: `POST …/trial-requests`, then the chat
 * room it opened, where the request waits as a card. Signed out (or a session
 * that ran out), sign in first and come back to `returnTo`. Asked already
 * (409, perhaps from another tab): `onStale` reads where it stands.
 */
export function useAskTrial(serviceId: string, returnTo: string, onStale: () => void) {
  const t = useTranslations("trial");
  const router = useRouter();
  const session = useSession();
  const [asking, setAsking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const signIn = () => router.push(`/login?next=${encodeURIComponent(returnTo)}`);

  const ask = async () => {
    if (session.status !== "authenticated") {
      signIn();
      return;
    }
    setAsking(true);
    setFailure(null);
    try {
      const request = await requestTrial(serviceId);
      // The room is new to the inbox, and this service's trial has changed.
      invalidate("chat/inbox");
      invalidate(trialKeys.service(serviceId));
      router.push(chatHref(request.chatRoomId));
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) signIn();
      else if (cause instanceof ApiError && cause.status === 409) onStale();
      else setFailure(t("requestFailed"));
    } finally {
      setAsking(false);
    }
  };
  return { asking, failure, ask };
}

function RowLink({
  href,
  icon: Icon,
  children,
}: {
  readonly href: string;
  readonly icon: typeof Gift;
  readonly children: ReactNode;
}) {
  return (
    <Button className={ACTION} nativeButton={false} render={<Link href={href} />} variant="outline">
      <Icon aria-hidden />
      {children}
    </Button>
  );
}

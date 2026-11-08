"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useFormatter, useTimeZone, useTranslations } from "next-intl";

import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { ApiError } from "@/lib/api/client";
import { useMountTime } from "@/components/bookings/booking-flow";
import { bookingDay } from "@/lib/work/booking-calendar";
import { useRouter } from "next/navigation";
import {
  listBookingRescheduleSlots,
  rescheduleBooking,
} from "@/lib/api/resources";
import type { ApiBooking, ApiSlot } from "@/lib/api/types";
import { invalidate, useResource } from "@/lib/api/use-resource";

/** The reader's sentence for a move that failed: a taken slot said so, else the API's own. */
function rescheduleFailure(cause: unknown, conflict: string): string {
  if (cause instanceof ApiError && cause.status === 409) return conflict;
  return cause instanceof Error ? cause.message : String(cause);
}

/** The slot picker on its own, for a row that lays out its own toggle (the bookings list). */
export function RescheduleSlots({
  booking,
  onRescheduled,
}: {
  readonly booking: ApiBooking;
  readonly onRescheduled: () => void;
}) {
  const t = useTranslations("bookings");
  const sc = useTranslations("screening");
  const format = useFormatter();
  const timeZone = useTimeZone() ?? "UTC";
  const now = useMountTime();
  const router = useRouter();
  const pending = useRef(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const range = useMemo(() => {
    const from = bookingDay(now, timeZone);
    const end = new Date(`${from}T12:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 60);
    return { from, to: end.toISOString().slice(0, 10) };
  }, [now, timeZone]);
  const fetchSlots = useCallback(
    (signal: AbortSignal) =>
      listBookingRescheduleSlots(booking.id, range, signal),
    [booking.id, range],
  );
  const slots = useResource<readonly ApiSlot[]>(
    `bookings/${booking.id}/reschedule-slots?from=${range.from}&to=${range.to}`,
    fetchSlots,
  );

  const available = (slots.data ?? []).filter(
    (slot) => slot.startTime !== booking.startTime,
  );
  // The API refuses the slots until the service's screening is answered.
  const needsScreening =
    slots.error instanceof ApiError && slots.error.status === 400;

  const submit = async () => {
    if (!selected || pending.current) return;
    pending.current = true;
    setSaving(true);
    setFailure(null);
    try {
      const replacement = await rescheduleBooking(booking.id, selected);
      invalidate("bookings/");
      invalidate(`services/${booking.serviceId}/slots`);
      onRescheduled();
      router.push(
        `/bookings/detail?bookingId=${encodeURIComponent(replacement.id)}`,
      );
    } catch (cause: unknown) {
      setFailure(rescheduleFailure(cause, t("rescheduleConflict")));
      if (
        cause instanceof ApiError &&
        (cause.status === 400 || cause.status === 409)
      ) {
        setSelected(null);
        slots.reload();
      }
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-3 rounded-card border border-border bg-muted/40 p-3">
      <p className="text-sm font-medium text-foreground">
        {t("rescheduleChooseSlot")}
      </p>
      {slots.loading ? (
        <p className="text-sm text-muted-foreground">
          {t("rescheduleLoading")}
        </p>
      ) : slots.error ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-destructive">
            {needsScreening
              ? t("rescheduleScreeningRequired")
              : slots.error.message}
          </p>
          {needsScreening ? (
            <NeutralButton
              className="w-auto"
              href={`/screening/questions?serviceId=${booking.serviceId}`}
              size="sm"
            >
              {sc("answerTitle")}
            </NeutralButton>
          ) : (
            <NeutralButton onClick={slots.reload} size="sm">
              {t("rescheduleRetry")}
            </NeutralButton>
          )}
        </div>
      ) : available.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("rescheduleNoSlots")}
        </p>
      ) : (
        <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto">
          {available.map((slot) => (
            <button
              aria-pressed={selected === slot.startTime}
              className={`rounded-lg border px-3 py-2 text-sm font-latin tabular-nums focus-visible:outline-2 focus-visible:outline-ring ${selected === slot.startTime ? "border-primary bg-accent-surface text-primary" : "border-border bg-card text-foreground"}`}
              key={slot.startTime}
              onClick={() => {
                setSelected(slot.startTime);
                setFailure(null);
              }}
              type="button"
            >
              {format.dateTime(new Date(slot.startTime), {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </button>
          ))}
        </div>
      )}
      {failure ? (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      ) : null}
      <PrimaryButton
        className="w-auto self-start"
        disabled={!selected || saving}
        onClick={submit}
        size="sm"
      >
        {saving ? t("rescheduleSaving") : t("rescheduleConfirm")}
      </PrimaryButton>
    </div>
  );
}

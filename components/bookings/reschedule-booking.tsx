"use client";

import { CalendarClock } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { ApiError } from "@/lib/api/client";
import { isoDay, addDays } from "@/components/bookings/booking-flow";
import { listServiceSlots, rescheduleBooking } from "@/lib/api/resources";
import type { ApiBooking, ApiSlot } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";

/** Lets the advisee replace a held appointment with a live available slot. */
export function RescheduleBooking({
  booking,
  onRescheduled,
}: {
  readonly booking: ApiBooking;
  readonly onRescheduled: () => void;
}) {
  const t = useTranslations("bookings");
  const [open, setOpen] = useState(false);

  return (
    <div className="flex w-full flex-col gap-2">
      <NeutralButton
        className="w-auto self-start"
        onClick={() => setOpen((value) => !value)}
        size="sm"
      >
        <CalendarClock aria-hidden />
        {open ? t("rescheduleClose") : t("reschedule")}
      </NeutralButton>
      {open ? (
        <RescheduleSlots booking={booking} onRescheduled={onRescheduled} />
      ) : null}
    </div>
  );
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
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const range = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { from: isoDay(today), to: isoDay(addDays(today, 60)) };
  }, []);
  const fetchSlots = useCallback(
    (signal: AbortSignal) => listServiceSlots(booking.serviceId, range, signal),
    [booking.serviceId, range],
  );
  const slots = useResource<readonly ApiSlot[]>(
    `services/${booking.serviceId}/slots?from=${range.from}&to=${range.to}`,
    fetchSlots,
  );

  const available = (slots.data ?? []).filter(
    (slot) => slot.startTime !== booking.startTime,
  );

  const submit = () => {
    if (!selected || saving) return;
    setSaving(true);
    setFailure(null);
    void rescheduleBooking(booking.id, selected)
      .then(() => onRescheduled())
      .catch((cause: unknown) => {
        setFailure(
          cause instanceof ApiError && cause.status === 409
            ? t("rescheduleConflict")
            : cause instanceof Error
              ? cause.message
              : String(cause),
        );
      })
      .finally(() => setSaving(false));
  };

  return (
        <div className="flex w-full flex-col gap-3 rounded-card border border-border bg-muted/40 p-3">
          <p className="text-sm font-medium text-foreground">
            {t("rescheduleChooseSlot")}
          </p>
          {slots.loading ? (
            <p className="text-sm text-muted-foreground">{t("rescheduleLoading")}</p>
          ) : slots.error ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-destructive">
                {slots.error instanceof ApiError && slots.error.status === 400
                  ? t("rescheduleScreeningRequired")
                  : slots.error.message}
              </p>
              {slots.error instanceof ApiError && slots.error.status === 400 ? (
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
            <p className="text-sm text-muted-foreground">{t("rescheduleNoSlots")}</p>
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
          {failure ? <p role="alert" className="text-sm text-destructive">{failure}</p> : null}
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

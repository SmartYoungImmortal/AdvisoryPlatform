"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMountTime } from "@/components/bookings/booking-flow";
import { Button } from "@/components/ui/button";
import { listServiceSlots } from "@/lib/api/resources";
import { useResource } from "@/lib/api/use-resource";
import type { ServiceDetail } from "@/lib/advisor-services/detail";
import { bookingDay } from "@/lib/work/booking-calendar";

export function ServiceOpenSlots({ data }: { readonly data: ServiceDetail }) {
  const t = useTranslations("advisorServices");
  if (!data.service.isPublished)
    return (
      <p className="text-sm text-muted-foreground">{t("hiddenSchedule")}</p>
    );
  return <PublishedSlots data={data} />;
}

function PublishedSlots({ data }: { readonly data: ServiceDetail }) {
  const t = useTranslations("advisorServices");
  const locale = useLocale();
  const now = useMountTime();
  const from = bookingDay(now, data.owner.timezone);
  const end = new Date(`${from}T12:00:00Z`);
  end.setUTCDate(
    end.getUTCDate() + Math.min(89, data.global.bookingHorizonDays),
  );
  const to = end.toISOString().slice(0, 10);
  const slots = useResource(
    `services/${data.service.id}/slots/${from}/${to}`,
    (signal) => listServiceSlots(data.service.id, { from, to }, signal),
  );
  const format = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: data.owner.timezone,
  });
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        {t("timezone", { zone: data.owner.timezone })}
      </p>
      {slots.loading ? <p role="status">{t("loading")}</p> : null}
      {slots.error ? (
        <div role="alert">
          <p>{slots.error.message}</p>
          <Button variant="outline" onClick={slots.reload}>
            {t("retry")}
          </Button>
        </div>
      ) : null}
      {slots.data?.length === 0 ? <p>{t("noSlots")}</p> : null}
      {slots.data?.slice(0, 5).map((slot) => (
        <p className="text-sm tabular-nums" key={slot.startTime}>
          {format.format(new Date(slot.startTime))}
        </p>
      ))}
    </div>
  );
}
